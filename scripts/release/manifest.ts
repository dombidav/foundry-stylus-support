import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sourceManifest from '../../packages/module/static/module.json' with { type: 'json' };
import { type ReleaseUrls } from './types.js';

export function createManifest(version: string, urls: ReleaseUrls = {}) {
    if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
        throw new Error(
            `Expected a stable semver version, received: ${version}`,
        );
    }
    if (!/^[a-z][a-z0-9-]*$/.test(sourceManifest.id)) {
        throw new Error('The module ID must be a lowercase slug.');
    }
    if (Boolean(urls.manifest) !== Boolean(urls.download)) {
        throw new Error(
            'Configure both FOUNDRY_MANIFEST_URL and FOUNDRY_DOWNLOAD_URL, or neither.',
        );
    }

    const manifest: typeof sourceManifest & ReleaseUrls = {
        ...sourceManifest,
        version,
    };
    if (urls.manifest && urls.download) {
        for (const [field, template] of Object.entries(urls)) {
            if (!template) continue;
            if (field === 'manifest' && template.includes('{version}')) {
                throw new Error(
                    'The manifest URL must be stable across versions.',
                );
            }
            if (field === 'download' && !template.includes('{version}')) {
                throw new Error('The download URL must include {version}.');
            }
            const url = new URL(
                template
                    .replaceAll('{version}', version)
                    .replaceAll('{id}', sourceManifest.id),
            );
            if (
                url.protocol !== 'https:' ||
                !url.hostname.includes('.') ||
                url.hostname === 'localhost' ||
                url.username ||
                url.password
            ) {
                throw new Error(
                    'Release URLs must be public HTTPS URLs without credentials.',
                );
            }
            if (field === 'manifest') manifest.manifest = url.href;
            if (field === 'download') manifest.download = url.href;
        }
    }
    return manifest;
}

export async function verifyManifest(directory: string, version: string) {
    const manifest: unknown = JSON.parse(
        await readFile(resolve(directory, 'module.json'), 'utf8'),
    );
    if (
        !manifest ||
        typeof manifest !== 'object' ||
        !('version' in manifest) ||
        manifest.version !== version ||
        !('id' in manifest) ||
        manifest.id !== sourceManifest.id ||
        !('esmodules' in manifest) ||
        !Array.isArray(manifest.esmodules) ||
        manifest.esmodules.length !== 1 ||
        manifest.esmodules[0] !== 'scripts/main.js'
    ) {
        throw new Error(
            'Built module manifest does not match the release version, ID, or entry point.',
        );
    }
    await readFile(resolve(directory, 'scripts/main.js'));
}
