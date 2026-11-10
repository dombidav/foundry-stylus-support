import {
    type HookName,
    type HookCallback,
    type HookCallbackFor,
    type HookHandlers,
    type HookCleanup,
    type HookRegistrar,
} from './hooks.types.js';

/**
 * Register a typed persistent hook and return idempotent cleanup tied to its native registration ID.
 *
 * @example
 * const stop = HooksUtils.on('canvasReady', current => inspectScene(current.scene));
 * stop();
 */
export function on<H extends HookName>(
    hook: H,
    callback: HookCallbackFor<NoInfer<H>>,
): HookCleanup {
    const native = Hooks as unknown as HookRegistrar;
    const id = native.on(hook, callback);
    let isActive = true;
    return () => {
        if (!isActive) return;
        isActive = false;
        native.off(hook, id);
    };
}

/**
 * Register a native one-shot hook with manual cancellation before firing and harmless cleanup afterward.
 *
 * @example
 * const cancel = HooksUtils.once('ready', () => initializeModuleFeatures());
 * cancel();
 */
export function once<H extends HookName>(
    hook: H,
    callback: HookCallbackFor<NoInfer<H>>,
): HookCleanup {
    const native = Hooks as unknown as HookRegistrar;
    const id = native.once(hook, callback);
    let isActive = true;
    return () => {
        if (!isActive) return;
        isActive = false;
        native.off(hook, id);
    };
}

/**
 * Register typed persistent handlers together; remove successful registrations if a later registration fails.
 *
 * @example
 * const stopAll = HooksUtils.onMany({ ready: () => {}, setup: () => {} });
 * stopAll();
 */
export function onMany<H extends HookName>(
    handlers: HookHandlers<H>,
): HookCleanup {
    const entries = Object.entries(handlers);
    if (entries.length === 0) return () => {};
    const native = Hooks as unknown as HookRegistrar;
    const registrations: [string, number][] = [];
    let isActive = true;
    /**
     * Remove this batch's recorded native IDs once and release the stored registration list.
     *
     * @example
     * cleanup();
     * cleanup();
     */
    const cleanup = () => {
        if (!isActive) return;
        isActive = false;
        for (const [hook, id] of registrations) native.off(hook, id);
        registrations.length = 0;
    };
    try {
        for (const [hook, callback] of entries) {
            // Object.entries erases mapped key/callback correlations; the public signature checks them.
            registrations.push([
                hook,
                native.on(hook, callback as HookCallback),
            ]);
        }
    } catch (error) {
        cleanup();
        throw error;
    }
    return cleanup;
}
