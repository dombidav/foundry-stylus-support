import { type Scene } from '@client/documents/_module.mjs';

/**
 * Snapshot the active player scene, independently viewed scene, and canvas readiness.
 *
 * @example
 * const context: SceneContext = SceneUtils.getContext();
 */
export interface SceneContext {
    active: Scene | null;
    viewed: Scene | null;
    // boolean-name-exempt: Preserve the existing public scene context contract for consumers.
    canvasReady: boolean;
}
