import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionUtils } from '../../src/index.ts';
import { createActor, createUser, stubFoundry } from '../fixtures.ts';

beforeEach(stubFoundry);

describe('actor permissions', () => {
    it('delegates ownership and observation to native document permission evaluation', () => {
        const actor = createActor();
        const user = createUser();
        const hasPermission = vi.fn(() => true);
        actor.testUserPermission = hasPermission;
        expect(PermissionUtils.canControl(user, actor)).toBe(true);
        expect(PermissionUtils.canObserve(user, actor)).toBe(true);
        expect(hasPermission.mock.calls).toEqual([
            [user, 'OWNER'],
            [user, 'OBSERVER'],
        ]);
    });

    it.each(['owner', 'observer', 'limited', 'none'] as const)(
        'reports the highest effective permission: %s',
        (relation) => {
            const actor = createActor();
            actor.testUserPermission = vi.fn(
                (_user, permission) => permission === relation.toUpperCase(),
            );
            expect(PermissionUtils.getUserRelation(createUser(), actor)).toBe(
                relation,
            );
        },
    );

    it('includes GMs and offline owners returned by native permissions', () => {
        const actor = createActor();
        const gm = createUser('gm');
        const owner = createUser('offline-owner');
        const observer = createUser('observer');
        const users = [gm, owner, observer];
        actor.testUserPermission = vi.fn(
            (user, permission) =>
                permission === 'OWNER' && (user === gm || user === owner),
        );
        vi.stubGlobal('game', { users, user: owner });
        expect(PermissionUtils.getOwners(actor)).toEqual([gm, owner]);
        expect(PermissionUtils.isOwnedByCurrentUser(actor)).toBe(true);
    });

    it('requires both the character type and a native player owner', () => {
        const actor = createActor();
        expect(PermissionUtils.isPlayerCharacter(actor)).toBe(false);
        Object.assign(actor, { hasPlayerOwner: true });
        expect(PermissionUtils.isPlayerCharacter(actor)).toBe(true);
        Object.assign(actor, { type: 'npc' });
        expect(PermissionUtils.isPlayerCharacter(actor)).toBe(false);
    });
});
