import { type Dnd5eActor, type Dnd5eCreature } from '../actor/actor.types.js';
import {
    type HitPointState,
    type ResourceState,
    type SpellSlotState,
} from './resource.types.js';

/**
 * Copy prepared creature HP with effectiveMax as max; do not add temporaryMax to the snapshot again.
 *
 * @example
 * const hp = ResourceUtils.getHitPoints(actor);
 */
export function getHitPoints(actor: Dnd5eCreature): HitPointState {
    const hp = actor.system.attributes.hp;
    return {
        current: hp.value,
        max: hp.effectiveMax,
        temporary: hp.temp,
        temporaryMax: hp.tempmax,
    };
}

/**
 * Read the system-prepared HP deficit, including temporary maximum changes but excluding temporary HP.
 *
 * @example
 * const missing = ResourceUtils.getMissingHitPoints(actor);
 */
export function getMissingHitPoints(actor: Dnd5eCreature): number {
    return actor.system.attributes.hp.damage;
}

/**
 * Snapshot positive-capacity leveled slot pools, including depleted, pact, and custom pools with distinct keys.
 *
 * @example
 * const slots = ResourceUtils.getSpellSlots(actor);
 */
export function getSpellSlots(actor: Dnd5eActor): SpellSlotState[] {
    const result: SpellSlotState[] = [];
    for (const [key, slot] of Object.entries(actor.system.spells ?? {})) {
        const level = slot.level;
        if (
            slot.max <= 0 ||
            typeof level !== 'number' ||
            !Number.isInteger(level) ||
            level <= 0
        )
            continue;
        result.push({ key, level, value: slot.value, max: slot.max });
    }
    return result;
}

/**
 * Read the creature's prepared exhaustion level without inspecting or modifying exhaustion effects.
 *
 * @example
 * const exhaustion = ResourceUtils.getExhaustion(actor);
 */
export function getExhaustion(actor: Dnd5eCreature): number {
    return actor.system.attributes.exhaustion;
}

/**
 * Snapshot a direct finite numeric resource pool, rejecting boolean pools, unset maxima, and inherited keys.
 *
 * @example
 * const focus = ResourceUtils.getResource(actor, 'primary');
 */
export function getResource(
    actor: Dnd5eActor,
    key: string,
): ResourceState | null {
    const resources = actor.system.resources;
    if (!resources || !Object.hasOwn(resources, key)) return null;
    const resource = resources[key];
    if (
        !resource ||
        typeof resource.value !== 'number' ||
        typeof resource.max !== 'number' ||
        !Number.isFinite(resource.value) ||
        !Number.isFinite(resource.max)
    )
        return null;
    return {
        value: resource.value,
        max: resource.max,
        ...(resource.label === undefined ? {} : { label: resource.label }),
    };
}

/**
 * Check a positive finite resource cost without spending the pool or allocating a resource snapshot.
 *
 * @example
 * const enough = ResourceUtils.hasAvailableResource(actor, 'primary', 2);
 */
export function hasAvailableResource(
    actor: Dnd5eActor,
    key: string,
    amount = 1,
): boolean {
    if (!Number.isFinite(amount) || amount <= 0) return false;
    const resources = actor.system.resources;
    if (!resources || !Object.hasOwn(resources, key)) return false;
    const resource = resources[key];
    // Repeat the numeric validation rather than allocate a snapshot for a boolean
    // query. The accepted trade-off is this small duplication of getResource checks.
    return (
        resource != null &&
        typeof resource.value === 'number' &&
        typeof resource.max === 'number' &&
        Number.isFinite(resource.value) &&
        Number.isFinite(resource.max) &&
        resource.value >= amount
    );
}
