import { type Dnd5eCreature } from '../actor/actor.types.js';

/**
 * Built-in D&D 5e ability identifiers used to index prepared creature ability data.
 *
 * @example
 * const ability: AbilityKey = 'dex';
 */
export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
/**
 * Built-in D&D 5e skill identifiers used to read prepared skill totals and passive scores.
 *
 * @example
 * const skill: SkillKey = 'prc';
 */
export type SkillKey =
    | 'acr'
    | 'ani'
    | 'arc'
    | 'ath'
    | 'dec'
    | 'his'
    | 'ins'
    | 'itm'
    | 'inv'
    | 'med'
    | 'nat'
    | 'prc'
    | 'prf'
    | 'per'
    | 'rel'
    | 'slt'
    | 'ste'
    | 'sur';
/**
 * Standard D&D proficiency multipliers for untrained, half-proficient, proficient, and expertise values.
 *
 * @example
 * const expertise: ProficiencyLevel = 2;
 */
export type ProficiencyLevel = 0 | 0.5 | 1 | 2;

/**
 * Minimal prepared native ability fields, including the system's mod and nested save.value.
 *
 * @example
 * const strength: AbilityScoreData = actor.system.abilities.str;
 */
export interface AbilityScoreData {
    value: number;
    mod: number;
    save: { value: number };
    proficient: ProficiencyLevel;
}
/**
 * Prepared skill total and passive score, already including system and module adjustments.
 *
 * @example
 * const perception: SkillData = actor.system.skills.prc;
 */
export interface SkillData {
    total: number;
    passive: number;
}
/**
 * Carry a creature, built-in skill, and optional advantage intent without performing a roll.
 *
 * @example
 * const context: SkillCheckContext = { actor, skill: 'ste', advantage: true };
 */
export interface SkillCheckContext {
    actor: Dnd5eCreature;
    skill: SkillKey;
    // boolean-name-exempt: Native D&D roll option name.
    advantage?: boolean;
    // boolean-name-exempt: Native D&D roll option name.
    disadvantage?: boolean;
}
