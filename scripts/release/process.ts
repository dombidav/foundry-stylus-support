import { spawnSync } from 'node:child_process';

export function run(
    command: string,
    args: string[],
    cwd: string,
    isQuiet = false,
) {
    const result = spawnSync(command, args, {
        cwd,
        encoding: 'utf8',
        stdio: isQuiet ? 'pipe' : 'inherit',
        windowsHide: true,
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(
            `${command} ${args.join(' ')} failed (${result.status}): ${result.stderr ?? ''}`,
        );
    }
    return result.stdout?.trim() ?? '';
}

export function npm(args: string[], cwd: string, isQuiet = false) {
    const cli = process.env.npm_execpath;
    if (!cli)
        throw new Error(
            'Run release scripts through an npm run release:* command.',
        );
    return run(process.execPath, [cli, ...args], cwd, isQuiet);
}
