import { type ReleaseConfig } from './scripts/release/types.js';

export default {
    // Exact release branch; '*' allows the current branch, null disables all pushes and branch checks.
    branch: 'main',
    shouldPushTag: true,
} satisfies ReleaseConfig;
