import { describe, expect, it } from 'vitest';
import { EffectUtils } from '../../src/index.ts';
import { createActor, createEffect } from '../fixtures.ts';

describe('effects and conditions', () => {
    it('reads prepared statuses without reimplementing derived condition rules', () => {
        const actor = createActor();
        actor.statuses.add('incapacitated');
        expect(EffectUtils.hasCondition(actor, 'incapacitated')).toBe(true);
        expect(EffectUtils.hasCondition(actor, 'custom-condition')).toBe(false);
        expect(EffectUtils.isIncapacitated(actor)).toBe(true);
        actor.statuses.delete('incapacitated');
        expect(EffectUtils.isIncapacitated(actor)).toBe(false);
    });

    it('includes transferred effects but excludes inactive effects from active condition queries', () => {
        const actor = createActor();
        const transferred = createEffect(
            'transferred',
            ['paralyzed', 'incapacitated'],
            true,
            'Item.source',
        );
        const suppressed = createEffect(
            'suppressed',
            ['blinded'],
            false,
            'Item.source',
        );
        const duplicate = createEffect('second-source', ['incapacitated']);
        const plain = createEffect('plain');
        actor.allApplicableEffects = function* () {
            yield* [transferred, suppressed, duplicate, plain];
        };
        expect(EffectUtils.getConditions(actor)).toEqual([
            { id: 'paralyzed', effect: transferred },
            { id: 'incapacitated', effect: transferred },
            { id: 'incapacitated', effect: duplicate },
        ]);
        expect(EffectUtils.hasEffect(actor, 'transferred')).toBe(true);
        expect(EffectUtils.hasEffect(actor, 'suppressed')).toBe(false);
        expect(EffectUtils.hasEffect(actor, 'plain')).toBe(true);
        expect(EffectUtils.hasEffect(actor, 'missing')).toBe(false);
        expect(EffectUtils.getByOrigin(actor, 'Item.source')).toEqual([
            transferred,
            suppressed,
        ]);
        expect(EffectUtils.getByOrigin(actor, 'missing')).toEqual([]);
    });
});
