import { type Actor, type Item } from '@client/documents/_module.mjs';
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { DocumentUtils, type FoundryDocument } from '../../src/index.ts';

const documentClass = vi.fn();
const actor = Object.setPrototypeOf(
    { documentName: 'Actor' },
    documentClass.prototype,
) as unknown as Actor;
const item = Object.setPrototypeOf(
    { documentName: 'Item' },
    documentClass.prototype,
) as unknown as Item;
/**
 * Narrow native document fixtures to actors for guarded resolution unit tests.
 *
 * @example
 * const actor = await DocumentUtils.resolve('Actor.example', isActor);
 */
const isActor = (document: FoundryDocument): document is Actor =>
    document.documentName === 'Actor';

beforeEach(() => {
    vi.stubGlobal('foundry', { abstract: { Document: documentClass } });
});

describe('validated document resolution', () => {
    it('identifies actual native document instances rather than index-shaped objects', () => {
        expect(DocumentUtils.isDocument(actor)).toBe(true);
        expect(DocumentUtils.isDocument(null)).toBe(false);
        expect(DocumentUtils.isDocument({ documentName: 'Actor' })).toBe(false);
        vi.stubGlobal('foundry', undefined);
        expect(DocumentUtils.isDocument(actor)).toBe(false);
    });

    it('resolves asynchronously and validates the requested subtype', async () => {
        const native = vi
            .fn()
            .mockResolvedValueOnce(actor)
            .mockResolvedValueOnce(item)
            .mockResolvedValueOnce(null);
        vi.stubGlobal('fromUuid', native);
        const result = DocumentUtils.resolve('Actor.actor', isActor);
        expectTypeOf(result).toEqualTypeOf<Promise<Actor | null>>();
        expect(await result).toBe(actor);
        expect(await DocumentUtils.resolve('Item.item', isActor)).toBeNull();
        expect(
            await DocumentUtils.resolve('Actor.missing', isActor),
        ).toBeNull();
        expect(native).toHaveBeenCalledWith('Actor.actor');
    });

    it('rejects compendium index entries synchronously, even if their documentName matches', () => {
        const index = {
            _id: 'actor',
            name: 'Index entry',
            documentName: 'Actor',
        };
        const native = vi
            .fn()
            .mockReturnValueOnce(index)
            .mockReturnValueOnce(actor)
            .mockReturnValueOnce(item)
            .mockReturnValueOnce(null);
        vi.stubGlobal('fromUuidSync', native);
        expect(
            DocumentUtils.resolveSync('Compendium.pack.Actor.actor', isActor),
        ).toBeNull();
        expect(DocumentUtils.resolveSync('Actor.actor', isActor)).toBe(actor);
        expect(DocumentUtils.resolveSync('Item.item', isActor)).toBeNull();
        expect(DocumentUtils.resolveSync('Actor.missing', isActor)).toBeNull();
        expect(native).toHaveBeenCalledWith('Compendium.pack.Actor.actor', {
            strict: false,
        });
    });

    it('propagates resolver failures', async () => {
        vi.stubGlobal(
            'fromUuid',
            vi.fn().mockRejectedValue(new Error('Resolve failed')),
        );
        await expect(DocumentUtils.resolve('bad', isActor)).rejects.toThrow(
            'Resolve failed',
        );
        vi.stubGlobal(
            'fromUuidSync',
            vi.fn(() => {
                throw new Error('Invalid UUID');
            }),
        );
        expect(() => DocumentUtils.resolveSync('bad', isActor)).toThrow(
            'Invalid UUID',
        );
    });
});
