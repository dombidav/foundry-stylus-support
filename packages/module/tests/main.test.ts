import { expect, it, vi } from 'vitest';

it('wires each lifecycle handler once without initializing Foundry on import', async () => {
    vi.resetModules();
    const once = vi.fn<(event: string, callback: () => void) => number>(
        () => 1,
    );
    const on = vi.fn();
    vi.stubGlobal('Hooks', { once, on });
    vi.stubGlobal('game', undefined);
    vi.stubGlobal('ui', undefined);

    await import('../src/main.ts');
    await import('../src/main.ts');
    const { onInit, onSetup, onReady } = await import('../src/lifecycle.ts');

    expect(once.mock.calls).toEqual([
        ['init', onInit],
        ['setup', onSetup],
        ['ready', onReady],
    ]);
    expect(on).not.toHaveBeenCalled();
});
