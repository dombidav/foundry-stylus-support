import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import rootPackage from '../../package.json' with { type: 'json' };
import { createArchive } from '../release/archive.ts';
import { verifyManifest } from '../release/manifest.ts';
import { npm } from '../release/process.ts';
import { createReleaseMetadata } from './metadata.ts';

try {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    const metadata = createReleaseMetadata(
        process.env.GITHUB_REPOSITORY ?? '',
        process.env.GITHUB_REF_NAME ?? '',
        rootPackage.version,
    );
    // Child builds inherit these URLs; template copies use their own repository without configuration.
    process.env.FOUNDRY_MANIFEST_URL = metadata.urls.manifest;
    process.env.FOUNDRY_DOWNLOAD_URL = metadata.urls.download;
    npm(['run', 'build'], root);
    const output = resolve(root, 'dist/module');
    await verifyManifest(output, rootPackage.version);
    await mkdir(resolve(root, 'releases'), { recursive: true });
    const archive = resolve(root, 'releases', metadata.archiveName);
    await createArchive(output, archive);
    console.log(`Created ${archive}\nManifest: ${metadata.manifest.manifest}`);
} catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
}
