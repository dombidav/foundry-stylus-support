import { type Combat, type Combatant } from '@client/documents/_module.mjs';

/**
 * Snapshot a selected combat, optional current combatant, and native nullable round/turn values.
 *
 * @example
 * const context: CombatContext | null = CombatUtils.getContext();
 */
export interface CombatContext {
    combat: Combat;
    combatant: Combatant | null;
    round: Combat['round'];
    turn: Combat['turn'];
}
/**
 * Identify an embedded combatant using its combat ID and combatant ID without retaining documents.
 *
 * @example
 * const reference: CombatantReference = { combatId: combat.id, combatantId: combatant.id };
 */
export interface CombatantReference {
    combatId: string;
    combatantId: string;
}
/**
 * Describe previous and current combatant references without registering hooks or tracking turns automatically.
 *
 * @example
 * const change: TurnChange = { previous: null, current: reference };
 */
export interface TurnChange {
    previous: CombatantReference | null;
    current: CombatantReference | null;
}
