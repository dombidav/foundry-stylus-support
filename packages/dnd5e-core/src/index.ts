export { type FoundryGame } from './foundry.js';

export * as ActorUtils from './actor/actor.utils.ts';
export * as TokenUtils from './token/token.utils.ts';
export * as ItemUtils from './item/item.utils.ts';
export * as ActivityUtils from './activity/activity.utils.ts';
export * as CombatUtils from './combat/combat.utils.ts';
export * as PermissionUtils from './permission/permission.utils.ts';
export * as EffectUtils from './effect/effect.utils.ts';
export * as AbilityUtils from './ability/ability.utils.ts';
export * as ResourceUtils from './resource/resource.utils.ts';
export {
    type Dnd5eActor,
    type Dnd5eCharacter,
    type Dnd5eNpc,
    type Dnd5eCreature,
    type ActorReference,
    type ActorOwnershipContext,
} from './actor/actor.types.js';
export { type Dnd5eToken } from './token/token.types.js';
export { type Dnd5eItem } from './item/item.types.js';
export {
    type Dnd5eActivity,
    type Dnd5eAttackActivity,
    type Dnd5eCastActivity,
    type Dnd5eSaveActivity,
    type Dnd5eDamageActivity,
    type Dnd5eSummonActivity,
    type ActivityType,
} from './activity/activity.types.js';
export {
    type CombatContext,
    type CombatantReference,
    type TurnChange,
} from './combat/combat.types.js';
export {
    type ActorUserRelation,
    type PermissionCheckResult,
} from './permission/permission.types.js';
export {
    type ConditionIdentifier,
    type ActiveCondition,
    type EffectReference,
} from './effect/effect.types.js';
export {
    type AbilityKey,
    type SkillKey,
    type ProficiencyLevel,
    type AbilityScoreData,
    type SkillCheckContext,
} from './ability/ability.types.js';
export {
    type HitPointState,
    type ResourceState,
    type SpellSlotState,
    type RestType,
} from './resource/resource.types.js';
