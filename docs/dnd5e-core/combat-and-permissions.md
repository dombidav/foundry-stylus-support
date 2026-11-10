# Combat and permissions

[D&D core](README.md) · [Actors/tokens](actors-and-tokens.md) · [Types](../type-catalog.md)

## CombatUtils

| Function | Result / semantics |
| --- | --- |
| `CombatUtils.getActive()` | Native selected `game.combat`, or `null`, including an unstarted encounter. |
| `CombatUtils.getContext(combat?)` | `CombatContext` snapshot or `null`. |
| `CombatUtils.getCurrentCombatant(combat?)` | Current native combatant or `null`. |
| `CombatUtils.getCurrentActor(combat?)` | Current actor narrowed to D&D or `null`. |
| `CombatUtils.getCombatantByActor(actor, combat?)` | First combatant with the same actor UUID, or `null`. |
| `CombatUtils.isActorInCombat(actor, combat?)` | UUID-aware membership test. |
| `CombatUtils.isActorsTurn(actor, combat?)` | Requires a started encounter and a current actor UUID match. |
| `CombatUtils.getRound(combat?)` | Native round value, normalized to `null` if unavailable. |

For functions with an optional encounter, omission/`undefined` uses `getActive()`. Explicit `null` disables that fallback. The word "active" refers to the selected encounter, not a guarantee that combat has started.

```ts
import { CombatUtils, type Dnd5eActor } from '@template/dnd5e-core';

export function inspectTurn(actor: Dnd5eActor) {
    const combat = CombatUtils.getActive();
    return {
        context: CombatUtils.getContext(combat),
        combatant: CombatUtils.getCurrentCombatant(combat),
        currentActor: CombatUtils.getCurrentActor(combat),
        actorCombatant: CombatUtils.getCombatantByActor(actor, combat),
        isMember: CombatUtils.isActorInCombat(actor, combat),
        isCurrentTurn: CombatUtils.isActorsTurn(actor, combat),
        round: CombatUtils.getRound(combat),
    };
}
```

`CombatContext` retains native nullable `round`/`turn` values and a nullable current combatant; it does not replace them with guessed defaults. UUID comparison preserves synthetic actor identity. Several combatants can refer to one actor; actor lookup intentionally returns the first match.

There is no synthetic `ended` state: ending native combat can delete its document. There is no turn watcher or automatic cache. Reference types support a caller-owned event-driven workflow:

```ts
import { CombatUtils, type CombatantReference, type TurnChange } from '@template/dnd5e-core';

export function readCurrentReference(): CombatantReference | null {
    const context = CombatUtils.getContext();
    const combatId = context?.combat.id;
    const combatantId = context?.combatant?.id;
    return combatId && combatantId ? { combatId, combatantId } : null;
}

export function describeTurnChange(previous: CombatantReference | null): TurnChange {
    return { previous, current: readCurrentReference() };
}
```

## PermissionUtils

| Function | Result / semantics |
| --- | --- |
| `PermissionUtils.canControl(user, actor)` | Native `testUserPermission(user, 'OWNER')`. |
| `PermissionUtils.canObserve(user, actor)` | Native `testUserPermission(user, 'OBSERVER')`. |
| `PermissionUtils.getOwners(actor)` | All users with effective owner access, including GMs/offline users. |
| `PermissionUtils.getUserRelation(user, actor)` | Highest effective tier: `owner`, `observer`, `limited`, `none`. |
| `PermissionUtils.isPlayerCharacter(actor)` | Character type plus native `hasPlayerOwner`. |
| `PermissionUtils.isOwnedByCurrentUser(actor)` | Owner permission for `game.user`. |

```ts
import { PermissionUtils, type Dnd5eActor, type PermissionCheckResult } from '@template/dnd5e-core';
import { type User } from '@client/documents/_module.mjs';

export function inspectAccess(user: User, actor: Dnd5eActor) {
    const decision: PermissionCheckResult = {
        allowed: PermissionUtils.canControl(user, actor),
        reason: 'This action requires native actor owner access.',
    };
    return {
        decision,
        canObserve: PermissionUtils.canObserve(user, actor),
        owners: PermissionUtils.getOwners(actor),
        relation: PermissionUtils.getUserRelation(user, actor),
        isPlayerCharacter: PermissionUtils.isPlayerCharacter(actor),
        isCurrentUserOwner: PermissionUtils.isOwnedByCurrentUser(actor),
    };
}
```

`PermissionCheckResult` is a caller-owned contract; native permission helpers themselves return booleans/tiers. Its established `allowed` field is retained for compatibility. `ActorUserRelation` is the four-tier union.

These checks describe actor document permissions. They do not answer canvas visibility, token-layer control restrictions, world-setting write permission, or arbitrary privileged action authorization. Do not replace native permission evaluation with hand-built user-role comparisons.

Source: [combat functions](../../packages/dnd5e-core/src/combat/combat.utils.ts), [permission functions](../../packages/dnd5e-core/src/permission/permission.utils.ts).
