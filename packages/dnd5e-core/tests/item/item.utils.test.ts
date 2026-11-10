import { type Dnd5eItem } from '../../src/index.ts';
import { describe, expect, it, vi } from 'vitest';
import { ItemUtils } from '../../src/index.ts';
import { createActor } from '../fixtures.ts';

describe('items', () => {
    it('uses the native identifier index and handles duplicates or missing identifiers', () => {
        const actor = createActor();
        const first = { id: 'one' } as Dnd5eItem;
        const second = { id: 'two' } as Dnd5eItem;
        const get = vi.fn((key: string) =>
            key === 'spell:shield' ? new Set([first, second]) : undefined,
        );
        Object.assign(actor, { identifiedItems: { get } });
        expect(ItemUtils.getByIdentifier(actor, 'spell:shield')).toBe(first);
        expect(ItemUtils.hasItem(actor, 'spell:shield')).toBe(true);
        expect(ItemUtils.getByIdentifier(actor, 'missing')).toBeNull();
        expect(ItemUtils.hasItem(actor, 'missing')).toBe(false);
        expect(get).toHaveBeenCalledWith('spell:shield');
    });

    it('distinguishes equipped items, actual attunement, and item types', () => {
        const actor = createActor();
        const equipped = {
            type: 'weapon',
            system: { equipped: true, attunement: 'required', attuned: false },
        };
        const attuned = {
            type: 'equipment',
            system: { equipped: false, attunement: 'optional', attuned: true },
        };
        const spell = { type: 'spell', system: {} };
        Object.assign(actor, { items: [equipped, attuned, spell] });
        expect(ItemUtils.getEquipped(actor)).toEqual([equipped]);
        expect(ItemUtils.getAttuned(actor)).toEqual([attuned]);
        expect(ItemUtils.getByType(actor, 'spell')).toEqual([spell]);
    });
});
