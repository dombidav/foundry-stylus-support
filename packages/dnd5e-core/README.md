# D&D 5e core API

Wiki: [D&D 5e core guide](../../docs/dnd5e-core/README.md) and [complete type catalog](../../docs/type-catalog.md).

Stateless, read-only utilities verified against **Foundry VTT v14** and the stable **D&D 5e 6.0.6** system (which requires Foundry 14.367+). The initial API was implemented at the project owner's request; subsequent changes should respect the root stability policy.

```ts
import {
  ActorUtils,
  ResourceUtils,
  type Dnd5eActor,
} from '@template/dnd5e-core';

function inspect(actor: Dnd5eActor) {
  if (ActorUtils.isCharacter(actor) || ActorUtils.isNpc(actor)) {
    return ResourceUtils.getHitPoints(actor);
  }
  return null;
}
```

Each group is a native ES module namespace re-export of standalone functions. Importing the package does not access Foundry globals, register hooks, allocate caches, or initialize services. Functions that access the world should be called after Foundry initializes; prepared actor data should be read after `ready`. The functions need a Foundry host when called. The only workspace dependency is `foundry-core`, which owns system-independent global declarations; the existing `FoundryGame` type export is retained. There are no external runtime dependencies.

## Public utilities

| Namespace         | Functions                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `ActorUtils`      | `isDnd5eActor`, `isCharacter`, `isNpc`, `getByUuid`, `getActiveCharacter`                                                                 |
| `TokenUtils`      | `getActor`, `getTokens`, `getControlled`, `getControlledActors`                                                                           |
| `ItemUtils`       | `getByIdentifier`, `getEquipped`, `getAttuned`, `getByType`, `hasItem`                                                                    |
| `ActivityUtils`   | `getAll`, `getById`, `getByType`, `hasType`                                                                                               |
| `CombatUtils`     | `getActive`, `getContext`, `getCurrentCombatant`, `getCurrentActor`, `getCombatantByActor`, `isActorInCombat`, `isActorsTurn`, `getRound` |
| `PermissionUtils` | `canControl`, `canObserve`, `getOwners`, `getUserRelation`, `isPlayerCharacter`, `isOwnedByCurrentUser`                                   |
| `EffectUtils`     | `hasCondition`, `getConditions`, `hasEffect`, `getByOrigin`, `isIncapacitated`                                                            |
| `AbilityUtils`    | `getScore`, `getModifier`, `getSaveModifier`, `getSkillModifier`, `getPassiveSkill`, `getProficiencyBonus`                                |
| `ResourceUtils`   | `getHitPoints`, `getMissingHitPoints`, `getSpellSlots`, `getExhaustion`, `getResource`, `hasAvailableResource`                            |

## Types and version scope

Native document, collection, canvas, permission, and effect types come from the installed `@dfreds/foundry-types`. The official D&D 5e 6.0.6 repository ships JavaScript/JSDoc, without TypeScript declarations. Older community D&D type packages describe different system APIs and a different Foundry type provider.

The dedicated `*.types.d.ts` files describe only the additional prepared fields used here. `Dnd5eActor` and `Dnd5eItem` extend native documents. Their system interfaces are partial contracts. Activity subtype interfaces narrow the type discriminator; they do not describe all subtype-specific roll options. Extend these contracts from verified upstream APIs as features need them.

Public contracts are exported from the package root, including actor/token/item/activity subtypes, references and contexts, ability/skill/proficiency identifiers, resource snapshots, and `FoundryGame`. Inline imports use `import { type SomeType }`; `.js` declaration specifiers resolve to `.d.ts` files.

`Dnd5eCreature` is the character/NPC union. Ability helpers, HP helpers, and exhaustion require this narrowed type because groups and vehicles do not share the complete creature schema. `AbilityScoreData` retains native `mod` and `save.value` fields. The helpers read prepared values, including system and module adjustments. Numeric modifiers are prepared summaries; situational and dice-based bonuses can still affect rolls.

`ActivityType` lists built-in 6.0.6 activity identifiers, including cast. Activity lookups accept custom registered strings too. `ConditionIdentifier` is a string because status configuration is extensible.

## Lookup semantics

