import { run } from './process.ts';
import { type ReleaseConfig, type ReleasePushPlan } from './types.js';

/**
 * Require the configured branch or any attached branch for *, skipping checks entirely for null.
 *
 * @example
 * const branch = requireReleaseBranch(root, 'main');
 */
export function requireReleaseBranch(root: string, branch: string | null) {
    if (branch === null) return null;
    if (typeof branch !== 'string' || !branch.trim())
        throw new Error('Release branch must be a branch name, *, or null.');
    const current = run('git', ['branch', '--show-current'], root, true);
    if (!current)
        throw new Error(
            'Check out a branch before releasing; HEAD is detached.',
        );
    if (branch !== '*' && current !== branch)
        throw new Error(
            `Release requires branch ${branch}; current branch is ${current}.`,
        );
    return current;
}

/**
 * Resolve the branch gate and a named Git push remote before versioning; null creates a local-only plan.
 * Respect branch.pushRemote, remote.pushDefault, and branch.remote before origin or a sole remote.
 *
 * @example
 * const plan = createReleasePushPlan(root, { branch: '*', shouldPushTag: false });
 */
export function createReleasePushPlan(
    root: string,
    config: ReleaseConfig,
): ReleasePushPlan | null {
    const branch = requireReleaseBranch(
        root,
        config.branch === undefined ? 'main' : config.branch,
    );
    if (branch === null) return null;
    const shouldPushTag =
        config.shouldPushTag === undefined ? true : config.shouldPushTag;
    if (typeof shouldPushTag !== 'boolean')
        throw new TypeError('shouldPushTag must be boolean.');
    const remotes = run('git', ['remote'], root, true)
        .split('\n')
        .filter(Boolean);
    let remote = '';
    for (const key of [
        `branch.${branch}.pushRemote`,
        'remote.pushDefault',
        `branch.${branch}.remote`,
    ]) {
        remote = run(
            'git',
            ['config', '--default', '', '--get', key],
            root,
            true,
        );
        if (remote) break;
    }
    if (!remote)
        remote = remotes.includes('origin')
            ? 'origin'
            : remotes.length === 1
              ? (remotes[0] ?? '')
              : '';
    if (!remote || !remotes.includes(remote))
        throw new Error(
            'Configure a named Git push remote for the release branch (branch.<name>.pushRemote), origin, or a single remote.',
        );
    return { branch, remote, shouldPushTag };
}

/**
 * Push only the captured branch and optional release tag, atomically when both are enabled.
 * Disable Git follow-tags so a false shouldPushTag never uploads annotated tags implicitly.
 *
 * @example
 * pushRelease(root, plan, 'v1.2.3');
 */
export function pushRelease(
    root: string,
    plan: ReleasePushPlan | null,
    tag: string,
): void {
    if (plan === null) return;
    requireReleaseBranch(root, plan.branch);
    const args = ['push', '--no-follow-tags'];
    if (plan.shouldPushTag) args.push('--atomic');
    args.push(
        '--',
        plan.remote,
        `refs/heads/${plan.branch}:refs/heads/${plan.branch}`,
    );
    if (plan.shouldPushTag) args.push(`refs/tags/${tag}:refs/tags/${tag}`);
    run('git', args, root);
}
