import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    createReleasePushPlan,
    pushRelease,
    requireReleaseBranch,
} from '../git.ts';
import { run } from '../process.ts';

describe('release branch and push policy with local bare remotes', () => {
    let root: string;
    let repository: string;
    let remote: string;

    beforeEach(async () => {
        root = await mkdtemp(join(tmpdir(), 'foundry-release-git-'));
        // Ignore developer-wide remotes, hooks, and signing settings in these isolated fixtures.
        vi.stubEnv('GIT_CONFIG_NOSYSTEM', '1');
        vi.stubEnv('GIT_CONFIG_GLOBAL', join(root, 'unused-global-config'));
        repository = join(root, 'work');
        remote = join(root, 'remote.git');
        await mkdir(repository);
        run('git', ['init', '--bare', remote], root, true);
        run('git', ['init', '--initial-branch=main'], repository, true);
        run('git', ['config', 'user.name', 'Release Tests'], repository, true);
        run(
            'git',
            ['config', 'user.email', 'release-tests@example.invalid'],
            repository,
            true,
        );
        run(
            'git',
            [
                '-c',
                'commit.gpgSign=false',
                'commit',
                '--allow-empty',
                '-m',
                'Initial',
            ],
            repository,
            true,
        );
        run('git', ['remote', 'add', 'upstream', remote], repository, true);
        run(
            'git',
            ['-c', 'tag.gpgSign=false', 'tag', '-a', 'v1.2.3', '-m', 'Release'],
            repository,
            true,
        );
    });

    afterEach(async () => {
        vi.unstubAllEnvs();
        // Verify the generated absolute target before recursively removing the isolated fixture.
        if (
            dirname(resolve(root)) !== resolve(tmpdir()) ||
            !root.startsWith(join(tmpdir(), 'foundry-release-git-'))
        )
            throw new Error('Refusing to remove an unexpected fixture path.');
        await rm(root, { recursive: true, force: true });
    });

    it('defaults to main and pushes only the branch and release tag to a sole remote', () => {
        const plan = createReleasePushPlan(repository, {});
        expect(plan).toEqual({
            branch: 'main',
            remote: 'upstream',
            shouldPushTag: true,
        });
        run('git', ['config', 'push.followTags', 'true'], repository, true);
        run(
            'git',
            [
                '-c',
                'tag.gpgSign=false',
                'tag',
                '-a',
                'unrelated',
                '-m',
                'Unrelated',
            ],
            repository,
            true,
        );
        pushRelease(repository, plan, 'v1.2.3');
        expect(run('git', ['rev-parse', 'refs/heads/main'], remote, true)).toBe(
            run('git', ['rev-parse', 'HEAD'], repository, true),
        );
        expect(run('git', ['tag', '--list'], remote, true)).toBe('v1.2.3');
    });

    it('rejects the wrong branch and allows a configured release branch', () => {
        expect(() =>
            createReleasePushPlan(repository, { branch: 'release' }),
        ).toThrow('Release requires branch release');
        run('git', ['branch', '-m', 'release'], repository, true);
        expect(() => createReleasePushPlan(repository, {})).toThrow(
            'Release requires branch main',
        );
        const plan = createReleasePushPlan(repository, { branch: 'release' });
        pushRelease(repository, plan, 'v1.2.3');
        expect(run('git', ['branch', '--list'], remote, true)).toContain(
            'release',
        );
    });

    it('allows and pushes the actual current branch for *', () => {
        run('git', ['branch', '-m', 'feature/example'], repository, true);
        const plan = createReleasePushPlan(repository, { branch: '*' });
        pushRelease(repository, plan, 'v1.2.3');
        expect(run('git', ['branch', '--list'], remote, true)).toContain(
            'feature/example',
        );
        expect(run('git', ['tag', '--list'], remote, true)).toBe('v1.2.3');
    });

    it('makes null entirely local even with detached HEAD, no remote, and shouldPushTag true', () => {
        run('git', ['checkout', '--detach'], repository, true);
        run('git', ['remote', 'remove', 'upstream'], repository, true);
        const plan = createReleasePushPlan(repository, {
            branch: null,
            shouldPushTag: true,
        });
        expect(plan).toBeNull();
        pushRelease(repository, plan, 'v1.2.3');
        expect(run('git', ['tag', '--list'], remote, true)).toBe('');
        expect(run('git', ['branch', '--list'], remote, true)).toBe('');
    });

    it('never pushes tags when shouldPushTag is false, even if Git followTags is enabled', () => {
        run('git', ['config', 'push.followTags', 'true'], repository, true);
        const plan = createReleasePushPlan(repository, {
            shouldPushTag: false,
        });
        pushRelease(repository, plan, 'v1.2.3');
        expect(run('git', ['branch', '--list'], remote, true)).toContain(
            'main',
        );
        expect(run('git', ['tag', '--list'], remote, true)).toBe('');
    });

    it.each(['main', '*'])('rejects detached HEAD for %s', (branch) => {
        run('git', ['checkout', '--detach'], repository, true);
        expect(() => createReleasePushPlan(repository, { branch })).toThrow(
            'HEAD is detached',
        );
    });

    it('refuses to push after the branch changes', () => {
        const plan = createReleasePushPlan(repository, {});
        run('git', ['branch', '-m', 'another'], repository, true);
        expect(() => pushRelease(repository, plan, 'v1.2.3')).toThrow(
            'Release requires branch main',
        );
        expect(run('git', ['tag', '--list'], remote, true)).toBe('');
    });

    it('uses Git push-remote precedence instead of assuming origin', () => {
        run(
            'git',
            ['remote', 'add', 'origin', join(root, 'unused.git')],
            repository,
            true,
        );
        run(
            'git',
            ['config', 'branch.main.remote', 'origin'],
            repository,
            true,
        );
        expect(createReleasePushPlan(repository, {})?.remote).toBe('origin');
        run(
            'git',
            ['config', 'remote.pushDefault', 'upstream'],
            repository,
            true,
        );
        expect(createReleasePushPlan(repository, {})?.remote).toBe('upstream');
        run(
            'git',
            ['config', 'branch.main.pushRemote', 'origin'],
            repository,
            true,
        );
        expect(createReleasePushPlan(repository, {})?.remote).toBe('origin');
    });

    it('fails before versioning if there is no usable remote or the selection is ambiguous', () => {
        run('git', ['remote', 'remove', 'upstream'], repository, true);
        expect(() => createReleasePushPlan(repository, {})).toThrow(
            'Configure a named Git push remote',
        );
        run('git', ['remote', 'add', 'one', remote], repository, true);
        run('git', ['remote', 'add', 'two', remote], repository, true);
        expect(() => createReleasePushPlan(repository, {})).toThrow(
            'Configure a named Git push remote',
        );
        run(
            'git',
            ['config', 'branch.main.remote', 'missing'],
            repository,
            true,
        );
        expect(() => createReleasePushPlan(repository, {})).toThrow(
            'Configure a named Git push remote',
        );
    });

    it('does not create the remote branch when the atomic tag push is rejected', () => {
        run(
            'git',
            ['push', '--', 'upstream', 'refs/tags/v1.2.3:refs/tags/v1.2.3'],
            repository,
            true,
        );
        const originalTag = run(
            'git',
            ['rev-parse', 'refs/tags/v1.2.3'],
            remote,
            true,
        );
        run(
            'git',
            [
                '-c',
                'commit.gpgSign=false',
                'commit',
                '--allow-empty',
                '-m',
                'Next',
            ],
            repository,
            true,
        );
        run('git', ['tag', '-d', 'v1.2.3'], repository, true);
        run(
            'git',
            ['-c', 'tag.gpgSign=false', 'tag', '-a', 'v1.2.3', '-m', 'Changed'],
            repository,
            true,
        );
        expect(() =>
            pushRelease(
                repository,
                createReleasePushPlan(repository, {}),
                'v1.2.3',
            ),
        ).toThrow('failed');
        expect(run('git', ['branch', '--list'], remote, true)).toBe('');
        expect(
            run('git', ['rev-parse', 'refs/tags/v1.2.3'], remote, true),
        ).toBe(originalTag);
    });

    it('rejects an empty branch configuration', () => {
        expect(() => requireReleaseBranch(repository, '')).toThrow(
            'Release branch must be',
        );
    });
});
