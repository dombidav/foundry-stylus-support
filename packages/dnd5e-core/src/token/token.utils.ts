import { type Token } from '@client/canvas/placeables/_module.mjs';
import { type TokenDocument, type Scene } from '@client/documents/_module.mjs';
import { type Dnd5eActor } from '../actor/actor.types.js';
import { isDnd5eActor } from '../actor/actor.utils.ts';

/**
 * Read a token placeable or token document's actor and validate it as a D&D 5e actor.
 *
 * @example
 * const actor = TokenUtils.getActor(token);
 */
export function getActor(token: Token | TokenDocument): Dnd5eActor | null {
    const actor = token.actor;
    return isDnd5eActor(actor) ? actor : null;
}

/**
 * Use native current-canvas lookup or explicit-scene actor references, preserving exact synthetic token identity.
 *
 * @example
 * const tokens = TokenUtils.getTokens(actor, scene);
 */
export function getTokens(actor: Dnd5eActor, scene?: Scene): TokenDocument[] {
    if (!scene) return actor.getActiveTokens(false, true);
    if (actor.isToken) {
        const token = actor.token;
        return token?.parent === scene ? [token] : [];
    }
    return scene.tokens.filter((token) => token.actorId === actor.id);
}

/**
 * Copy selected token placeables without exposing the native layer array or requiring an active canvas.
 *
 * @example
 * const selected = TokenUtils.getControlled();
 */
export function getControlled(): Token[] {
    return typeof canvas !== 'undefined' && canvas?.ready
        ? [...canvas.tokens.controlled]
        : [];
}

/**
 * Collect selected D&D actors once per UUID while preserving distinct synthetic actors sharing a world ID.
 *
 * @example
 * const actors = TokenUtils.getControlledActors();
 */
export function getControlledActors(): Dnd5eActor[] {
    const actors: Dnd5eActor[] = [];
    if (typeof canvas === 'undefined' || !canvas?.ready) return actors;
    const seen = new Set<string>();
    // Read the layer directly to avoid a temporary token snapshot. The small
    // readiness check is repeated intentionally; this function only returns actors.
    for (const token of canvas.tokens.controlled) {
        const actor = getActor(token);
        if (!actor || seen.has(actor.uuid)) continue;
        seen.add(actor.uuid);
        actors.push(actor);
    }
    return actors;
}
