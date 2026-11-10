import {
    type Actor,
    type Scene,
    type TokenDocument,
} from '@client/documents/_module.mjs';
import { isReady } from '../canvas/canvas.utils.ts';
import { type SceneContext } from './scene.types.js';

/**
 * Read active and viewed scene documents separately, including worlds with disabled or unavailable canvas.
 *
 * @example
 * const { active, viewed, canvasReady } = SceneUtils.getContext();
 */
export function getContext(): SceneContext {
    const scenes = typeof game === 'undefined' ? undefined : game.scenes;
    return {
        active: scenes?.active ?? null,
        viewed: scenes?.viewed ?? null,
        canvasReady: isReady(),
    };
}

/**
 * Find world actor references or a synthetic actor's exact token in an explicit scene without rendering it.
 *
 * @example
 * const tokens = SceneUtils.getTokensByActor(scene, actor);
 */
export function getTokensByActor(
    scene: Scene,
    actor: Actor | string,
): TokenDocument[] {
    if (typeof actor !== 'string' && actor.isToken) {
        const token = actor.token;
        return token?.parent === scene ? [token] : [];
    }
    const id = typeof actor === 'string' ? actor : actor.id;
    return scene.tokens.filter((token) => token.actorId === id);
}
