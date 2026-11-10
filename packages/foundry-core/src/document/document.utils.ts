import { type FoundryDocument, type DocumentGuard } from './document.types.js';

/**
 * Recognize native Document instances without accepting document-shaped objects or compendium index rows.
 *
 * @example
 * if (DocumentUtils.isDocument(value)) useDocument(value);
 */
export function isDocument(value: unknown): value is FoundryDocument {
    return (
        value != null &&
        typeof foundry !== 'undefined' &&
        value instanceof foundry.abstract.Document
    );
}

/**
 * Resolve a UUID asynchronously and validate its subtype; missing or mismatched documents become null.
 *
 * @example
 * const actor = await DocumentUtils.resolve(actorUuid, isActor);
 */
export async function resolve<T extends FoundryDocument>(
    uuid: string,
    isExpectedDocument: DocumentGuard<T>,
): Promise<T | null> {
    const value: unknown = await globalThis.fromUuid(uuid);
    return isDocument(value) && isExpectedDocument(value) ? value : null;
}

/**
 * Resolve synchronously available native documents, rejecting compendium index rows before applying the guard.
 *
 * @example
 * const actor = DocumentUtils.resolveSync(actorUuid, isActor);
 */
export function resolveSync<T extends FoundryDocument>(
    uuid: string,
    isExpectedDocument: DocumentGuard<T>,
): T | null {
    const value: unknown = globalThis.fromUuidSync(uuid, { strict: false });
    return isDocument(value) && isExpectedDocument(value) ? value : null;
}
