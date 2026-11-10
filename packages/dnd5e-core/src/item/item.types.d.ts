import { type Actor, type Item } from '@client/documents/_module.mjs';
import { type Dnd5eActivityCollection } from '../activity/activity.types.js';

/**
 * Extend a native Item with the minimal identifier, equipment, attunement, and activity fields used here.
 *
 * @example
 * const item: Dnd5eItem | null = ItemUtils.getByIdentifier(actor, 'spell:shield');
 */
export interface Dnd5eItem<
    TParent extends Actor | null = Actor | null,
> extends Item<TParent> {
    readonly identifier: string;
    system: {
        // boolean-name-exempt: Native D&D item system field.
        equipped?: boolean;
        // boolean-name-exempt: Native D&D item system field.
        attuned?: boolean;
        activities?: Dnd5eActivityCollection;
    };
}
