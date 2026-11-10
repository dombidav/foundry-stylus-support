# Conditions and effects

[D&D core](README.md) · [Actors](actors-and-tokens.md) · [Types](../type-catalog.md)

| Function | Result / semantics |
| --- | --- |
| `EffectUtils.hasCondition(actor, condition)` | Membership in prepared `actor.statuses`. |
| `EffectUtils.getConditions(actor)` | New array of `{ id, effect }` pairs from active applicable effects. |
| `EffectUtils.hasEffect(actor, effectId)` | Whether any applicable effect with that embedded ID is active. |
| `EffectUtils.getByOrigin(actor, origin)` | All applicable effects matching the origin, including inactive ones. |
| `EffectUtils.isIncapacitated(actor)` | Prepared `actor.statuses` membership for `'incapacitated'`. |

```ts
import { EffectUtils, type Dnd5eActor, type ConditionIdentifier, type EffectReference } from '@template/dnd5e-core';

export function inspectEffects(actor: Dnd5eActor, effectId: string, origin: string) {
    const condition: ConditionIdentifier = 'stunned';
    const conditions = EffectUtils.getConditions(actor);
    const references: EffectReference[] = conditions.map(({ effect }) => ({
        uuid: effect.uuid,
        origin: effect.origin,
    }));
    return {
        hasCondition: EffectUtils.hasCondition(actor, condition),
        isIncapacitated: EffectUtils.isIncapacitated(actor),
        hasEffect: EffectUtils.hasEffect(actor, effectId),
        sources: EffectUtils.getByOrigin(actor, origin),
        conditions,
        references,
    };
}
```

`ConditionIdentifier` is `string` because the status configuration is extensible. `ActiveCondition` pairs an ID with the live native effect source. `EffectReference` stores UUID and optional native origin data without requiring a retained effect document.

## Prepared statuses versus effect sources

`hasCondition` and `isIncapacitated` read the actor's prepared status set, including system-derived statuses. They do not rebuild the D&D incapacitation rules from a hard-coded condition list.

`getConditions` enumerates `allApplicableEffects()`, including applicable transferred item effects, and filters by native `effect.active`. Suppressed/disabled effects are excluded through that native state. It reads each effect's own statuses and preserves separate sources: two active effects contributing the same condition produce two entries.

The aggregate actor status set and the list of individual effect statuses are therefore different views. A derived actor status need not appear as a separate source pair in `getConditions`.

`hasEffect` searches the applicable-effect set and stops at the first active matching ID. `getByOrigin` intentionally includes inactive sources so callers can inspect provenance. Neither helper evaluates expiry, immunity, duration, suppression rules, or rest behavior itself. They do not modify effects or subscribe to hooks.

Source: [effect functions](../../packages/dnd5e-core/src/effect/effect.utils.ts) and [declarations](../../packages/dnd5e-core/src/effect/effect.types.d.ts).
