import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActorUtils } from '../../src/index.ts';
import { createActor, createUser, stubFoundry } from '../fixtures.ts';

beforeEach(stubFoundry);

describe('actor identification and resolution', () => {
    it('requires both a D&D 5e world and the configured actor implementation', () => {
        const actor = createActor();
        expect(ActorUtils.isDnd5eActor(actor)).toBe(true);
        expect(ActorUtils.isDnd5eActor({ type: 'character' })).toBe(false);
        expect(ActorUtils.isDnd5eActor(null)).toBe(false);
        expect(ActorUtils.isDnd5eActor(undefined)).toBe(false);
        vi.stubGlobal('game', { system: { id: 'pf2e' } });
        expect(ActorUtils.isDnd5eActor(actor)).toBe(false);
    });

    it('narrows characters and NPCs without treating other actor types as creatures', () => {
        const actor = createActor();
        expect(ActorUtils.isCharacter(actor)).toBe(true);
        expect(ActorUtils.isNpc(actor)).toBe(false);
        Object.assign(actor, { type: 'npc' });
        expect(ActorUtils.isNpc(actor)).toBe(true);
        expect(ActorUtils.isCharacter(actor)).toBe(false);
        Object.assign(actor, { type: 'vehicle' });
        expect(ActorUtils.isDnd5eActor(actor)).toBe(true);
        expect(ActorUtils.isNpc(actor)).toBe(false);
    });

    it.each([
        'Actor.actor',
        'Scene.scene.Token.token.Actor.actor',
        'Compendium.pack.actors.Actor.actor',
    ])(
        'delegates UUID %s to Foundry and validates its result',
        async (uuid) => {
            const actor = createActor();
            const resolver = vi
                .fn()
                .mockResolvedValueOnce(actor)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({ documentName: 'Item' });
            vi.stubGlobal('fromUuid', resolver);
            expect(await ActorUtils.getByUuid(uuid)).toBe(actor);
            expect(resolver).toHaveBeenCalledWith(uuid);
            expect(await ActorUtils.getByUuid(uuid)).toBeNull();
            expect(await ActorUtils.getByUuid(uuid)).toBeNull();
        },
    );

    it('propagates resolver errors', async () => {
        vi.stubGlobal(
            'fromUuid',
            vi.fn().mockRejectedValue(new Error('Resolution failed')),
        );
        await expect(ActorUtils.getByUuid('invalid')).rejects.toThrow(
            'Resolution failed',
        );
    });

    it('reads assigned characters from explicit users or the current user', () => {
        const actor = createActor();
        const user = createUser('player', actor);
        expect(ActorUtils.getActiveCharacter(user)).toBe(actor);
        expect(ActorUtils.getActiveCharacter()).toBeNull();
        vi.stubGlobal('game', { system: { id: 'dnd5e' }, user });
        expect(ActorUtils.getActiveCharacter()).toBe(actor);
        Object.assign(actor, { type: 'npc' });
        expect(ActorUtils.getActiveCharacter()).toBeNull();
    });
});
