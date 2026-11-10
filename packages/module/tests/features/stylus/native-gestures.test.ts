import { afterEach, describe, expect, it, vi } from 'vitest';
import { isNearPath } from '../../../src/features/stylus/canvas-tools.ts';
import {
    installNativeGestureControls,
    runNativeGestureAction,
} from '../../../src/features/stylus/native-gestures.ts';
import { verbose } from '../../../src/settings.ts';

class PenEvent {
    pointerType = 'pen';
    pointerId = 7;
    // boolean-name-exempt: Mirrors the native federated PointerEvent property.
    shiftKey = false;
    // boolean-name-exempt: Mirrors the native federated PointerEvent property.
    ctrlKey = false;
    // boolean-name-exempt: Mirrors the native Event property.
    defaultPrevented = false;

    preventDefault(): void {
        this.defaultPrevented = true;
    }
}

class DrawingPreview {}
class Polygon {
    constructor(readonly points: number[]) {}
}

function fixture() {
    const ruler = {
        path: [
            { x: 0, y: 0, elevation: 5 },
            { x: 5, y: 5, elevation: 5 },
        ],
        get destination() {
            return this.path.at(-1);
        },
        // boolean-name-exempt: Mirrors Foundry's BaseRuler property.
        get active() {
            return this.path.length > 0;
        },
        reset() {
            this.path = [];
        },
    };
    const interactionData: Record<string, unknown> = {};
    const canDispatch = vi.fn<
        (action: string, event: Event | PenEvent) => boolean
    >(() => true);
    const cancel = vi.fn();
    const manager = {
        callback: canDispatch,
        interactionData,
        cancel,
        can: () => true,
    };
    const host = {
        mouseInteractionManager: manager,
        controls: { ruler },
        canvasCoordinatesFromClient: (point: { x: number; y: number }) => point,
        forceSnapVertices: false,
    };
    vi.stubGlobal('PIXI', { FederatedPointerEvent: PenEvent });
    vi.stubGlobal('foundry', {
        data: { PolygonShapeData: Polygon },
        canvas: {
            placeables: { Drawing: DrawingPreview },
            interaction: {
                BaseRuler: { getSnappedPoint: () => ({ x: 10, y: 20 }) },
            },
        },
    });
    // The fixture models only the native APIs that the stylus actions use.
    const current = host as unknown as foundry.canvas.Canvas;
    const tap = new Event('pointerdown');
    Object.assign(tap, { clientX: 9, clientY: 19, shiftKey: false });
    return {
        host,
        current,
        manager,
        canDispatch,
        ruler,
        tap: tap as PointerEvent,
    };
}

afterEach(() => vi.unstubAllGlobals());

