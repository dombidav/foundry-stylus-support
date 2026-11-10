import { type Document } from '@common/abstract/_module.mjs';

/**
 * The native abstract Document base shared by world, embedded, and compendium documents.
 *
 * @example
 * const uuid = (document: FoundryDocument) => document.uuid;
 */
export type FoundryDocument = Document;
/**
 * A caller-supplied predicate that narrows an already validated native document to a subtype.
 *
 * @example
 * const isActor: DocumentGuard<Actor> = document => document.documentName === 'Actor';
 */
export type DocumentGuard<T extends FoundryDocument> = (
    document: FoundryDocument,
) => document is T;
