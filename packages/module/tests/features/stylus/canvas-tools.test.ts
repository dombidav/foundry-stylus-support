import { afterEach, expect, it, vi } from 'vitest';
import {
    findDrawingToErase,
    selectLassoTokens,
} from '../../../src/features/stylus/canvas-tools.ts';

class Bounds {}

class Path {
    constructor(
        readonly points: number[],
        readonly isClosed = false,
    ) {}

    // boolean-name-exempt: Mirrors the Pixi Polygon property read by the eraser.
    get closeStroke(): boolean {
        return this.isClosed;
    }

    // boolean-name-exempt: Mirrors the Pixi Polygon hit-test method.
    contains(x: number, y: number): boolean {
        return x >= 0 && x <= 40 && y >= 0 && y <= 40;
    }
}

afterEach(() => vi.unstubAllGlobals());

it('batches the placeables panels for a multi-token lasso and skips them when selection stays the same', () => {
    const renderDirectory = vi.fn();
    const renderPalette = vi.fn();
    vi.stubGlobal('PIXI', { Rectangle: Bounds, Polygon: Path });
    vi.stubGlobal('game', { activeTool: 'select' });
    vi.stubGlobal('ui', {
        placeables: { render: renderDirectory },
        placeablesPalette: { render: renderPalette },
    });
    function token(x: number, isControlled: boolean) {
        return {
            center: { x, y: 10 },
            isVisible: true,
            visible: true,
            interactive: true,
            renderable: true,
            controlled: isControlled,
            control: vi.fn(() => true),
            release: vi.fn(() => true),
        };
    }
    const added = [token(10, false), token(20, false)];
    const dropped = [token(50, true), token(60, true)];
    const controlled = [...dropped];
    const current = {
        tokens: { placeables: [...added, ...dropped], controlled },
    } as unknown as foundry.canvas.Canvas;
    const outline = [0, 0, 40, 0, 40, 40, 0, 40];
    selectLassoTokens(current, outline, false);
    for (const item of added) {
        expect(item.control).toHaveBeenCalledExactlyOnceWith({
            releaseOthers: false,
            renderSidebar: false,
        });
        item.controlled = true;
    }
    for (const item of dropped) {
        expect(item.release).toHaveBeenCalledExactlyOnceWith({
            renderSidebar: false,
        });
    }
    controlled.splice(0, controlled.length, ...added);
    selectLassoTokens(current, outline, false);
    expect(renderDirectory).toHaveBeenCalledOnce();
    expect(renderPalette).toHaveBeenCalledOnce();
});

it('uses the rendered curve in drawing-local coordinates for a freehand eraser tap', () => {
    vi.stubGlobal('PIXI', { Rectangle: Bounds, Polygon: Path });
    vi.stubGlobal('game', { user: {} });
    vi.stubGlobal('foundry', {
        data: {
            PolygonShapeData: Path,
            RectangleShapeData: Bounds,
            EllipseShapeData: Bounds,
        },
    });
    const drawing = {
        visible: true,
        document: {
            _shape: new Path([0, 0, 20, 0, 40, 0]),
            canUserModify: () => true,
        },
        shape: {
            worldVisible: true,
            toLocal: ({ x, y }: { x: number; y: number }) => ({ x: x - 10, y }),
            geometry: {
                graphicsData: [
                    {
                        shape: new Path([0, 0, 20, 20, 40, 0]),
                        fillStyle: { visible: false },
                        lineStyle: { width: 2, visible: true },
                    },
                ],
            },
        },
    };
    const current = {
        drawings: { placeables: [drawing] },
        stage: { scale: { x: 1 } },
    } as unknown as foundry.canvas.Canvas;
    expect(findDrawingToErase(current, { x: 30, y: 20 })).toBe(drawing);
    expect(findDrawingToErase(current, { x: 30, y: 0 })).toBeUndefined();
});
