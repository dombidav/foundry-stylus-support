import { vi } from 'vitest';
import {
    type User,
    type ActiveEffect,
    type Actor,
} from '@client/documents/_module.mjs';
import { type Dnd5eCharacter } from '../src/actor/actor.types.js';

export const actorClass = vi.fn();

/**
 * Create a partial prepared character fixture with native-like identity; no Foundry runtime is emulated.
 *
 * @example
 * const actor = createActor();
 */
export function createActor(): Dnd5eCharacter {
    const ability = { value: 11, mod: 7, proficient: 1, save: { value: 12 } };
    return Object.setPrototypeOf(
        {
            id: 'actor',
            uuid: 'Actor.actor',
            type: 'character',
            isToken: false,
            token: null,
            hasPlayerOwner: false,
            system: {
                identifier: 'hero',
                abilities: Object.fromEntries(
                    ['str', 'dex', 'con', 'int', 'wis', 'cha'].map((key) => [
                        key,
                        { ...ability },
                    ]),
                ),
                skills: { prc: { total: 9, passive: 24 } },
                attributes: {
                    prof: 4,
                    exhaustion: 2,
                    hp: {
                        value: 8,
                        max: 20,
                        temp: 5,
                        tempmax: -4,
                        effectiveMax: 16,
                        damage: 8,
                    },
                },
                resources: { primary: { value: 2, max: 4, label: 'Focus' } },
                spells: {},
            },
            items: [],
            identifiedItems: new Map(),
            statuses: new Set(),
            getActiveTokens: vi.fn(() => []),
            testUserPermission: vi.fn(() => false),
            allApplicableEffects: function* () {},
        },
        actorClass.prototype,
    ) as unknown as Dnd5eCharacter;
}

/**
 * Create a partial native user fixture with optional assigned actor for ownership and character tests.
 *
 * @example
 * const user = createUser('player', createActor());
 */
export function createUser(id = 'user', character: Actor | null = null): User {
    return { id, character, isGM: false } as unknown as User;
}

/**
 * Create a partial effect fixture with explicit statuses, active state, and origin for effect queries.
 *
 * @example
 * const effect = createEffect('stunned', ['stunned', 'incapacitated']);
 */
export function createEffect(
    id: string,
    statuses: string[] = [],
    isActive = true,
    origin: string | null = null,
): ActiveEffect<Dnd5eCharacter> {
    return {
        id,
        statuses: new Set(statuses),
        active: isActive,
        origin,
    } as ActiveEffect<Dnd5eCharacter>;
}

/**
 * Install isolated minimal D&D game, actor, and canvas globals for unit tests.
 *
 * @example
 * beforeEach(stubFoundry);
 */
export function stubFoundry() {
    vi.stubGlobal('Actor', { implementation: actorClass });
    vi.stubGlobal('game', {
        system: { id: 'dnd5e' },
        user: createUser(),
        users: [],
        combat: null,
    });
    vi.stubGlobal('canvas', null);
}
