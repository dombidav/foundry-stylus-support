import { afterEach, expect, it, vi } from 'vitest';
import { createTipGestures } from '../../../src/features/stylus/tip-gestures.ts';

class Preview {
    currentPath: { points: number[] } | undefined;
    moveTo = vi.fn((x: number, y: number) => {
        this.currentPath = { points: [x, y] };
        return this;
    });
    lineTo = vi.fn();
    lineStyle = () => this;
    destroy = vi.fn();
}

afterEach(() => vi.unstubAllGlobals());

it('starts a new preview segment at the last point after Pixi finalizes a frame', () => {
    vi.stubGlobal('PIXI', { Graphics: Preview });
    vi.stubGlobal('game', { paused: false });
    const addChild = vi.fn<(preview: Preview) => void>();
    const board = {
        hasPointerCapture: () => false,
    } as unknown as HTMLCanvasElement;
    const current = {
        controls: { addChild },
        stage: { scale: { x: 1 } },
        canvasCoordinatesFromClient: (point: { x: number; y: number }) => point,
    } as unknown as foundry.canvas.Canvas;
    const gesture = createTipGestures(board, current, () => 'lasso', vi.fn());

    function pen(type: string, x: number, y: number): void {
        const event = new Event(type);
        Object.defineProperty(event, 'target', { value: board });
        Object.assign(event, {
            pointerType: 'pen',
            pointerId: 7,
            buttons: 1,
            clientX: x,
            clientY: y,
        });
        gesture.hasHandled(event as PointerEvent);
    }

    pen('pointerdown', 10, 10);
    const preview = addChild.mock.calls[0]![0];
    pen('pointermove', 20, 20);
    expect(preview.moveTo.mock.calls).toEqual([[10, 10]]);
    preview.currentPath = undefined;
    pen('pointermove', 30, 30);
    expect(preview.moveTo.mock.calls).toEqual([
        [10, 10],
        [20, 20],
    ]);
    expect(preview.lineTo.mock.calls).toEqual([
        [20, 20],
        [30, 30],
    ]);
    pen('pointercancel', 30, 30);
    expect(preview.destroy).toHaveBeenCalledOnce();
});
