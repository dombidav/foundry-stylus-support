import { type Combat, type Combatant } from '@client/documents/_module.mjs';
import { type Dnd5eActor } from '../actor/actor.types.js';
import { isDnd5eActor } from '../actor/actor.utils.ts';
import { type CombatContext } from './combat.types.js';

/**
 * Read Foundry's selected combat, including an encounter that has not started yet.
 *
 * @example
 * const combat = CombatUtils.getActive();
 */
export function getActive(): Combat | null {
    return game.combat;
}

/**
 * Snapshot the supplied or selected combat; explicit null suppresses fallback to the selected encounter.
 *
 * @example
 * const context = CombatUtils.getContext(combat);
 */
export function getContext(
    combat: Combat | null = getActive(),
): CombatContext | null {
    return combat
        ? {
              combat,
              combatant: combat.combatant ?? null,
              round: combat.round,
              turn: combat.turn,
          }
        : null;
}

/**
 * Read the supplied or selected encounter's current combatant, normalizing absence to null.
 *
 * @example
 * const combatant = CombatUtils.getCurrentCombatant();
 */
export function getCurrentCombatant(
    combat: Combat | null = getActive(),
): Combatant | null {
    return combat?.combatant ?? null;
}

/**
 * Read and narrow the current combatant's actor, preserving its synthetic document identity.
 *
 * @example
 * const actor = CombatUtils.getCurrentActor();
 */
export function getCurrentActor(
    combat: Combat | null = getActive(),
): Dnd5eActor | null {
    const actor = combat?.combatant?.actor;
    return isDnd5eActor(actor) ? actor : null;
}

/**
 * Find the first combatant with the actor's exact UUID so synthetic actors are not conflated with their world actor.
 *
 * @example
 * const combatant = CombatUtils.getCombatantByActor(actor, combat);
 */
export function getCombatantByActor(
    actor: Dnd5eActor,
    combat: Combat | null = getActive(),
): Combatant | null {
    if (!combat) return null;
    for (const combatant of combat.combatants) {
        if (combatant.actor?.uuid === actor.uuid) return combatant;
    }
    return null;
}

/**
 * Check actor membership by resolved UUID in the supplied or selected encounter.
 *
 * @example
 * const participating = CombatUtils.isActorInCombat(actor);
 */
export function isActorInCombat(
    actor: Dnd5eActor,
    combat: Combat | null = getActive(),
): boolean {
    return getCombatantByActor(actor, combat) !== null;
}

/**
 * Check the actual current combatant in a started encounter, including multiple linked tokens for one actor.
 *
 * @example
 * const actingNow = CombatUtils.isActorsTurn(actor);
 */
export function isActorsTurn(
    actor: Dnd5eActor,
    combat: Combat | null = getActive(),
): boolean {
    return (
        combat?.started === true && combat.combatant?.actor?.uuid === actor.uuid
    );
}

/**
 * Read the native round value from the supplied or selected encounter, preserving missing state as null.
 *
 * @example
 * const round = CombatUtils.getRound();
 */
export function getRound(combat: Combat | null = getActive()): number | null {
    return combat?.round ?? null;
}
