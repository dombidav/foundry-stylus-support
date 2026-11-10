import { type Token } from '@client/canvas/placeables/_module.mjs';
import { type TokenDocument } from '@client/documents/_module.mjs';
import { type Dnd5eActor } from '../actor/actor.types.js';

/**
 * A rendered token whose placeable and document actor references have already been narrowed to D&D actors.
 *
 * @example
 * const inspect = (token: Dnd5eToken) => token.actor.system.identifier;
 */
export interface Dnd5eToken extends Token {
    readonly actor: Dnd5eActor;
    readonly document: TokenDocument & { readonly actor: Dnd5eActor };
}
