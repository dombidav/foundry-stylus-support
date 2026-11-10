import { type DataModel } from '@common/abstract/_module.mjs';
import { type Collection } from '@common/utils/_module.mjs';

/**
 * Built-in D&D 5e 6.0.6 activity identifiers; utility lookups also accept registered custom strings.
 *
 * @example
 * const type: ActivityType = 'attack';
 */
export type ActivityType =
    | 'attack'
    | 'cast'
    | 'check'
    | 'damage'
    | 'enchant'
    | 'forward'
    | 'heal'
    | 'order'
    | 'save'
    | 'summon'
    | 'teleport'
    | 'transform'
    | 'utility';
/**
 * Minimal native activity model contract containing identity, display name, and an extensible type identifier.
 *
 * @example
 * const activity: Dnd5eActivity | null = ActivityUtils.getById(item, activityId);
 */
export interface Dnd5eActivity extends DataModel {
    readonly id: string;
    readonly type: string;
    name: string;
}
/**
 * Narrow an activity to the attack discriminator without claiming a full attack-roll model.
 *
 * @example
 * const isAttack = (activity: Dnd5eAttackActivity) => activity.type === 'attack';
 */
export interface Dnd5eAttackActivity extends Dnd5eActivity {
    readonly type: 'attack';
}
/**
 * Narrow an activity to the supported cast discriminator.
 *
 * @example
 * const type: Dnd5eCastActivity['type'] = 'cast';
 */
export interface Dnd5eCastActivity extends Dnd5eActivity {
    readonly type: 'cast';
}
/**
 * Narrow an activity to the saving-throw discriminator.
 *
 * @example
 * const type: Dnd5eSaveActivity['type'] = 'save';
 */
export interface Dnd5eSaveActivity extends Dnd5eActivity {
    readonly type: 'save';
}
/**
 * Narrow an activity to the damage discriminator.
 *
 * @example
 * const type: Dnd5eDamageActivity['type'] = 'damage';
 */
export interface Dnd5eDamageActivity extends Dnd5eActivity {
    readonly type: 'damage';
}
/**
 * Narrow an activity to the summon discriminator.
 *
 * @example
 * const type: Dnd5eSummonActivity['type'] = 'summon';
 */
export interface Dnd5eSummonActivity extends Dnd5eActivity {
    readonly type: 'summon';
}
/**
 * Reuse the native collection contract with D&D 5e's maintained activity-type index.
 *
 * @example
 * const attacks = item.system.activities?.getByType('attack') ?? [];
 */
export interface Dnd5eActivityCollection extends Collection<
    string,
    Dnd5eActivity
> {
    /**
     * Fetch activities through the system-maintained type index, including custom registered activity types.
     *
     * @example
     * const saves = activities.getByType('save');
     */
    getByType(type: string): Dnd5eActivity[];
}
