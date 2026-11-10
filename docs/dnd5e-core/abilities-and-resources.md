# Abilities and resources

[D&D core](README.md) · [Actors](actors-and-tokens.md) · [Types](../type-catalog.md)

## AbilityUtils

These functions require `Dnd5eCreature`, the character/NPC union. They read prepared system values rather than reconstructing proficiency or ability formulas.

| Function | Prepared value |
| --- | --- |
| `AbilityUtils.getScore(actor, ability)` | `abilities[ability].value`. |
| `AbilityUtils.getModifier(actor, ability)` | `abilities[ability].mod`. |
| `AbilityUtils.getSaveModifier(actor, ability)` | `abilities[ability].save.value`. |
| `AbilityUtils.getSkillModifier(actor, skill)` | `skills[skill].total`. |
| `AbilityUtils.getPassiveSkill(actor, skill)` | `skills[skill].passive`. |
| `AbilityUtils.getProficiencyBonus(actor)` | `attributes.prof`. |

```ts
import { AbilityUtils, ActorUtils, type AbilityKey, type SkillKey, type Dnd5eActor } from '@template/dnd5e-core';

export function inspectStatistics(actor: Dnd5eActor) {
    if (!ActorUtils.isCharacter(actor) && !ActorUtils.isNpc(actor)) return null;
    const ability: AbilityKey = 'dex';
    const skill: SkillKey = 'ste';
    return {
        score: AbilityUtils.getScore(actor, ability),
        modifier: AbilityUtils.getModifier(actor, ability),
        save: AbilityUtils.getSaveModifier(actor, ability),
        stealth: AbilityUtils.getSkillModifier(actor, skill),
        passivePerception: AbilityUtils.getPassiveSkill(actor, 'prc'),
        proficiency: AbilityUtils.getProficiencyBonus(actor),
    };
}
```

`AbilityKey` is `str | dex | con | int | wis | cha`. `SkillKey` contains the 18 verified system keys; see [the declaration](../../packages/dnd5e-core/src/ability/ability.types.d.ts). `ProficiencyLevel` is `0 | 0.5 | 1 | 2`. `AbilityScoreData` includes prepared modifier/save fields and proficiency level. `SkillCheckContext` describes a caller-owned creature/skill/advantage/disadvantage context; it does not roll a check.

Prepared numeric summaries can include system/module adjustments. They do not represent every situational or dice-based bonus applied during an actual roll.

## ResourceUtils

| Function | Result / semantics |
| --- | --- |
| `ResourceUtils.getHitPoints(actor)` | Creature `HitPointState` snapshot. |
| `ResourceUtils.getMissingHitPoints(actor)` | Prepared creature HP `damage`. |
| `ResourceUtils.getSpellSlots(actor)` | New array of positive-level/capacity spell pools, retaining their native keys. |
| `ResourceUtils.getExhaustion(actor)` | Prepared creature exhaustion value. |
| `ResourceUtils.getResource(actor, key)` | Finite numeric `ResourceState` snapshot, or `null`. |
| `ResourceUtils.hasAvailableResource(actor, key, amount = 1)` | Positive finite amount with a valid finite pool and sufficient current value. |

```ts
import { ActorUtils, ResourceUtils, type Dnd5eActor } from '@template/dnd5e-core';

export function inspectResources(actor: Dnd5eActor) {
    const creature = ActorUtils.isCharacter(actor) || ActorUtils.isNpc(actor)
        ? actor
        : null;
    return {
        hp: creature ? ResourceUtils.getHitPoints(creature) : null,
        missingHp: creature ? ResourceUtils.getMissingHitPoints(creature) : null,
        exhaustion: creature ? ResourceUtils.getExhaustion(creature) : null,
        slots: ResourceUtils.getSpellSlots(actor),
        primary: ResourceUtils.getResource(actor, 'primary'),
        hasPrimary: ResourceUtils.hasAvailableResource(actor, 'primary', 1),
    };
}
```

### Hit points

`HitPointState` has `current`, `max`, `temporary`, and `temporaryMax`. `max` is native prepared `effectiveMax`, already including the temporary-maximum adjustment. `temporaryMax` records that adjustment separately; do not add it to `max` again. Missing HP uses prepared `damage`; temporary HP is not subtracted from that deficit by the helper.

### Spell pools

`SpellSlotState` has `key`, `level`, `value`, and `max`. The helper includes standard, pact, and custom pools whose prepared level is a positive integer and whose capacity is positive. Depleted pools with `value: 0` remain included. Cantrips and zero-capacity pools are omitted. Keep `key` when referring to a native pool; the level alone is not its unique storage identity.

### General resources

Only a direct own resource key is supported, not an arbitrary dotted property path. Boolean NPC resource activations, missing/null numeric fields, nonfinite values, and inherited keys produce `null`/`false`. `ResourceState` contains numeric `value`/`max` and optional label.

`hasAvailableResource` requires a positive finite amount and avoids allocating the resource snapshot. It checks finite value/max and compares current value to the requested amount; it does not spend the resource or implement capacity/rule logic.

`RestType` is `'short' | 'long'` for caller-owned workflows. No rest execution, restoration, spellcasting, or exhaustion rule engine is implemented here.

Source: [ability functions](../../packages/dnd5e-core/src/ability/ability.utils.ts), [resource functions](../../packages/dnd5e-core/src/resource/resource.utils.ts).
