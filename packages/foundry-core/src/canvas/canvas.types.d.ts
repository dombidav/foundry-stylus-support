import { type Point } from '@common/_types.mjs';

/**
 * A point in stage/world pixels, rather than client-screen pixels or grid offsets.
 *
 * @example
 * const position: CanvasPosition = { x: 100, y: 200 };
 */
export type CanvasPosition = Point;
