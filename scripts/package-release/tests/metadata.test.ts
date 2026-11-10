import { describe, expect, it } from 'vitest';
import sourceManifest from '../../../packages/module/static/module.json' with { type: 'json' };
import { createReleaseMetadata } from '../metadata.ts';

describe('GitHub release metadata', () => {
    it('derives matching manifest and archive URLs from the current repository and tag', () => {
        const metadata = createReleaseMetadata(
            'my-team/my-module',
            'v1.2.3',
            '1.2.3',
        );
        expect(metadata.archiveName).toBe(`${sourceManifest.id}-1.2.3.zip`);
        expect(metadata.manifest).toMatchObject({
            id: sourceManifest.id,
            version: '1.2.3',
            manifest:
                'https://github.com/my-team/my-module/releases/latest/download/module.json',
            download: `https://github.com/my-team/my-module/releases/download/v1.2.3/${sourceManifest.id}-1.2.3.zip`,
        });
    });

    it.each([
        '',
        'owner',
        'owner/repo/extra',
        'https://github.com/owner/repo',
        '../repo',
        'owner/..',
        'owner/repo?x=1',
        'owner/repo#asset',
    ])('rejects an invalid repository: %s', (repository) => {
        expect(() =>
            createReleaseMetadata(repository, 'v1.2.3', '1.2.3'),
        ).toThrow('owner/repository');
    });

    it.each(['', '1.2.3', 'v1.2.4', 'v1.2.3-beta.1'])(
        'rejects a tag that does not exactly match the root version: %s',
        (tag) => {
            expect(() =>
                createReleaseMetadata('owner/repo', tag, '1.2.3'),
            ).toThrow('must match');
        },
    );

    it.each(['1.2.3-beta.1', '01.2.3', 'invalid'])(
        'rejects unsupported root versions: %s',
        (version) => {
            expect(() =>
                createReleaseMetadata('owner/repo', `v${version}`, version),
            ).toThrow('stable semver');
        },
    );
});
