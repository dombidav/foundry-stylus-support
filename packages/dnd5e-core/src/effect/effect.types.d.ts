import { type ActiveEffect } from '@client/documents/_module.mjs';

/**
 * An extensible native status identifier, including system-defined and module-defined conditions.
 *
 * @example
 * const condition: ConditionIdentifier = 'incapacitated';
 */
export type ConditionIdentifier = string;
/**
 * Associate an active condition ID with the particular native effect that contributes it.
 *
 * @example
 * const conditions: ActiveCondition[] = EffectUtils.getConditions(actor);
 */
export interface ActiveCondition {
    id: ConditionIdentifier;
    effect: ActiveEffect;
}
/**
 * Store an effect UUID and optional native origin without retaining the effect document.
 *
 * @example
 * const reference: EffectReference = { uuid: effect.uuid, origin: effect.origin };
 */
export interface EffectReference {
    uuid: ActiveEffect['uuid'];
    origin?: ActiveEffect['origin'];
}
