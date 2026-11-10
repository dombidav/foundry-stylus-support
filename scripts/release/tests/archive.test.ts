import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createArchive } from '../archive.ts';
import { createManifest, verifyManifest } from '../manifest.ts';

describe('module archive', () => {
    let root: string;
    let directory: string;
    let destination: string;

    beforeEach(async () => {
        root = await mkdtemp(join(tmpdir(), 'foundry-archive-test-'));
        directory = join(root, 'module');
        destination = join(root, 'module.zip');
        await mkdir(join(directory, 'scripts'), { recursive: true });
        await writeFile(
            join(directory, 'module.json'),
            JSON.stringify(createManifest('1.2.3')),
        );
        await writeFile(
            join(directory, 'scripts/main.js'),
            'console.log("module");',
        );
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });

    it('round-trips the versioned manifest, bundle, and nested static assets at ZIP root', async () => {
        await mkdir(join(directory, 'assets'));
        await writeFile(join(directory, 'assets/icon.svg'), '<svg/>');
        await verifyManifest(directory, '1.2.3');
        expect(await createArchive(directory, destination)).toBeGreaterThan(0);
        const files = unzipSync(await readFile(destination));
        expect(Object.keys(files).sort()).toEqual([
            'assets/icon.svg',
            'module.json',
            'scripts/main.js',
        ]);
        expect(JSON.parse(strFromU8(files['module.json']!))).toMatchObject({
            version: '1.2.3',
        });
        expect(strFromU8(files['assets/icon.svg']!)).toBe('<svg/>');
    });

    it('refuses to overwrite an existing release', async () => {
        await writeFile(destination, 'existing archive');
        await expect(createArchive(directory, destination)).rejects.toThrow();
        expect(await readFile(destination, 'utf8')).toBe('existing archive');
    });

    it.each([
        'source.ts',
        'main.test.js',
        'main.js.map',
        'package.json',
        'vite.config.js',
    ])('rejects development file %s', async (name) => {
        await writeFile(join(directory, name), 'development');
        await expect(createArchive(directory, destination)).rejects.toThrow(
            'Development file',
        );
    });

    it('rejects a mismatched distributed version', async () => {
        await expect(verifyManifest(directory, '1.2.4')).rejects.toThrow(
            'does not match',
        );
    });
});
