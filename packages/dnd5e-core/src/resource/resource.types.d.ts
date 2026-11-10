/**
 * Minimal native prepared HP fields, including effective maximum and missing HP after system calculations.
 *
 * @example
 * const hp: PreparedHitPoints = actor.system.attributes.hp;
 */
export interface PreparedHitPoints {
    value: number;
    max: number;
    temp: number;
    tempmax: number;
    effectiveMax: number;
    damage: number;
}
/**
 * An owned HP snapshot whose max already includes temporary maximum adjustments.
 *
 * @example
 * const hp: HitPointState = ResourceUtils.getHitPoints(actor);
 */
export interface HitPointState {
    current: number;
    max: number;
    temporary: number;
    temporaryMax: number;
}
/**
 * Minimal raw resource data that can include numeric pools, nullable values, or boolean NPC resources.
 *
 * @example
 * const lair: ResourceData = { value: true };
 */
export interface ResourceData {
    value?: number | boolean | null;
    max?: number | null;
    label?: string;
}
/**
 * An owned finite numeric resource snapshot, optionally carrying the native display label.
 *
 * @example
 * const resource: ResourceState = { value: 2, max: 4, label: 'Focus' };
 */
export interface ResourceState {
    value: number;
    max: number;
    label?: string;
}
/**
 * Prepared native spell-slot pool data, with a level when the system provides one.
 *
 * @example
 * const pool: SpellSlotData = { value: 2, max: 2, level: 3 };
 */
export interface SpellSlotData {
    value: number;
    max: number;
    level?: number;
}
/**
 * An owned slot snapshot retaining the pool key so pact and custom pools at equal levels remain distinct.
 *
 * @example
 * const pool: SpellSlotState = { key: 'pact', level: 3, value: 2, max: 2 };
 */
export interface SpellSlotState {
    key: string;
    level: number;
    value: number;
    max: number;
}
/**
 * The supported D&D rest categories, without performing or reimplementing any rest mechanics.
 *
 * @example
 * const rest: RestType = 'short';
 */
export type RestType = 'short' | 'long';
