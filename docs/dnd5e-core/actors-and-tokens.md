# Actors and tokens

[D&D core](README.md) · [Combat](combat-and-permissions.md) · [Types](../type-catalog.md)

## ActorUtils

| Function | Result / semantics |
| --- | --- |
| `ActorUtils.isDnd5eActor(value)` | Type guard to `Dnd5eActor`: requires the D&D system ID and `Actor.implementation` identity. |
| `ActorUtils.isCharacter(value)` | Guard to `Dnd5eCharacter`, including prepared creature fields. |
| `ActorUtils.isNpc(value)` | Guard to `Dnd5eNpc`, including prepared creature fields. |
| `ActorUtils.getByUuid(uuid)` | Async native UUID resolution; `Dnd5eActor` or `null`. Resolver errors propagate. |
| `ActorUtils.getActiveCharacter(user?)` | The given/current user's assigned character, or `null` if absent/not a D&D character. |

```ts
import { ActorUtils, ResourceUtils, type ActorReference } from '@template/dnd5e-core';

export function inspectActor(value: unknown) {
    if (!ActorUtils.isDnd5eActor(value)) return null;
    const reference: ActorReference = { uuid: value.uuid };
    if (ActorUtils.isCharacter(value) || ActorUtils.isNpc(value)) {
        return { reference, hp: ResourceUtils.getHitPoints(value) };
    }
    return { reference, hp: null };
}

export async function inspectActorUuid(uuid: string) {
    const actor = await ActorUtils.getByUuid(uuid);
    return actor ? inspectActor(actor) : null;
}
```

The guard checks the active system and native instance; a document-shaped plain object is insufficient. It does not validate every additional system field. Groups/vehicles can be `Dnd5eActor` without satisfying `Dnd5eCreature`; do not cast them to creature types to call HP/ability helpers.

`getActiveCharacter` means user assignment, not the currently selected token, current combatant, or any player-owned actor. Pass a native `User` explicitly when inspecting a different assignment:

```ts
import { ActorUtils, type ActorOwnershipContext } from '@template/dnd5e-core';
import { type User } from '@client/documents/_module.mjs';

export function getAssignment(user: User): ActorOwnershipContext | null {
    const actor = ActorUtils.getActiveCharacter(user);
    return actor ? { actor, user } : null;
}
```

`ActorReference` stores a UUID without retaining a live actor. `ActorOwnershipContext` pairs a native user with a D&D actor; it is a caller-owned context, not automatic permission evaluation.

## TokenUtils

| Function | Result / semantics |
| --- | --- |
| `TokenUtils.getActor(tokenOrDocument)` | Native `Token` / `TokenDocument` actor narrowed to D&D, otherwise `null`. |
| `TokenUtils.getTokens(actor, scene?)` | Native token documents; explicit scenes use actor reference/synthetic identity matching. |
| `TokenUtils.getControlled()` | Snapshot of controlled native placeables; `[]` without a ready canvas. |
| `TokenUtils.getControlledActors()` | D&D actors from controlled placeables, deduplicated by actor UUID; `[]` without a ready canvas. |

```ts
import { TokenUtils, type Dnd5eActor } from '@template/dnd5e-core';
import { SceneUtils } from '@template/foundry-core';

export function inspectSelection() {
    const tokens = TokenUtils.getControlled();
    const actors = TokenUtils.getControlledActors();
    const firstActor = tokens[0] ? TokenUtils.getActor(tokens[0]) : null;
    return { tokens, actors, firstActor };
}

export function findActorTokens(actor: Dnd5eActor) {
    const viewed = SceneUtils.getContext().viewed;
    return viewed ? TokenUtils.getTokens(actor, viewed) : TokenUtils.getTokens(actor);
}
```

Without an explicit scene, token discovery delegates to `actor.getActiveTokens(false, true)` and preserves native scope/behavior. For an explicit scene, world actors match linked and unlinked token references by `actorId`; a synthetic actor matches only its exact owning token in that scene.

## Identity and ownership

Two unlinked tokens can reference the same base actor ID while owning distinct synthetic actors. Their actor UUIDs differ. UUID-based deduplication preserves those distinct actors while collapsing repeated selected linked tokens for one world actor.

`Dnd5eToken` refines both the placeable and its document to have a D&D actor; use it only after establishing that contract. General selection APIs return native `Token[]` because a token can have no suitable actor. Readiness/selection and native permissions are separate questions.

The helpers do not maintain a selection cache or subscribe to events. Query when needed or respond to the relevant native events, retaining your own correctly invalidated state only if the feature needs it.

Source: [actor functions](../../packages/dnd5e-core/src/actor/actor.utils.ts), [token functions](../../packages/dnd5e-core/src/token/token.utils.ts).
