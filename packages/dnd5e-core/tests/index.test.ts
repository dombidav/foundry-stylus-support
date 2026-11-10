import { type Actor, type Item } from '@client/documents/_module.mjs';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
    type Dnd5eActor,
    type Dnd5eCharacter,
    type Dnd5eItem,
    type Dnd5eToken,
} from '../src/index.ts';
import { type Token } from '@client/canvas/placeables/_module.mjs';

describe('public API', () => {
    it('imports without Foundry globals or automatic initialization', async () => {
        vi.resetModules();
        for (const name of [
            'game',
            'Actor',
            'canvas',
            'Hooks',
            'foundry',
            'CONFIG',
        ]) {
            vi.stubGlobal(name, undefined);
        }
        const api = await import('../src/index.ts');
        expect(Object.keys(api).sort()).toEqual([
            'AbilityUtils',
            'ActivityUtils',
            'ActorUtils',
            'CombatUtils',
            'EffectUtils',
            'ItemUtils',
            'PermissionUtils',
            'ResourceUtils',
            'TokenUtils',
        ]);
        expect(api.ActorUtils.isDnd5eActor(null)).toBe(false);
    });

    it('retains native document compatibility and prepared creature narrowing', () => {
        expectTypeOf<Dnd5eActor>().toExtend<Actor>();
        expectTypeOf<Dnd5eItem>().toExtend<Item>();
        expectTypeOf<Dnd5eToken>().toExtend<Token>();
        expectTypeOf<Dnd5eCharacter>().toExtend<Dnd5eActor>();
        expectTypeOf<
            Dnd5eCharacter['system']['attributes']['hp']['effectiveMax']
        >().toEqualTypeOf<number>();
    });
});
