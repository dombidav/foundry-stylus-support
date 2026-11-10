import { describe, expect, it } from 'vitest';
import { ResourceUtils } from '../../src/index.ts';
import { createActor } from '../fixtures.ts';

describe('prepared actor resources', () => {
    it('uses effective maximum HP and native missing HP, excluding temporary hit points', () => {
        const actor = createActor();
        expect(ResourceUtils.getHitPoints(actor)).toEqual({
            current: 8,
            max: 16,
            temporary: 5,
            temporaryMax: -4,
        });
        expect(ResourceUtils.getMissingHitPoints(actor)).toBe(8);
        expect(ResourceUtils.getExhaustion(actor)).toBe(2);
    });

    it('includes standard, pact, and custom pools while preserving their separate keys', () => {
        const actor = createActor();
        actor.system.spells = {
            spell0: { value: 0, max: 1, level: 0 },
            spell1: { value: 0, max: 4, level: 1 },
            pact: { value: 2, max: 2, level: 3 },
            custom: { value: 1, max: 1, level: 3 },
            empty: { value: 0, max: 0, level: 9 },
            unknown: { value: 0, max: 1 },
        };
        expect(ResourceUtils.getSpellSlots(actor)).toEqual([
            { key: 'spell1', value: 0, max: 4, level: 1 },
            { key: 'pact', value: 2, max: 2, level: 3 },
            { key: 'custom', value: 1, max: 1, level: 3 },
        ]);
        delete actor.system.spells;
        expect(ResourceUtils.getSpellSlots(actor)).toEqual([]);
    });

    it('returns numeric resources as snapshots, rejecting boolean pools and absent maxima', () => {
        const actor = createActor();
        expect(ResourceUtils.getResource(actor, 'primary')).toEqual({
            value: 2,
            max: 4,
            label: 'Focus',
        });
        actor.system.resources = {
            lair: { value: true },
            unset: { value: 0, max: null },
            invalid: { value: NaN, max: 3 },
            unlabeled: { value: 0, max: 2 },
        };
        expect(ResourceUtils.getResource(actor, 'lair')).toBeNull();
        expect(ResourceUtils.getResource(actor, 'unset')).toBeNull();
        expect(ResourceUtils.getResource(actor, 'invalid')).toBeNull();
        expect(ResourceUtils.getResource(actor, 'unlabeled')).toEqual({
            value: 0,
            max: 2,
        });
        expect(ResourceUtils.getResource(actor, 'toString')).toBeNull();
        expect(ResourceUtils.getResource(actor, '__proto__')).toBeNull();
        delete actor.system.resources;
        expect(ResourceUtils.getResource(actor, 'primary')).toBeNull();
    });

    it('checks positive finite costs against current resource amounts', () => {
        const actor = createActor();
        expect(ResourceUtils.hasAvailableResource(actor, 'primary')).toBe(true);
        expect(ResourceUtils.hasAvailableResource(actor, 'primary', 2)).toBe(
            true,
        );
        expect(ResourceUtils.hasAvailableResource(actor, 'primary', 3)).toBe(
            false,
        );
        expect(ResourceUtils.hasAvailableResource(actor, 'missing')).toBe(
            false,
        );
        for (const amount of [0, -1, NaN, Infinity]) {
            expect(
                ResourceUtils.hasAvailableResource(actor, 'primary', amount),
            ).toBe(false);
        }
    });
});
