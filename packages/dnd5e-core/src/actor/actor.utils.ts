import { type User } from '@client/documents/_module.mjs';
import {
    type Dnd5eActor,
    type Dnd5eCharacter,
    type Dnd5eNpc,
} from './actor.types.js';

/**
 * Narrow a native configured Actor instance only in a D&D 5e world, rejecting lookalike objects.
 *
 * @example
 * if (ActorUtils.isDnd5eActor(value)) inspectActor(value);
 */
export function isDnd5eActor(actor: unknown): actor is Dnd5eActor {
    return (
        actor != null &&
        typeof game !== 'undefined' &&
        game.system.id === 'dnd5e' &&
        actor instanceof Actor.implementation
    );
}

/**
 * Check both D&D document identity and character type before exposing prepared character data.
 *
 * @example
 * if (ActorUtils.isCharacter(value)) useCharacter(value);
 */
export function isCharacter(actor: unknown): actor is Dnd5eCharacter {
    return isDnd5eActor(actor) && actor.type === 'character';
}

/**
 * Check both D&D document identity and NPC type before exposing prepared NPC data.
 *
 * @example
 * if (ActorUtils.isNpc(value)) useNpc(value);
 */
export function isNpc(actor: unknown): actor is Dnd5eNpc {
    return isDnd5eActor(actor) && actor.type === 'npc';
}

/**
 * Resolve world, compendium, or synthetic actor UUIDs through Foundry and reject non-D&D actor results.
 *
 * @example
 * const resolved = await ActorUtils.getByUuid(actor.uuid);
 */
export async function getByUuid(uuid: string): Promise<Dnd5eActor | null> {
    const document = await fromUuid(uuid);
    return isDnd5eActor(document) ? document : null;
}

/**
 * Read the explicit or current user's assigned character, rather than their selected token.
 *
 * @example
 * const character = ActorUtils.getActiveCharacter(game.user);
 */
export function getActiveCharacter(
    user: User = game.user,
): Dnd5eCharacter | null {
    const actor = user.character;
    return isCharacter(actor) ? actor : null;
}
