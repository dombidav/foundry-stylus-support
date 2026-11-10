import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CanvasUtils } from '../../src/index.ts';

beforeEach(() => {
    vi.stubGlobal('canvas', undefined);
});

describe('ready canvas access', () => {
    it.each([undefined, null, { ready: false, scene: { id: 'stale' } }])(
        'handles an unavailable canvas: %s',
        (value) => {
            vi.stubGlobal('canvas', value);
            expect(CanvasUtils.isReady()).toBe(false);
            expect(CanvasUtils.getScene()).toBeNull();
            expect(CanvasUtils.getControlledTokens()).toEqual([]);
            expect(CanvasUtils.getHoveredToken()).toBeNull();
            expect(CanvasUtils.getViewCenter()).toBeNull();
            expect(CanvasUtils.getMousePosition()).toBeNull();
            expect(CanvasUtils.panTo({ x: 10, y: 20 })).toBe(false);
        },
    );

    it('returns token and coordinate snapshots without drawing or mutating the canvas', () => {
        const controlled = [{ id: 'token' }];
        const hovered = { id: 'hovered' };
        const mousePosition = { x: 250, y: 300 };
        const nativeCenter = { x: 1000, y: 1200 };
        const toLocal = vi.fn(() => nativeCenter);
        const draw = vi.fn();
        const scene = { id: 'viewed' };
        vi.stubGlobal('canvas', {
            ready: true,
            scene,
            tokens: { controlled, hover: hovered },
            screenDimensions: [800, 600],
            stage: { toLocal },
            mousePosition,
            draw,
        });
        expect(CanvasUtils.isReady()).toBe(true);
        expect(CanvasUtils.getScene()).toBe(scene);
        expect(CanvasUtils.getControlledTokens()).toEqual(controlled);
        expect(CanvasUtils.getControlledTokens()).not.toBe(controlled);
        expect(CanvasUtils.getHoveredToken()).toBe(hovered);
        expect(CanvasUtils.getViewCenter()).toEqual(nativeCenter);
        expect(toLocal).toHaveBeenCalledExactlyOnceWith({ x: 400, y: 300 });
        const position = CanvasUtils.getMousePosition();
        expect(position).toEqual(mousePosition);
        expect(position).not.toBe(mousePosition);
        expect(draw).not.toHaveBeenCalled();
    });

    it('validates native pan inputs and forwards valid coordinates once', () => {
        const pan = vi.fn();
        vi.stubGlobal('canvas', { ready: true, pan });
        expect(CanvasUtils.panTo({ x: 100, y: 200 }, 1.5)).toBe(true);
        expect(pan).toHaveBeenCalledExactlyOnceWith({
            x: 100,
            y: 200,
            scale: 1.5,
        });
        expect(() => CanvasUtils.panTo({ x: NaN, y: 0 })).toThrow(RangeError);
        expect(() => CanvasUtils.panTo({ x: 0, y: Infinity })).toThrow(
            RangeError,
        );
        expect(() => CanvasUtils.panTo({ x: 0, y: 0 }, 0)).toThrow(RangeError);
        expect(pan).toHaveBeenCalledOnce();
    });
});
