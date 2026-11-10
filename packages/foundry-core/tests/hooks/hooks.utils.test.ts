import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HooksUtils } from '../../src/index.ts';
import { createHooks } from './fixtures.ts';

describe('hook subscription lifecycle', () => {
    let native: ReturnType<typeof createHooks>;
    beforeEach(() => {
        native = createHooks();
        vi.stubGlobal('Hooks', native);
    });

    it('forwards the original callback and removes its registration by ID exactly once', () => {
        const callback = vi.fn();
        const cleanup = HooksUtils.on('ready', callback);
        expect(native.on).toHaveBeenCalledExactlyOnceWith('ready', callback);
        native.fire('ready');
        expect(callback).toHaveBeenCalledOnce();
        cleanup();
        cleanup();
        native.fire('ready');
        expect(callback).toHaveBeenCalledOnce();
        expect(native.off).toHaveBeenCalledExactlyOnceWith('ready', 1);
    });

    it('keeps duplicate callback registrations independent', () => {
        const callback = vi.fn();
        const first = HooksUtils.on('ready', callback);
        const second = HooksUtils.on('ready', callback);
        first();
        native.fire('ready');
        expect(callback).toHaveBeenCalledOnce();
        expect(native.registrations.size).toBe(1);
        second();
        expect(native.registrations.size).toBe(0);
    });

    it('cancels a once hook before firing and never registers a persistent replacement', () => {
        const callback = vi.fn();
        const cleanup = HooksUtils.once('ready', callback);
        expect(native.once).toHaveBeenCalledExactlyOnceWith('ready', callback);
        expect(native.on).not.toHaveBeenCalled();
        cleanup();
        cleanup();
        native.fire('ready');
        expect(callback).not.toHaveBeenCalled();
        expect(native.off).toHaveBeenCalledOnce();
    });

    it('lets native once fire only once and leaves unrelated listeners registered', () => {
        const callback = vi.fn();
        const persistent = vi.fn();
        const cleanup = HooksUtils.once('ready', callback);
        HooksUtils.on('ready', persistent);
        native.fire('ready');
        native.fire('ready');
        cleanup();
        cleanup();
        expect(callback).toHaveBeenCalledOnce();
        expect(persistent).toHaveBeenCalledTimes(2);
        expect(native.registrations.size).toBe(1);
    });

    it('captures the registering API for cleanup even if the global changes later', () => {
        const cleanup = HooksUtils.on('ready', vi.fn());
        vi.stubGlobal('Hooks', createHooks());
        cleanup();
        expect(native.registrations.size).toBe(0);
    });

    it('registers mixed known and custom handlers and cleans all of them once', () => {
        const ready = vi.fn();
        const custom = vi.fn<(payload: { count: number }) => void>();
        const cleanup = HooksUtils.onMany({
            ready,
            'my-module.changed': custom,
        });
        native.fire('ready');
        native.fire('my-module.changed', { count: 3 });
        expect(ready).toHaveBeenCalledOnce();
        expect(custom).toHaveBeenCalledExactlyOnceWith({ count: 3 });
        cleanup();
        cleanup();
        expect(native.off).toHaveBeenCalledTimes(2);
        expect(native.registrations.size).toBe(0);
    });

    it('rolls back successful registrations if a later registration fails', () => {
        native.on
            .mockImplementationOnce((hook, callback) => {
                native.registrations.set(1, { hook, callback, isOnce: false });
                return 1;
            })
            .mockImplementationOnce(() => {
                throw new Error('Registration failed');
            });
        expect(() =>
            HooksUtils.onMany({ init: vi.fn(), ready: vi.fn() }),
        ).toThrow('Registration failed');
        expect(native.off).toHaveBeenCalledExactlyOnceWith('init', 1);
        expect(native.registrations.size).toBe(0);
    });

    it('handles an empty group without accessing Foundry', () => {
        vi.stubGlobal('Hooks', undefined);
        const cleanup = HooksUtils.onMany({});
        expect(() => {
            cleanup();
            cleanup();
        }).not.toThrow();
    });
});
