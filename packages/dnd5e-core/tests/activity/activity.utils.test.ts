import { type Dnd5eItem, type Dnd5eActivity } from '../../src/index.ts';
import { describe, expect, it, vi } from 'vitest';
import { ActivityUtils } from '../../src/index.ts';

describe('activities', () => {
    it('handles item types without activities', () => {
        const item = { system: {} } as Dnd5eItem;
        expect(ActivityUtils.getAll(item)).toEqual([]);
        expect(ActivityUtils.getById(item, 'missing')).toBeNull();
        expect(ActivityUtils.getByType(item, 'attack')).toEqual([]);
        expect(ActivityUtils.hasType(item, 'attack')).toBe(false);
    });

    it('uses collection lookup and its type index, including custom activity types', () => {
        const attack = { id: 'attack', type: 'attack' } as Dnd5eActivity;
        const custom = { id: 'custom', type: 'custom-type' } as Dnd5eActivity;
        const entries = [attack, custom];
        const get = vi.fn((id: string) =>
            entries.find((activity) => activity.id === id),
        );
        const getByType = vi.fn((type: string) =>
            entries.filter((activity) => activity.type === type),
        );
        const item = {
            system: {
                activities: {
                    get,
                    getByType,
                    some: entries.some.bind(entries),
                    [Symbol.iterator]: () => entries[Symbol.iterator](),
                },
            },
        } as unknown as Dnd5eItem;
        expect(ActivityUtils.getAll(item)).toEqual(entries);
        expect(ActivityUtils.getAll(item)).not.toBe(entries);
        expect(ActivityUtils.getById(item, 'attack')).toBe(attack);
        expect(ActivityUtils.getById(item, 'missing')).toBeNull();
        expect(ActivityUtils.getByType(item, 'custom-type')).toEqual([custom]);
        expect(getByType).toHaveBeenCalledExactlyOnceWith('custom-type');
        expect(ActivityUtils.hasType(item, 'attack')).toBe(true);
        expect(ActivityUtils.hasType(item, 'save')).toBe(false);
    });
});
