# D&D 5e core

[Wiki home](../README.md) · [Type catalog](../type-catalog.md) · [Compatibility](../compatibility-and-troubleshooting.md)

Import from `@template/dnd5e-core`. The package contains stateless read-only utilities for **D&D 5e 6.0.6** on **Foundry v14**. It depends only on `foundry-core`, reuses native document/collection declarations, and adds minimal prepared-system contracts. Importing it does not access Foundry globals, register hooks, or initialize caches.

| Namespace | Reference |
| --- | --- |
| `ActorUtils` | [Actors and tokens](actors-and-tokens.md) |
| `TokenUtils` | [Actors and tokens](actors-and-tokens.md) |
| `ItemUtils` | [Items and activities](items-and-activities.md) |
| `ActivityUtils` | [Items and activities](items-and-activities.md) |
| `CombatUtils` | [Combat and permissions](combat-and-permissions.md) |
| `PermissionUtils` | [Combat and permissions](combat-and-permissions.md) |
| `EffectUtils` | [Effects](effects.md) |
| `AbilityUtils` | [Abilities and resources](abilities-and-resources.md) |
| `ResourceUtils` | [Abilities and resources](abilities-and-resources.md) |

World-dependent calls belong after initialization; read prepared actor data after `ready`. Actor guards test native identity and the active system ID, not the complete system schema or installed version on each call. Narrow a general actor to `Dnd5eCharacter` / `Dnd5eNpc` before using creature-only helpers.

```ts
import { ActorUtils, ResourceUtils } from '@template/dnd5e-core';

export function inspectAssignedCharacter() {
    const actor = ActorUtils.getActiveCharacter();
    return actor ? ResourceUtils.getHitPoints(actor) : null;
}
```

The helpers expose native prepared values and maintained indexes. They do not duplicate game rules, roll attacks/checks, spend resources, execute rests, change effects, or authorize document updates. A reference/snapshot object can be owned by the caller, while contained document references remain native live objects.

The [type catalog](../type-catalog.md) covers public contracts and supporting system shapes. Support-only declarations are not all exported from the root. Extend the stable core only for a concrete verified necessity; evolving module behavior belongs in downstream workspaces.

Source: [public exports](../../packages/dnd5e-core/src/index.ts). The package README also records the [verified source semantics](../../packages/dnd5e-core/README.md).
