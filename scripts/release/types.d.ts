export interface ReleaseUrls {
    manifest?: string;
    download?: string;
}

/**
 * Configure the allowed release branch and automatic pushes after a successful local release.
 *
 * @example
 * const config: ReleaseConfig = { branch: 'main', shouldPushTag: true };
 */
export interface ReleaseConfig {
    /** Exact branch (default main), any current branch (*), or local-only releases (null). */
    branch?: string | null;
    /** Push the release tag with the branch (default true); ignored when branch is null. */
    shouldPushTag?: boolean;
}

/**
 * Capture one checked branch and its configured Git push remote before a release changes metadata.
 *
 * @example
 * const plan: ReleasePushPlan = { branch: 'main', remote: 'origin', shouldPushTag: true };
 */
export interface ReleasePushPlan {
    branch: string;
    remote: string;
    shouldPushTag: boolean;
}
