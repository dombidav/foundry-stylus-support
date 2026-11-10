import { afterEach, expect, it, vi } from 'vitest';
import { listenForPenTouchDuplicates } from '../../../src/features/stylus/pen-touch.ts';

function fixture() {
    const host = new EventTarget();
    vi.stubGlobal('window', host);
    const board = new EventTarget() as HTMLCanvasElement;
    const stop = new AbortController();
    const filter = listenForPenTouchDuplicates(board, stop.signal);

    function touchEvent(
        type: string,
        timeStamp: number,
        touches: {
            identifier: number;
            clientX: number;
            clientY: number;
            touchType?: string;
        }[],
        target = board,
    ): Event {
        const event = new Event(type, { cancelable: true });
        Object.defineProperties(event, {
            isTrusted: { value: true },
            target: { value: target },
            timeStamp: { value: timeStamp },
            changedTouches: { value: touches },
        });
        host.dispatchEvent(event);
        return event;
    }

    function rememberPenDown(timeStamp: number): void {
        const event = new Event('pointerdown');
        Object.defineProperties(event, {
            isTrusted: { value: true },
            timeStamp: { value: timeStamp },
            clientX: { value: 100.5 },
            clientY: { value: 80 },
        });
        filter.rememberPenDown(event as PointerEvent);
    }

    return {
        host,
        touchEvent,
        rememberPenDown,
        close: () => {
            filter.reset();
            stop.abort();
        },
    };
}

afterEach(() => vi.unstubAllGlobals());

const pen = { identifier: 0, clientX: 100, clientY: 80 };
const finger = { identifier: 1, clientX: 190, clientY: 95 };

it('blocks a pen’s legacy TouchEvent sequence before the touch handler can synthesize a click', () => {
    const { host, touchEvent, rememberPenDown, close } = fixture();
    const swipeStart = vi.fn();
    host.addEventListener('touchstart', swipeStart);
    rememberPenDown(10);
    expect(touchEvent('touchstart', 10, [pen]).defaultPrevented).toBe(true);
    expect(swipeStart).not.toHaveBeenCalled();
    expect(touchEvent('touchmove', 17, [pen]).defaultPrevented).toBe(true);
    expect(touchEvent('touchend', 21, [pen]).defaultPrevented).toBe(true);
    expect(touchEvent('touchstart', 30, [pen]).defaultPrevented).toBe(false);
    expect(swipeStart).toHaveBeenCalledOnce();
    close();
});

it('lets finger gestures through when a pen is present or a touch has a different timestamp or position', () => {
    const { touchEvent, rememberPenDown, close } = fixture();
    rememberPenDown(10);
    expect(touchEvent('touchstart', 11, [pen]).defaultPrevented).toBe(false);
    rememberPenDown(12);
    expect(touchEvent('touchstart', 12, [finger]).defaultPrevented).toBe(false);
    rememberPenDown(14);
    expect(
        touchEvent('touchstart', 14, [{ ...pen, touchType: 'direct' }])
            .defaultPrevented,
    ).toBe(false);
    expect(
        touchEvent('touchstart', 15, [{ ...pen, touchType: 'stylus' }])
            .defaultPrevented,
    ).toBe(true);
    expect(touchEvent('touchstart', 20, [finger]).defaultPrevented).toBe(false);
    expect(touchEvent('touchmove', 21, [pen, finger]).defaultPrevented).toBe(
        false,
    );
    expect(touchEvent('touchcancel', 22, [pen]).defaultPrevented).toBe(true);
    expect(touchEvent('touchend', 23, [finger]).defaultPrevented).toBe(false);
    close();
});
