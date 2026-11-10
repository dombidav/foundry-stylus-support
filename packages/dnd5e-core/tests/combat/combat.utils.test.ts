import { type Combat } from '@client/documents/_module.mjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CombatUtils } from '../../src/index.ts';
import { createActor, stubFoundry } from '../fixtures.ts';

beforeEach(stubFoundry);

describe('combat context', () => {
    it('handles no selected combat and explicit null without falling back', () => {
        const actor = createActor();
        expect(CombatUtils.getActive()).toBeNull();
        expect(CombatUtils.getContext()).toBeNull();
        expect(CombatUtils.getCurrentCombatant()).toBeNull();
        expect(CombatUtils.getCurrentActor()).toBeNull();
        expect(CombatUtils.getRound()).toBeNull();
        expect(CombatUtils.getCombatantByActor(actor)).toBeNull();
        expect(CombatUtils.isActorInCombat(actor)).toBe(false);
        expect(CombatUtils.isActorsTurn(actor)).toBe(false);
        vi.stubGlobal('game', { combat: {} });
        expect(CombatUtils.getContext(null)).toBeNull();
    });

    it('preserves nullable round and turn fields in an unstarted combat', () => {
        const combat = {
            round: null,
            turn: null,
            started: false,
            combatant: undefined,
        } as unknown as Combat;
        expect(CombatUtils.getContext(combat)).toEqual({
            combat,
            round: null,
            turn: null,
            combatant: null,
        });
        expect(CombatUtils.isActorsTurn(createActor(), combat)).toBe(false);
    });

    it('distinguishes synthetic UUIDs and recognizes any token of a linked actor on its turn', () => {
        const actor = createActor();
        const synthetic = createActor();
        Object.assign(synthetic, { uuid: 'Scene.scene.Token.one.Actor.actor' });
        const wrong = { actor: synthetic };
        const first = { actor };
        const current = { actor };
        const combat = {
            round: 3,
            turn: 2,
            started: true,
            combatants: [{ actor: null }, wrong, first, current],
            combatant: current,
        } as unknown as Combat;
        vi.stubGlobal('game', { system: { id: 'dnd5e' }, combat });
        expect(CombatUtils.getActive()).toBe(combat);
        expect(CombatUtils.getCombatantByActor(actor)).toBe(first);
        expect(CombatUtils.getCombatantByActor(synthetic)).toBe(wrong);
        expect(CombatUtils.getCurrentActor()).toBe(actor);
        expect(CombatUtils.getCurrentCombatant()).toBe(current);
        expect(CombatUtils.isActorInCombat(actor)).toBe(true);
        expect(CombatUtils.isActorsTurn(actor)).toBe(true);
        expect(CombatUtils.isActorsTurn(synthetic)).toBe(false);
        expect(CombatUtils.getRound()).toBe(3);
    });
});
