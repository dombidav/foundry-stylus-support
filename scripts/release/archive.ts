import { open, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { zipSync } from 'fflate';

export async function createArchive(directory: string, destination: string) {
    const files: Record<string, Uint8Array> = {};
    async function collect(relative = ''): Promise<void> {
        for (const entry of await readdir(join(directory, relative), {
            withFileTypes: true,
        })) {
            const name = relative ? `${relative}/${entry.name}` : entry.name;
            if (entry.isSymbolicLink())
                throw new Error(`Cannot archive symbolic link: ${name}`);
            if (
                entry.name === 'node_modules' ||
                entry.name.startsWith('.') ||
                /(?:\.(?:test|spec)\.[cm]?js|\.[cm]?tsx?|\.map|(?:^|\/)(?:package(?:-lock)?\.json|tsconfig[^/]*\.json|(?:eslint|vite|vitest)\.config\.[^/]+))$/.test(
                    name,
                )
            ) {
                throw new Error(`Development file in module build: ${name}`);
            }
            if (entry.isDirectory()) await collect(name);
            else if (entry.isFile())
                files[name] = await readFile(join(directory, name));
            else throw new Error(`Unsupported build entry: ${name}`);
        }
    }
    await collect();
    if (!files['module.json'] || !files['scripts/main.js']) {
        throw new Error(
            'Module build is missing module.json or scripts/main.js.',
        );
    }
    const archive = zipSync(files, { level: 6 });
    const file = await open(destination, 'wx');
    try {
        try {
            await file.writeFile(archive);
        } finally {
            await file.close();
        }
    } catch (error) {
        await rm(destination, { force: true });
        throw error;
    }
    return archive.byteLength;
}
