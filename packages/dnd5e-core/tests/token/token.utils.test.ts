import { type Scene, type TokenDocument } from '@client/documents/_module.mjs';
import { type Token } from '@client/canvas/placeables/_module.mjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TokenUtils } from '../../src/index.ts';
import { createActor, stubFoundry } from '../fixtures.ts';

beforeEach(stubFoundry);

describe('tokens', () => {
    it('resolves documents and rendered tokens, including missing actors', () => {
        const actor = createActor();
        expect(TokenUtils.getActor({ actor } as unknown as TokenDocument)).toBe(
            actor,
        );
        expect(TokenUtils.getActor({ actor } as unknown as Token)).toBe(actor);
        expect(
            TokenUtils.getActor({ actor: null } as TokenDocument),
        ).toBeNull();
    });

    it('uses the native active-token lookup by default', () => {
        const actor = createActor();
        TokenUtils.getTokens(actor);
        expect(actor.getActiveTokens).toHaveBeenCalledExactlyOnceWith(
            false,
            true,
        );
    });

    it('finds linked and unlinked world actor references in an explicit unrendered scene', () => {
        const actor = createActor();
        const tokens = [
            { actorId: 'actor', actorLink: true },
            { actorId: 'actor', actorLink: false },
            { actorId: 'other' },
        ];
        const scene = { tokens } as unknown as Scene;
        expect(TokenUtils.getTokens(actor, scene)).toEqual(tokens.slice(0, 2));
    });

    it('returns only the exact token for a synthetic actor', () => {
        const actor = createActor();
        const scene = {
            tokens: [{ actorId: 'actor' }, { actorId: 'actor' }],
        } as unknown as Scene;
        const token = { parent: scene, actorId: 'actor' };
        Object.assign(actor, { isToken: true, token });
        expect(TokenUtils.getTokens(actor, scene)).toEqual([token]);
        expect(TokenUtils.getTokens(actor, {} as Scene)).toEqual([]);
    });

    it('returns an empty selection when the canvas is unavailable or not ready', () => {
        expect(TokenUtils.getControlled()).toEqual([]);
        vi.stubGlobal('canvas', { ready: false });
        expect(TokenUtils.getControlledActors()).toEqual([]);
    });

    it('copies selected tokens and deduplicates actors by UUID, preserving synthetic identities', () => {
        const actor = createActor();
        const synthetic = createActor();
        Object.assign(synthetic, {
            uuid: 'Scene.scene.Token.token.Actor.actor',
        });
        const controlled = [
            { actor },
            { actor },
            { actor: synthetic },
            { actor: null },
        ];
        vi.stubGlobal('canvas', { ready: true, tokens: { controlled } });
        expect(TokenUtils.getControlled()).not.toBe(controlled);
        expect(TokenUtils.getControlledActors()).toEqual([actor, synthetic]);
        expect(controlled).toHaveLength(4);
    });
});
