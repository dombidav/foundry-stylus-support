import { type Canvas } from '@client/canvas/_module.mjs';
import { type Token } from '@client/canvas/placeables/_module.mjs';
import { type Scene } from '@client/documents/_module.mjs';
import { type CanvasPosition } from './canvas.types.js';

/**
 * Read the ready native canvas, normalizing missing or inactive canvas state to null.
 *
 * @example
 * const current = readyCanvas();
 */
function readyCanvas(): Canvas | null {
    return typeof canvas !== 'undefined' && canvas?.ready ? canvas : null;
}

/**
 * Check whether canvas-dependent operations can run without accessing an unavailable canvas.
 *
 * @example
 * if (CanvasUtils.isReady()) enableCanvasActions();
 */
export function isReady(): boolean {
    return readyCanvas() !== null;
}

/**
 * Read the rendered scene only when its canvas is ready; otherwise use null.
 *
 * @example
 * const scene = CanvasUtils.getScene();
 */
export function getScene(): Scene | null {
    return readyCanvas()?.scene ?? null;
}

/**
 * Copy selected placeables into a snapshot without exposing the layer's mutable array.
 *
 * @example
 * const selected = CanvasUtils.getControlledTokens();
 */
export function getControlledTokens(): Token[] {
    const current = readyCanvas();
    return current ? [...current.tokens.controlled] : [];
}

/**
 * Read the hovered token placeable, or null when no token or ready canvas exists.
 *
 * @example
 * const token = CanvasUtils.getHoveredToken();
 */
export function getHoveredToken(): Token | null {
    return readyCanvas()?.tokens.hover ?? null;
}

/**
 * Transform the renderer screen center into world pixels using the native PIXI stage transform.
 *
 * @example
 * const center = CanvasUtils.getViewCenter();
 */
export function getViewCenter(): CanvasPosition | null {
    const current = readyCanvas();
    if (!current) return null;
    const [width, height] = current.screenDimensions;
    const point = current.stage.toLocal({ x: width / 2, y: height / 2 });
    return { x: point.x, y: point.y };
}

/**
 * Copy the stage mouse position into an owned world-pixel point when canvas is ready.
 *
 * @example
 * const pointer = CanvasUtils.getMousePosition();
 */
export function getMousePosition(): CanvasPosition | null {
    const current = readyCanvas();
    return current
        ? { x: current.mousePosition.x, y: current.mousePosition.y }
        : null;
}

/**
 * Pan immediately to finite world coordinates and optional positive scale; unavailable canvas yields false.
 *
 * @example
 * CanvasUtils.panTo({ x: 1200, y: 800 }, 1.5);
 */
// boolean-name-exempt: Preserve the existing public canvas action name for consumers.
export function panTo(position: CanvasPosition, scale?: number): boolean {
    const current = readyCanvas();
    if (!current) return false;
    if (
        !Number.isFinite(position.x) ||
        !Number.isFinite(position.y) ||
        (scale !== undefined && (!Number.isFinite(scale) || scale <= 0))
    ) {
        throw new RangeError(
            'Pan coordinates must be finite and scale must be positive.',
        );
    }
    current.pan({ ...position, scale });
    return true;
}
