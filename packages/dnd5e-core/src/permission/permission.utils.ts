import { type User } from '@client/documents/_module.mjs';
import { type Dnd5eActor } from '../actor/actor.types.js';
import { type ActorUserRelation } from './permission.types.js';

/**
 * Delegate actor owner permission to Foundry; canvas visibility and token-control restrictions remain separate.
 *
 * @example
 * const allowed = PermissionUtils.canControl(game.user, actor);
 */
export function canControl(user: User, actor: Dnd5eActor): boolean {
    return actor.testUserPermission(user, 'OWNER');
}

/**
 * Delegate observer-or-higher actor access to native document permission evaluation.
 *
 * @example
 * const visible = PermissionUtils.canObserve(user, actor);
 */
export function canObserve(user: User, actor: Dnd5eActor): boolean {
    return actor.testUserPermission(user, 'OBSERVER');
}

/**
 * Collect all users considered owners by Foundry, including GMs and offline owners.
 *
 * @example
 * const owners = PermissionUtils.getOwners(actor);
 */
export function getOwners(actor: Dnd5eActor): User[] {
    return game.users.filter((user) => canControl(user, actor));
}

/**
 * Determine the highest effective owner, observer, limited, or none permission tier for an actor.
 *
 * @example
 * const relation = PermissionUtils.getUserRelation(user, actor);
 */
export function getUserRelation(
    user: User,
    actor: Dnd5eActor,
): ActorUserRelation {
    if (canControl(user, actor)) return 'owner';
    if (canObserve(user, actor)) return 'observer';
    return actor.testUserPermission(user, 'LIMITED') ? 'limited' : 'none';
}

/**
 * Require both character type and Foundry's native player-owner flag.
 *
 * @example
 * const playerCharacter = PermissionUtils.isPlayerCharacter(actor);
 */
export function isPlayerCharacter(actor: Dnd5eActor): boolean {
    return actor.type === 'character' && actor.hasPlayerOwner;
}

/**
 * Evaluate the current user's effective owner permission instead of reading raw ownership data.
 *
 * @example
 * const owned = PermissionUtils.isOwnedByCurrentUser(actor);
 */
export function isOwnedByCurrentUser(actor: Dnd5eActor): boolean {
    return canControl(game.user, actor);
}
