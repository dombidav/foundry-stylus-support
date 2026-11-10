import { describe, expect, it } from 'vitest';
import { AbilityUtils } from '../../src/index.ts';
import { createActor } from '../fixtures.ts';

describe('prepared abilities and skills', () => {
    it('uses prepared system modifiers, bonuses, and passive values without recalculating rules', () => {
        const actor = createActor();
        // Deliberately differs from floor((score - 10) / 2): prepared data is authoritative.
        expect(AbilityUtils.getScore(actor, 'str')).toBe(11);
        expect(AbilityUtils.getModifier(actor, 'str')).toBe(7);
        expect(AbilityUtils.getSaveModifier(actor, 'str')).toBe(12);
        expect(AbilityUtils.getSkillModifier(actor, 'prc')).toBe(9);
        expect(AbilityUtils.getPassiveSkill(actor, 'prc')).toBe(24);
        expect(AbilityUtils.getProficiencyBonus(actor)).toBe(4);
    });
});
