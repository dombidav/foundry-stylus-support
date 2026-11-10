import { expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import manifest from '../static/module.json' with { type: 'json' };
import { createManifest } from '../../../scripts/release/manifest.ts';
import { MODULE_ID } from '../src/module-id.ts';

it('uses the same module ID in runtime code and generated manifests', () => {
    expect(MODULE_ID).toBe(createManifest('1.2.3').id);
});

it('bundles the ID without retaining unrelated manifest metadata', async () => {
    const { build } = await import('vite');
    const result = await build({
        configFile: false,
        publicDir: false,
        logLevel: 'silent',
        build: {
            write: false,
            minify: true,
            lib: {
                entry: fileURLToPath(
                    new URL('../src/module-id.ts', import.meta.url),
                ),
                formats: ['es'],
                fileName: 'module-id',
            },
        },
    });
    const results = Array.isArray(result) ? result : [result];
    const chunks = results
        .flatMap((output) => ('output' in output ? output.output : []))
        .filter((item) => item.type === 'chunk');
    expect(chunks).toHaveLength(1);
    const code = chunks[0]?.code ?? '';
    expect(code).toContain(MODULE_ID);
    expect(code).not.toContain(manifest.title);
    expect(code).not.toContain(manifest.description);
});
