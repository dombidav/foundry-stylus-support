import { vi } from 'vitest';
import { type HookCallback } from '../../src/hooks/hooks.types.js';
import { type HookRegistration } from './fixtures.types.js';

/**
 * Build an isolated hook-registration mock with IDs and manual firing for cleanup unit tests.
 *
 * @example
 * const hooks = createHooks();
 * vi.stubGlobal('Hooks', hooks);
 */
export function createHooks() {
    const registrations = new Map<number, HookRegistration>();
    let nextId = 0;
    const on = vi.fn((hook: string, callback: HookCallback) => {
        const id = ++nextId;
        registrations.set(id, { hook, callback, isOnce: false });
        return id;
    });
    const once = vi.fn((hook: string, callback: HookCallback) => {
        const id = ++nextId;
        registrations.set(id, { hook, callback, isOnce: true });
        return id;
    });
    const off = vi.fn((hook: string, id: number) => {
        if (registrations.get(id)?.hook === hook) registrations.delete(id);
    });
    /**
     * Invoke matching fixture callbacks and remove one-shot registrations before invoking their callbacks.
     *
     * @example
     * hooks.fire('ready');
     */
    function fire(hook: string, ...args: unknown[]) {
        for (const [id, registration] of [...registrations]) {
            if (registration.hook !== hook) continue;
            if (registration.isOnce) registrations.delete(id);
            Reflect.apply(registration.callback, undefined, args);
        }
    }
    return { on, once, off, registrations, fire };
}
