import { afterEach, expect, it, vi } from 'vitest';
import { listenForPenCommands } from '../../../src/features/stylus/pen-input.ts';
import { type StylusBinding } from '../../../src/features/stylus/stylus.types.js';
import { verbose } from '../../../src/settings.ts';

function fixture(hasHandledTip = vi.fn(() => false)) {
    const host = new EventTarget();
    const board = new EventTarget();
    vi.stubGlobal('window', host);
    const addListener = vi.spyOn(host, 'addEventListener');
    const removeListener = vi.spyOn(host, 'removeEventListener');
    const onCommand = vi.fn();
    const input = listenForPenCommands(
        board as HTMLCanvasElement,
        onCommand,
        hasHandledTip,
        vi.fn(),
    );

    function pen(type: string, buttons: number): Event {
        const event = new Event(type, { cancelable: true });
        Object.defineProperty(event, 'target', { value: board });
        Object.assign(event, { pointerType: 'pen', pointerId: 7, buttons });
        host.dispatchEvent(event);
        return event;
    }

    return {
        input,
        onCommand,
        pen,
        addListener,
        removeListener,
        hasHandledTip,
    };
}

afterEach(() => vi.unstubAllGlobals());

it('records raw transitions around a command, skips repeated moves, and detaches the debug move listener', () => {
    const { input, pen, onCommand, removeListener } = fixture();
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    verbose.initialize(true);
    try {
        input.setDiagnostics(true);
        input.setBindings([
            {
                action: 'next',
                target: '',
                signal: { type: 'pointerdown', buttons: 32 },
            },
        ]);
        pen('pointerdown', 1);
        pen('pointermove', 1);
        pen('pointermove', 3);
        pen('pointermove', 3);
        pen('pointerup', 0);
        pen('pointerdown', 32);
        pen('pointerup', 0);
        expect(onCommand).toHaveBeenCalledOnce();
        expect(debug.mock.calls.map(([, event]) => event)).toEqual([
            'pointer.pointerdown',
            'pointer.pointermove',
            'pointer.pointerup',
            'pointer.pointerdown',
            'stylus.buttonMatched',
            'pointer.pointerup',
            'stylus.releaseConsumed',
        ]);
        expect(removeListener).not.toHaveBeenCalled();
        input.setDiagnostics(false);
        expect(removeListener).toHaveBeenCalledWith(
            'pointermove',
            expect.any(Function),
            true,
        );
        pen('pointerdown', 1);
        expect(debug).toHaveBeenCalledTimes(7);
    } finally {
        input.stop();
        verbose.initialize(false);
        debug.mockRestore();
    }
});

it('listens for movement only during a claimed down-only command and keeps the claim through rebinding', () => {
    const { input, onCommand, pen, addListener, removeListener } = fixture();
    const binding: StylusBinding = {
        action: 'next',
        target: '',
        signal: { type: 'pointerdown', buttons: 32 },
    };
    input.setBindings([binding]);
    expect(
        addListener.mock.calls.some(([type]) => type === 'pointermove'),
    ).toBe(false);
    expect(pen('pointerdown', 1).defaultPrevented).toBe(false);
    const tap = pen('pointerdown', 32);
    expect(onCommand).toHaveBeenCalledExactlyOnceWith(binding, tap);
    expect(tap.defaultPrevented).toBe(true);
    expect(addListener).toHaveBeenCalledWith(
        'pointermove',
        expect.any(Function),
        true,
    );

    input.setBindings([]);
    expect(input.hasBindings()).toBe(false);
    expect(input.isClaimed(7)).toBe(true);
    expect(pen('pointermove', 32).defaultPrevented).toBe(true);
    expect(pen('pointerup', 0).defaultPrevented).toBe(true);
    expect(input.isClaimed(7)).toBe(false);
    expect(removeListener).toHaveBeenCalledWith(
        'pointermove',
        expect.any(Function),
        true,
    );
    input.stop();
});

it('keeps the movement listener for a learned hover-to-contact signal and removes it on teardown', () => {
    const { input, onCommand, pen, addListener, removeListener } = fixture();
    const binding: StylusBinding = {
        action: 'undo',
        target: '',
        signal: { type: 'pointermove', buttons: 3 },
    };
    input.setBindings([binding]);
    expect(addListener).toHaveBeenCalledWith(
        'pointermove',
        expect.any(Function),
        true,
    );
    expect(pen('pointerdown', 2).defaultPrevented).toBe(true);
    expect(onCommand).not.toHaveBeenCalled();
    const contact = pen('pointermove', 3);
    pen('pointermove', 3);
    expect(onCommand).toHaveBeenCalledExactlyOnceWith(binding, contact);
    pen('pointerup', 0);
    expect(removeListener).not.toHaveBeenCalled();
    input.stop();
    expect(removeListener).toHaveBeenCalledWith(
        'pointermove',
        expect.any(Function),
        true,
    );
});

it('routes only the claimed tip contact to the custom tool', () => {
    const { input, pen, hasHandledTip, removeListener } = fixture(
        vi.fn(() => true),
    );
    pen('pointerdown', 1);
    expect(pen('pointermove', 1).defaultPrevented).toBe(true);
    expect(pen('pointerup', 0).defaultPrevented).toBe(true);
    expect(hasHandledTip).toHaveBeenCalledTimes(3);
    expect(removeListener).toHaveBeenCalledWith(
        'pointermove',
        expect.any(Function),
        true,
    );
    input.stop();
});