describe('native stylus actions', () => {
    it('traces a captured release and a forwarded cancel without changing their results', () => {
        const { current, manager, canDispatch } = fixture();
        const controls = installNativeGestureControls(
            current,
            () => 'polygon',
            () => false,
            (id) => id === 7,
            vi.fn(),
        );
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
        verbose.initialize(true);
        try {
            controls.setDiagnostics(true);
            const pen = new PenEvent();
            expect(manager.callback('dragLeftDrop', pen)).toBe(false);
            expect(manager.callback('dragLeftCancel', pen)).toBe(true);
            expect(canDispatch).toHaveBeenCalledExactlyOnceWith(
                'dragLeftCancel',
                pen,
            );
            expect(debug.mock.calls.map(([, event]) => event)).toEqual([
                'foundry.dragLeftDrop:before',
                'foundry.dragLeftDrop:after',
                'foundry.dragLeftCancel:before',
                'foundry.dragLeftCancel:after',
            ]);
            expect(debug.mock.calls[1]?.[2]).toMatchObject({
                data: {
                    pointerId: 7,
                    didContinue: false,
                    isDefaultPrevented: true,
                },
            });
            controls.setDiagnostics(false);
            manager.callback('dragLeftCancel', pen);
            expect(debug).toHaveBeenCalledTimes(4);
        } finally {
            controls.stop();
            verbose.initialize(false);
            debug.mockRestore();
        }
    });

    it('uses the existing polygon preview and waits for three fixed vertices', () => {
        const { current, manager, canDispatch, tap } = fixture();
        manager.interactionData.preview = new DrawingPreview();
        manager.interactionData.shape = new Polygon([0, 0, 0, 10, 4, 4]);
        runNativeGestureAction(current, 'polygon', 'activeTool', tap);
        expect(canDispatch).not.toHaveBeenCalled();
        manager.interactionData.shape = new Polygon([
            0, 0, 0, 10, 10, 10, 4, 4,
        ]);
        runNativeGestureAction(current, 'polygon', 'activeTool', tap);
        expect(canDispatch.mock.calls.map(([action]) => action)).toEqual([
            'clickLeft2',
            'dragLeftDrop',
        ]);
        expect(manager.cancel).toHaveBeenCalledOnce();
        runNativeGestureAction(current, 'polygon', 'removePoint', tap);
        expect(manager.interactionData.cancelled).toBeUndefined();
        expect(manager.cancel).toHaveBeenCalledTimes(2);
        runNativeGestureAction(current, 'polygon', 'cancelGesture', tap);
        expect(manager.interactionData.cancelled).toBe(true);
    });

    it('adds a snapped ruler waypoint with the current elevation, removes it, and cancels the path', () => {
        const { current, manager, ruler, tap } = fixture();
        manager.interactionData.ruler = true;
        runNativeGestureAction(current, 'measure', 'activeTool', tap);
        expect(ruler.path).toEqual([
            { x: 0, y: 0, elevation: 5 },
            { x: 10, y: 20, elevation: 5 },
            { x: 10, y: 20, elevation: 5 },
        ]);
        runNativeGestureAction(current, 'measure', 'activeTool', tap);
        expect(ruler.path).toHaveLength(3);
        runNativeGestureAction(current, 'measure', 'removePoint', tap);
        expect(ruler.path).toHaveLength(2);
        runNativeGestureAction(current, 'measure', 'cancelGesture', tap);
        expect(manager.interactionData.cancelled).toBe(true);
        expect(ruler.path).toEqual([]);
    });

    it('inverts snap on one pen drag, including forced vertices, and restores the callback on cleanup', () => {
        const { current, host, manager, canDispatch } = fixture();
        const status = vi.fn();
        const shifts: boolean[] = [];
        canDispatch.mockImplementation((_action, event) => {
            shifts.push(event instanceof PenEvent && event.shiftKey);
            expect(host.forceSnapVertices).toBe(false);
            return true;
        });
        const controls = installNativeGestureControls(
            current,
            () => 'rectangle',
            () => false,
            () => false,
            status,
        );
        const pen = new PenEvent();
        host.forceSnapVertices = true;
        controls.toggleSnap();
        manager.callback('dragLeftStart', pen);
        manager.callback('dragLeftMove', pen);
        manager.callback('dragLeftDrop', pen);
        expect(host.forceSnapVertices).toBe(true);
        expect(pen.shiftKey).toBe(false);
        host.forceSnapVertices = false;
        manager.callback('dragLeftStart', pen);
        expect(shifts).toEqual([true, true, true, false]);
        expect(status.mock.calls).toEqual([[true], [false]]);
        controls.stop();
        expect(manager.callback).toBe(canDispatch);
    });

    it('preserves a pen ruler on native release and consumes a bound release once', () => {
        const { current, manager, canDispatch } = fixture();
        manager.interactionData.ruler = true;
        const modifiers: boolean[] = [];
        canDispatch.mockImplementation((_action, event) => {
            modifiers.push(event instanceof PenEvent && event.ctrlKey);
            return true;
        });
        const pen = new PenEvent();
        const controls = installNativeGestureControls(
            current,
            () => 'measure',
            () => true,
            (id) => id === 8,
            vi.fn(),
        );
        manager.callback('dragLeftDrop', pen);
        expect(pen.ctrlKey).toBe(false);
        pen.pointerType = 'mouse';
        manager.callback('dragLeftDrop', pen);
        pen.pointerId = 8;
        pen.pointerType = 'pen';
        expect(manager.callback('dragLeftDrop', pen)).toBe(false);
        expect(pen.defaultPrevented).toBe(true);
        expect(modifiers).toEqual([true, false]);
        controls.stop();
    });

    it('clears only the ruler kept open by the module', () => {
        const { current, manager, canDispatch } = fixture();
        manager.interactionData.ruler = true;
        canDispatch.mockImplementation((_action, event) => {
            if (event instanceof PenEvent && event.ctrlKey) {
                manager.interactionData.released = true;
            }
            return true;
        });
        const controls = installNativeGestureControls(
            current,
            () => 'measure',
            () => true,
            () => false,
            vi.fn(),
        );
        const pen = new PenEvent();
        pen.ctrlKey = true;
        manager.callback('dragLeftDrop', pen);
        controls.clearKeptRuler();
        expect(manager.cancel).not.toHaveBeenCalled();

        pen.ctrlKey = false;
        manager.callback('dragLeftDrop', pen);
        controls.clearKeptRuler();
        expect(manager.interactionData.cancelled).toBe(true);
        expect(manager.cancel).toHaveBeenCalledOnce();
        controls.stop();
        expect(manager.cancel).toHaveBeenCalledOnce();
    });
});

it('hits open strokes only near their actual segments, including zero-length segments', () => {
    const points = [0, 0, 0, 0, 0, 20, 20, 20];
    expect(isNearPath({ x: 1, y: 1 }, points, 2)).toBe(true);
    expect(isNearPath({ x: 19, y: 22 }, points, 2)).toBe(true);
    expect(isNearPath({ x: 10, y: 10 }, points, 2)).toBe(false);
    expect(isNearPath({ x: 10, y: 10 }, points, 2, true)).toBe(true);
});
