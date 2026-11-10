import { existsSync } from 'node:fs';
import {
    mkdir,
    mkdtemp,
    readFile,
    rm,
    stat,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sourceManifest from '../../packages/module/static/module.json' with { type: 'json' };
import releaseConfig from '../../release.config.ts';
import { createArchive } from './archive.ts';
import { createManifest, verifyManifest } from './manifest.ts';
import { npm, run } from './process.ts';
import {
    createReleasePushPlan,
    pushRelease,
    requireReleaseBranch,
} from './git.ts';
import { type ReleasePushPlan } from './types.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'dist/module');
let temporary = '';
let archive = '';
let hasCreatedArchive = false;
let hasAttemptedVersion = false;
let hasCommitted = false;
let hasAttemptedBuild = false;
let tag = '';
let hasCreatedTag = false;
let pushPlan: ReleasePushPlan | null = null;

try {
    const increment = process.argv[2];
    if (
        (increment !== 'patch' &&
            increment !== 'minor' &&
            increment !== 'major') ||
        process.argv.length !== 3
    ) {
        throw new Error('Usage: npm run release:<patch|minor|major>');
    }
    const gitRoot = run('git', ['rev-parse', '--show-toplevel'], root, true);
    if (resolve(gitRoot).toLowerCase() !== resolve(root).toLowerCase()) {
        throw new Error(
            'Initialize a Git repository at the template root before releasing.',
        );
    }
    const requireClean = () => {
        if (
            run(
                'git',
                ['status', '--porcelain', '--untracked-files=all'],
                root,
                true,
            )
        ) {
            throw new Error('Commit or stash all changes before releasing.');
        }
    };
    requireClean();
    pushPlan = createReleasePushPlan(root, releaseConfig);
    const head = run('git', ['rev-parse', 'HEAD'], root, true);
    const metadata: unknown = JSON.parse(
        await readFile(resolve(root, 'package.json'), 'utf8'),
    );
    if (
        !metadata ||
        typeof metadata !== 'object' ||
        !('version' in metadata) ||
        typeof metadata.version !== 'string'
    ) {
        throw new Error('Root package.json must have a version.');
    }
    createManifest(metadata.version);
    // Ask npm to calculate semver in isolation; preflight never edits project metadata.
    temporary = await mkdtemp(join(tmpdir(), 'foundry-release-'));
    await writeFile(
        join(temporary, 'package.json'),
        JSON.stringify({
            name: 'release-preflight',
            version: metadata.version,
            private: true,
        }),
    );
    const version = npm(
        [
            'version',
            increment,
            '--no-git-tag-version',
            '--ignore-scripts',
            '--workspaces=false',
        ],
        temporary,
        true,
    ).replace(/^v/, '');
    createManifest(version);
    tag = `v${version}`;
    archive = resolve(root, 'releases', `${sourceManifest.id}-${version}.zip`);
    if (run('git', ['tag', '--list', tag], root, true))
        throw new Error(`Tag already exists: ${tag}`);
    if (existsSync(archive))
        throw new Error(`Archive already exists: ${archive}`);

    npm(['run', 'check'], root);
    hasAttemptedBuild = true;
    npm(['run', 'build'], root);
    requireClean();
    requireReleaseBranch(root, pushPlan?.branch ?? null);
    if (run('git', ['rev-parse', 'HEAD'], root, true) !== head)
        throw new Error('Git HEAD changed during validation.');

    hasAttemptedVersion = true;
    npm(
        [
            'version',
            increment,
            '--no-git-tag-version',
            '--ignore-scripts',
            '--workspaces=false',
        ],
        root,
    );
    const updated: unknown = JSON.parse(
        await readFile(resolve(root, 'package.json'), 'utf8'),
    );
    if (
        !updated ||
        typeof updated !== 'object' ||
        !('version' in updated) ||
        updated.version !== version
    ) {
        throw new Error('npm produced an unexpected version.');
    }
    npm(['run', 'build'], root);
    await verifyManifest(output, version);
    await mkdir(resolve(root, 'releases'), { recursive: true });
    await createArchive(output, archive);
    hasCreatedArchive = true;
    if ((await stat(archive)).size === 0)
        throw new Error('Release archive is empty.');

    run('git', ['add', '--', 'package.json', 'package-lock.json'], root);
    run('git', ['commit', '-m', `chore(release): ${tag}`], root);
    hasCommitted = true;
    run('git', ['tag', '-a', tag, '-m', `Release ${tag}`], root);
    hasCreatedTag = true;
    pushRelease(root, pushPlan, tag);
    console.log(
        `Created ${archive}\nCreated commit and tag ${tag}.\n${pushPlan ? `Pushed ${pushPlan.branch}${pushPlan.shouldPushTag ? ` and ${tag}` : ' (tag remains local)'} to ${pushPlan.remote}.` : 'Local-only release: nothing was pushed.'}`,
    );
} catch (error) {
    console.error(error instanceof Error ? error.message : error);
    if (!hasCommitted) {
        if (hasCreatedArchive) await rm(archive, { force: true });
        if (hasAttemptedBuild)
            await rm(output, { recursive: true, force: true });
        if (hasAttemptedVersion)
            console.error(
                'Version metadata may have changed. Review git diff and git diff --cached. To abandon this release after reviewing changes: git restore --staged -- package.json package-lock.json, then git restore -- package.json package-lock.json. Rebuild with npm run build.',
            );
    } else if (!hasCreatedTag) {
        console.error(
            `Release commit and ZIP remain valid. Resolve the tag error, then run: git tag -a ${tag} -m "Release ${tag}". Do not rerun the version increment.`,
        );
    } else {
        console.error(
            `Release commit, tag ${tag}, and ZIP remain valid. Fix the push error and retry the intended push without incrementing the version again.`,
        );
        if (pushPlan) {
            console.error(
                `Retry pushing branch ${pushPlan.branch}${pushPlan.shouldPushTag ? ` and tag ${tag} atomically` : ' without tags'} to remote ${pushPlan.remote}, with follow-tags disabled.`,
            );
        }
    }
    process.exitCode = 1;
} finally {
    if (temporary) await rm(temporary, { recursive: true, force: true });
}
