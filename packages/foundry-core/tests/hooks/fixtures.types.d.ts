import { type HookCallback } from '../../src/hooks/hooks.types.js';

/**
 * Store a mock hook's name, original callback, and one-shot flag under its numeric test ID.
 *
 * @example
 * const registration: HookRegistration = { hook: 'ready', callback: () => {}, isOnce: true };
 */
export interface HookRegistration {
    hook: string;
    callback: HookCallback;
    isOnce: boolean;
}