- Actor guards require the active system to be `dnd5e` and an instance of `Actor.implementation`. They accept unknown values and check document identity/system, without validating every prepared field or the installed system version.
- UUID lookup delegates to asynchronous `fromUuid`, including compendium and synthetic actor resolution. Missing or non-actor results become `null`; resolver errors propagate. Active character means the user's assigned character.
- Default token lookup delegates to `actor.getActiveTokens(false, true)`. Explicit-scene lookup works without rendering the scene. For a world actor, it includes linked and unlinked tokens referring to its actor ID, matching the native lookup's scope. For a synthetic actor, it returns only that actor's own token in the requested scene. Controlled-token results are snapshots; controlled actors are deduplicated by UUID so distinct synthetic actors remain distinct.
- Item identifiers use D&D 5e's maintained `identifiedItems` index, including `type:identifier` syntax. Duplicate identifiers return the first indexed item. Actual attunement is `system.attuned`, independent of whether an item requires attunement. Item filters return fresh arrays.
- Activity ID lookup uses the native collection; type lookup delegates to its maintained type index. `getAll` returns a snapshot. Missing activity collections return empty results. Type-existence checks stop at the first match without building a filtered array.
- Combat defaults to Foundry's selected combat, even before it starts. Explicit `null` disables that fallback. Context preserves nullable native round/turn values. Membership compares resolved actor UUIDs, preserving synthetic identities. The first matching combatant is returned; turn checks compare the actual current combatant and require a started encounter. `CombatState` was omitted: ending a combat deletes it, so a reliable persistent `ended` state cannot be inferred. Turn-change reference types are data contracts, without automatic tracking.
- Ownership and observation delegate to `testUserPermission`. `getOwners` includes all effective owners, including GMs and offline users. `isPlayerCharacter` requires character type and native `hasPlayerOwner`. These checks describe actor permissions; canvas visibility and token-specific control restrictions are separate.
- Condition membership uses the actor's prepared status set, including derived `incapacitated` statuses. `getConditions` retains separate active effect sources for the same condition and includes applicable item transfers; suppressed/disabled effects are excluded using `effect.active`. `hasEffect` searches active applicable effects by embedded ID. `getByOrigin` includes inactive applicable effects for provenance inspection. No condition, immunity, expiry, or rest rules are recalculated.
- HP `max` is prepared `effectiveMax`, including `tempmax`; `temporaryMax` records the adjustment and must not be added again. Missing HP comes from `hp.damage`; temporary HP does not reduce that deficit. Spell slots include standard, pact, and custom pools with positive prepared level and capacity, even when depleted. Each snapshot includes its pool `key`; cantrips and zero-capacity pools are omitted.
- Resource lookup accepts direct resource keys and returns finite numeric `value`/`max` snapshots. Boolean lair activations, unset maxima, inherited keys, and arbitrary property paths are rejected. Availability requires a positive finite amount (default `1`). Resources are never spent or restored.

The small ability/resource accessors provide typed entry points with a consistent creature restriction. There are no automatic version checks in hot paths. Re-verify APIs before using another major D&D system version.

## Verification and sources

Unit tests live in `tests/`, mirroring `src/`, and use partial native-document mocks. Run `npm run check` and `npm run build` from the repository root. In-app integration still needs a running Foundry installation.

Source contracts: [D&D 5e 6.0.6](https://github.com/foundryvtt/dnd5e/tree/release-6.0.6), [actors and item indexing](https://github.com/foundryvtt/dnd5e/blob/release-6.0.6/module/documents/actor/actor.mjs), [creature skills](https://github.com/foundryvtt/dnd5e/blob/release-6.0.6/module/data/actor/templates/creature.mjs), [ability saves](https://github.com/foundryvtt/dnd5e/blob/release-6.0.6/module/data/actor/templates/common.mjs), [HP preparation](https://github.com/foundryvtt/dnd5e/blob/release-6.0.6/module/data/actor/templates/attributes.mjs), [equippable items](https://github.com/foundryvtt/dnd5e/blob/release-6.0.6/module/data/item/templates/equippable-item.mjs), [activity indexing](https://github.com/foundryvtt/dnd5e/blob/release-6.0.6/module/data/fields/activities-field.mjs), and [spell slots](https://github.com/foundryvtt/dnd5e/blob/release-6.0.6/module/data/spellcasting/spellcasting-model.mjs). Native references: [Foundry v14 Actor](https://foundryvtt.com/api/v14/classes/foundry.documents.Actor.html), [ActiveEffect](https://foundryvtt.com/api/v14/classes/foundry.documents.ActiveEffect.html), and [Combat](https://foundryvtt.com/api/v14/classes/foundry.documents.Combat.html).
