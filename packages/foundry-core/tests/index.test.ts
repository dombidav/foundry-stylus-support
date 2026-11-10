import { expect, it, vi } from 'vitest';

it('imports all helpers without Foundry, hooks, settings, or canvas initialization', async () => {
    vi.resetModules();
    for (const key of ['Hooks', 'game', 'canvas', 'foundry', 'ui'])
        vi.stubGlobal(key, undefined);
    const api = await import('../src/index.ts');
    expect(Object.keys(api).sort()).toEqual([
        'CanvasUtils',
        'DocumentUtils',
        'HooksUtils',
        'SceneUtils',
        'SettingsUtils',
    ]);
    expect(api.CanvasUtils.isReady()).toBe(false);
    expect(api.SceneUtils.getContext()).toEqual({
        active: null,
        viewed: null,
        canvasReady: false,
    });
    expect(() =>
        api.SettingsUtils.create('offline', {
            enabled: { scope: 'client', default: true },
        }),
    ).not.toThrow();
    expect(api.SettingsUtils.withVerboseMode().isVerbose).toBe(false);
});
