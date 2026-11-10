import { type Dnd5eActor } from '../actor/actor.types.js';
import { type Dnd5eItem } from './item.types.js';

/**
 * Use D&D 5e's maintained identifier index, including type:identifier syntax, and select the first duplicate.
 *
 * @example
 * const shield = ItemUtils.getByIdentifier(actor, 'spell:shield');
 */
export function getByIdentifier(
    actor: Dnd5eActor,
    identifier: string,
): Dnd5eItem | null {
    return actor.identifiedItems.get(identifier)?.values().next().value ?? null;
}

/**
 * Collect owned items whose prepared equipped flag is true.
 *
 * @example
 * const equipment = ItemUtils.getEquipped(actor);
 */
export function getEquipped(actor: Dnd5eActor): Dnd5eItem[] {
    return actor.items.filter((item) => item.system.equipped === true);
}

/**
 * Collect actually attuned items using system.attuned, independent of whether attunement is required.
 *
 * @example
 * const attuned = ItemUtils.getAttuned(actor);
 */
export function getAttuned(actor: Dnd5eActor): Dnd5eItem[] {
    return actor.items.filter((item) => item.system.attuned === true);
}

/**
 * Collect owned items with the requested native item type without modifying the actor's collection.
 *
 * @example
 * const spells = ItemUtils.getByType(actor, 'spell');
 */
export function getByType(actor: Dnd5eActor, type: string): Dnd5eItem[] {
    return actor.items.filter((item) => item.type === type);
}

/**
 * Check the maintained identifier index without scanning or copying the actor's items.
 *
 * @example
 * const hasShield = ItemUtils.hasItem(actor, 'spell:shield');
 */
export function hasItem(actor: Dnd5eActor, identifier: string): boolean {
    return (actor.identifiedItems.get(identifier)?.size ?? 0) > 0;
}
