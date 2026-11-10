# Items and activities

[D&D core](README.md) · [Actors](actors-and-tokens.md) · [Types](../type-catalog.md)

## ItemUtils

| Function | Result / semantics |
| --- | --- |
| `ItemUtils.getByIdentifier(actor, identifier)` | First item from the native `identifiedItems` index, or `null`. |
| `ItemUtils.getEquipped(actor)` | New array of items whose prepared `system.equipped` is exactly `true`. |
| `ItemUtils.getAttuned(actor)` | New array of items whose prepared `system.attuned` is exactly `true`. |
| `ItemUtils.getByType(actor, type)` | New array filtered by native item type. |
| `ItemUtils.hasItem(actor, identifier)` | Native index membership without allocating a filtered item array. |

```ts
import { ActorUtils, ItemUtils, type Dnd5eActor } from '@template/dnd5e-core';

export function inspectInventory(actor: Dnd5eActor) {
    return {
        shield: ItemUtils.getByIdentifier(actor, 'spell:shield'),
        hasShield: ItemUtils.hasItem(actor, 'spell:shield'),
        equipped: ItemUtils.getEquipped(actor),
        attuned: ItemUtils.getAttuned(actor),
        spells: ItemUtils.getByType(actor, 'spell'),
    };
}

export function inspectAssignedInventory() {
    const actor = ActorUtils.getActiveCharacter();
    return actor ? inspectInventory(actor) : null;
}
```

Identifiers use the D&D-maintained index, including typed `type:identifier` forms. Lookup is not localized name matching. Duplicate identifiers return the first indexed item; the helper does not invent disambiguation or sort items. Actual attunement is a prepared boolean, distinct from whether an item requires attunement or an older system's enum field.

`Dnd5eItem<TParent>` extends the native item with a minimal identifier, equipment/attunement flags, and optional activity collection. It preserves the native parent relationship and does not declare the complete item system schema.

## ActivityUtils

| Function | Result / semantics |
| --- | --- |
| `ActivityUtils.getAll(item)` | Snapshot of all activity references, or `[]`. |
| `ActivityUtils.getById(item, id)` | Native collection lookup; an activity or `null`. |
| `ActivityUtils.getByType(item, type)` | Native activity collection's type-index lookup, or `[]`. |
| `ActivityUtils.hasType(item, type)` | Early-exit existence query, or `false`; avoids a filtered result array. |

```ts
import { ActivityUtils, type Dnd5eItem, type ActivityType } from '@template/dnd5e-core';

export function inspectActivities(item: Dnd5eItem, id: string) {
    const type: ActivityType = 'cast';
    return {
        all: ActivityUtils.getAll(item),
        selected: ActivityUtils.getById(item, id),
        casts: ActivityUtils.getByType(item, type),
        hasAttack: ActivityUtils.hasType(item, 'attack'),
    };
}
```

The functions also accept custom registered type strings. `ActivityType` lists the verified built-ins: `attack`, `cast`, `check`, `damage`, `enchant`, `forward`, `heal`, `order`, `save`, `summon`, `teleport`, `transform`, and `utility`.

Missing activity collections are normal and yield the documented empty/null/false results. `getByType` delegates rather than duplicating a native maintained index; preserve native ownership expectations for delegated results.

## Activity type contracts

`Dnd5eActivity` is a native DataModel with ID, type, and name. `Dnd5eAttackActivity`, `Dnd5eCastActivity`, `Dnd5eSaveActivity`, `Dnd5eDamageActivity`, and `Dnd5eSummonActivity` refine the type discriminator only. They do not claim to type all activity-specific roll data or methods.

```ts
import { type Dnd5eActivity, type Dnd5eAttackActivity } from '@template/dnd5e-core';

export function isAttackActivity(activity: Dnd5eActivity): activity is Dnd5eAttackActivity {
    return activity.type === 'attack';
}
```

`getByType` returns `Dnd5eActivity[]`, not a complete subtype-specific roll API. Use a verified subtype guard for the declared discriminator contract, and consult the target system source before extending it. These utilities inspect activities; they do not execute them.

Source: [item functions](../../packages/dnd5e-core/src/item/item.utils.ts), [activity functions](../../packages/dnd5e-core/src/activity/activity.utils.ts).
