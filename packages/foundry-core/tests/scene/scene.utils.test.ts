import { type Actor, type Scene } from '@client/documents/_module.mjs';
import { describe, expect, it, vi } from 'vitest';
import { SceneUtils } from '../../src/index.ts';

describe('scene semantics', () => {
    it('distinguishes the active player scene from the GM viewed scene', () => {
        const active = { id: 'players' };
        const viewed = { id: 'gm' };
        vi.stubGlobal('game', { scenes: { active, viewed } });
        vi.stubGlobal('canvas', { ready: true });
        expect(SceneUtils.getContext()).toEqual({
            active,
            viewed,
            canvasReady: true,
        });
    });

    it('supports document access with disabled canvas and outside a game', () => {
        const active = { id: 'players' };
        vi.stubGlobal('game', { scenes: { active } });
        vi.stubGlobal('canvas', null);
        expect(SceneUtils.getContext()).toEqual({
            active,
            viewed: null,
            canvasReady: false,
        });
        vi.stubGlobal('game', undefined);
        expect(SceneUtils.getContext()).toEqual({
            active: null,
            viewed: null,
            canvasReady: false,
        });
    });

    it('finds world actor ID references without resolving synthetic actors or requiring rendering', () => {
        const tokens = [
            { actorId: 'actor', actorLink: true },
            { actorId: 'actor', actorLink: false },
            { actorId: 'other' },
        ];
        const scene = { tokens } as unknown as Scene;
        expect(SceneUtils.getTokensByActor(scene, 'actor')).toEqual(
            tokens.slice(0, 2),
        );
        const actor = { id: 'actor', isToken: false } as Actor;
        expect(SceneUtils.getTokensByActor(scene, actor)).toEqual(
            tokens.slice(0, 2),
        );
    });

    it('returns only the exact token for a synthetic actor', () => {
        const scene = {} as Scene;
        const token = { parent: scene };
        const actor = { isToken: true, token } as unknown as Actor;
        expect(SceneUtils.getTokensByActor(scene, actor)).toEqual([token]);
        expect(SceneUtils.getTokensByActor({} as Scene, actor)).toEqual([]);
    });
});
