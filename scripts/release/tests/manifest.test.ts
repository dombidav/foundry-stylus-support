import { describe, expect, it } from 'vitest';
import sourceManifest from '../../../packages/module/static/module.json' with { type: 'json' };
import { createManifest } from '../manifest.ts';

describe('release manifest', () => {
    it('uses the authoritative version without inventing release URLs', () => {
        const manifest = createManifest('2.3.4');
        expect(manifest.version).toBe('2.3.4');
        expect(manifest.manifest).toBeUndefined();
        expect(manifest.download).toBeUndefined();
        expect(manifest.relationships.systems).toContainEqual({
            id: 'dnd5e',
            type: 'system',
        });
    });

    it('generates stable manifest and version-specific archive URLs', () => {
        const manifest = createManifest('2.3.4', {
            manifest: 'https://example.com/latest/module.json',
            download: 'https://example.com/{version}/{id}-{version}.zip',
        });
        expect(manifest.manifest).toBe(
            'https://example.com/latest/module.json',
        );
        expect(manifest.download).toBe(
            `https://example.com/2.3.4/${sourceManifest.id}-2.3.4.zip`,
        );
    });

    it.each(['1.0', '01.0.0', '1.0.0-beta.1', 'invalid'])(
        'rejects unsupported version %s',
        (version) => {
            expect(() => createManifest(version)).toThrow('stable semver');
        },
    );

    it.each([
        { manifest: 'https://example.com/module.json' },
        {
            manifest: 'https://example.com/{version}/module.json',
            download: 'https://example.com/{version}/module.zip',
        },
        {
            manifest: 'https://example.com/module.json',
            download: 'https://example.com/module.zip',
        },
        {
            manifest: 'http://example.com/module.json',
            download: 'https://example.com/{version}.zip',
        },
    ])('rejects incomplete or unsuitable update URLs', (urls) => {
        expect(() => createManifest('1.0.0', urls)).toThrow();
    });
});
