import { type ActiveEffect } from '@client/documents/_module.mjs';
import { type Dnd5eActor } from '../actor/actor.types.js';
import {
    type ActiveCondition,
    type ConditionIdentifier,
} from './effect.types.js';

/**
 * Check the actor's prepared native status set without recalculating condition implications or immunities.
 *
 * @example
 * const poisoned = EffectUtils.hasCondition(actor, 'poisoned');
 */
export function hasCondition(
    actor: Dnd5eActor,
    condition: ConditionIdentifier,
): boolean {
    return actor.statuses.has(condition);
}

/**
 * List active condition sources, including applicable item transfers, while excluding disabled or suppressed effects.
 *
 * @example
 * const conditions = EffectUtils.getConditions(actor);
 */
export function getConditions(actor: Dnd5eActor): ActiveCondition[] {
    const conditions: ActiveCondition[] = [];
    for (const effect of actor.allApplicableEffects()) {
        if (!effect.active) continue;
        for (const id of effect.statuses) conditions.push({ id, effect });
    }
    return conditions;
}

/**
 * Search active applicable effects by embedded ID, rather than by display name or UUID.
 *
 * @example
 * const active = EffectUtils.hasEffect(actor, effect.id);
 */
export function hasEffect(actor: Dnd5eActor, effectId: string): boolean {
    for (const effect of actor.allApplicableEffects()) {
        if (effect.id === effectId && effect.active) return true;
    }
    return false;
}

/**
 * Find applicable effects from an exact native origin, including inactive effects for provenance inspection.
 *
 * @example
 * const effects = EffectUtils.getByOrigin(actor, item.uuid);
 */
export function getByOrigin(actor: Dnd5eActor, origin: string): ActiveEffect[] {
    const effects: ActiveEffect[] = [];
    for (const effect of actor.allApplicableEffects()) {
        if (effect.origin === origin) effects.push(effect);
    }
    return effects;
}

/**
 * Read the prepared incapacitated status, letting D&D 5e supply derived condition implications.
 *
 * @example
 * if (EffectUtils.isIncapacitated(actor)) disableActionControls();
 */
export function isIncapacitated(actor: Dnd5eActor): boolean {
    return actor.statuses.has('incapacitated');
}
