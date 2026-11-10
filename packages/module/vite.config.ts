import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import rootPackage from '../../package.json' with { type: 'json' };
import { createManifest } from '../../scripts/release/manifest.ts';

export default defineConfig({
    publicDir: 'static',
    plugins: [
        {
            name: 'module-manifest',
            generateBundle() {
                this.emitFile({
                    type: 'asset',
                    fileName: 'module.json',
                    source: `${JSON.stringify(
                        createManifest(rootPackage.version, {
                            manifest: process.env.FOUNDRY_MANIFEST_URL,
                            download: process.env.FOUNDRY_DOWNLOAD_URL,
                        }),
                        null,
                        2,
                    )}\n`,
                });
            },
        },
    ],
    build: {
        outDir: '../../dist/module',
        emptyOutDir: true,
        target: 'es2023',
        sourcemap: false,
        minify: true,
        modulePreload: false,
        rolldownOptions: {
            input: fileURLToPath(new URL('./src/main.ts', import.meta.url)),
            output: {
                format: 'es',
                entryFileNames: 'scripts/main.js',
                chunkFileNames: 'scripts/[name]-[hash].js',
            },
        },
    },
});
