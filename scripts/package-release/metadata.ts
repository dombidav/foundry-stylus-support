import { createManifest } from '../release/manifest.ts';

/**
 * Validate a stable release tag against the root version and derive public GitHub asset URLs.
 *
 * @example
 * const metadata = createReleaseMetadata('owner/repository', 'v1.2.3', '1.2.3');
 */
export function createReleaseMetadata(
    repository: string,
    tag: string,
    version: string,
) {
    if (
        !/^[a-zA-Z0-9][a-zA-Z0-9-]*\/[a-zA-Z0-9_.-]+$/.test(repository) ||
        repository.endsWith('/.') ||
        repository.endsWith('/..')
    ) {
        throw new Error('GITHUB_REPOSITORY must be an owner/repository name.');
    }
    if (tag !== `v${version}`) {
        throw new Error(
            `Release tag ${tag} must match root version v${version}.`,
        );
    }
    const base = `https://github.com/${repository}/releases`;
    const urls = {
        manifest: `${base}/latest/download/module.json`,
        download: `${base}/download/v{version}/{id}-{version}.zip`,
    };
    const manifest = createManifest(version, urls);
    return {
        urls,
        manifest,
        archiveName: `${manifest.id}-${manifest.version}.zip`,
    };
}
