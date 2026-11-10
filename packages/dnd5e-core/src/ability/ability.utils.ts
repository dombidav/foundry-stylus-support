import { type Dnd5eCreature } from '../actor/actor.types.js';
import { type AbilityKey, type SkillKey } from './ability.types.js';

/**
 * Read a creature's prepared ability score without recalculating or updating it.
 *
 * @example
 * const strength = AbilityUtils.getScore(actor, 'str');
 */
export function getScore(actor: Dnd5eCreature, ability: AbilityKey): number {
    return actor.system.abilities[ability].value;
}

/**
 * Read the system's prepared ability modifier, preserving active system and module adjustments.
 *
 * @example
 * const modifier = AbilityUtils.getModifier(actor, 'dex');
 */
export function getModifier(actor: Dnd5eCreature, ability: AbilityKey): number {
    return actor.system.abilities[ability].mod;
}

/**
 * Read the prepared saving throw modifier from the native nested save.value field.
 *
 * @example
 * const bonus = AbilityUtils.getSaveModifier(actor, 'con');
 */
export function getSaveModifier(
    actor: Dnd5eCreature,
    ability: AbilityKey,
): number {
    return actor.system.abilities[ability].save.value;
}

/**
 * Read a skill's prepared total rather than its proficiency multiplier or a recalculated bonus.
 *
 * @example
 * const bonus = AbilityUtils.getSkillModifier(actor, 'ste');
 */
export function getSkillModifier(
    actor: Dnd5eCreature,
    skill: SkillKey,
): number {
    return actor.system.skills[skill].total;
}

/**
 * Read the system's prepared passive skill score, including configured modifiers.
 *
 * @example
 * const passive = AbilityUtils.getPassiveSkill(actor, 'prc');
 */
export function getPassiveSkill(actor: Dnd5eCreature, skill: SkillKey): number {
    return actor.system.skills[skill].passive;
}

/**
 * Read the creature's prepared proficiency bonus without deriving it from level or challenge rating.
 *
 * @example
 * const proficiency = AbilityUtils.getProficiencyBonus(actor);
 */
export function getProficiencyBonus(actor: Dnd5eCreature): number {
    return actor.system.attributes.prof;
}
