import { type Actor, type User } from '@client/documents/_module.mjs';
import { type EmbeddedCollection } from '@common/abstract/_module.mjs';
import { type Dnd5eItem } from '../item/item.types.js';
import {
    type AbilityKey,
    type AbilityScoreData,
    type SkillKey,
    type SkillData,
} from '../ability/ability.types.js';
import {
    type PreparedHitPoints,
    type ResourceData,
    type SpellSlotData,
} from '../resource/resource.types.js';

/**
 * Describe only the verified D&D 5e 6.0.6 prepared fields consumed by these helpers, not the full system model.
 *
 * @example
 * const identifier: Dnd5eActorSystem['identifier'] = actor.system.identifier;
 */
export interface Dnd5eActorSystem {
    identifier: string;
    abilities?: Record<AbilityKey, AbilityScoreData>;
    skills?: Record<SkillKey, SkillData>;
    attributes?: {
        hp?: PreparedHitPoints;
        prof?: number;
        exhaustion?: number;
    };
    resources?: Record<string, ResourceData>;
    spells?: Record<string, SpellSlotData>;
}

/**
 * Extend a native Actor with D&D prepared data, typed owned items, and the system's identifier index.
 *
 * @example
 * if (ActorUtils.isDnd5eActor(value)) { const actor: Dnd5eActor = value; }
 */
export interface Dnd5eActor extends Actor {
    system: Dnd5eActorSystem;
    readonly items: EmbeddedCollection<Dnd5eItem<this>>;
    readonly identifiedItems: ReadonlyMap<string, ReadonlySet<Dnd5eItem<this>>>;
}

/**
 * Require the complete prepared creature fields shared by character and NPC actors.
 *
 * @example
 * const hp = (system: Dnd5eCreatureSystem) => system.attributes.hp.effectiveMax;
 */
export interface Dnd5eCreatureSystem extends Dnd5eActorSystem {
    abilities: Record<AbilityKey, AbilityScoreData>;
    skills: Record<SkillKey, SkillData>;
    attributes: {
        hp: PreparedHitPoints;
        prof: number;
        exhaustion: number;
    };
}

/**
 * Narrow a D&D actor to character type with prepared creature abilities, skills, and resources.
 *
 * @example
 * if (ActorUtils.isCharacter(value)) { const character: Dnd5eCharacter = value; }
 */
export interface Dnd5eCharacter extends Dnd5eActor {
    type: 'character';
    system: Dnd5eCreatureSystem;
}

/**
 * Narrow a D&D actor to NPC type with the prepared creature data used by these utilities.
 *
 * @example
 * if (ActorUtils.isNpc(value)) { const npc: Dnd5eNpc = value; }
 */
export interface Dnd5eNpc extends Dnd5eActor {
    type: 'npc';
    system: Dnd5eCreatureSystem;
}

/**
 * Represent only character or NPC actors, excluding groups and vehicles lacking the complete creature schema.
 *
 * @example
 * const missing = (actor: Dnd5eCreature) => ResourceUtils.getMissingHitPoints(actor);
 */
export type Dnd5eCreature = Dnd5eCharacter | Dnd5eNpc;
/**
 * Store a native actor UUID without retaining a live actor document.
 *
 * @example
 * const reference: ActorReference = { uuid: actor.uuid };
 */
export interface ActorReference {
    uuid: Actor['uuid'];
}
/**
 * Pair a D&D actor with the user whose native permissions should be evaluated.
 *
 * @example
 * const context: ActorOwnershipContext = { actor, user: game.user };
 */
export interface ActorOwnershipContext {
    actor: Dnd5eActor;
    user: User;
}
