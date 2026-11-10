import { type Dnd5eItem } from '../item/item.types.js';
import { type Dnd5eActivity } from './activity.types.js';

/**
 * Copy all item activities into a snapshot, or use an empty array for items without activities.
 *
 * @example
 * const activities = ActivityUtils.getAll(item);
 */
export function getAll(item: Dnd5eItem): Dnd5eActivity[] {
    return item.system.activities ? [...item.system.activities] : [];
}

/**
 * Look up an activity by its native collection ID, normalizing absent activities to null.
 *
 * @example
 * const activity = ActivityUtils.getById(item, activityId);
 */
export function getById(item: Dnd5eItem, id: string): Dnd5eActivity | null {
    return item.system.activities?.get(id) ?? null;
}

/**
 * Use the maintained activity-type index rather than scanning the collection to build a filtered result.
 *
 * @example
 * const attacks = ActivityUtils.getByType(item, 'attack');
 */
export function getByType(item: Dnd5eItem, type: string): Dnd5eActivity[] {
    return item.system.activities?.getByType(type) ?? [];
}

/**
 * Stop at the first matching activity without allocating a filtered array.
 *
 * @example
 * const canSave = ActivityUtils.hasType(item, 'save');
 */
export function hasType(item: Dnd5eItem, type: string): boolean {
    return (
        item.system.activities?.some((activity) => activity.type === type) ??
        false
    );
}
