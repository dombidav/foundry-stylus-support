import { describe, expect, it } from 'vitest';
import {
    getContactMask,
    MAX_BUTTONS,
    readBindings,
} from '../../../src/features/stylus/bindings.ts';

describe('stylus binding data', () => {
    it('accepts zero buttons and handles malformed or excessive stored data', () => {
        expect(readBindings('[]')).toEqual([]);
        expect(readBindings('bad json')).toEqual([]);
        expect(
            readBindings(JSON.stringify(Array(MAX_BUTTONS + 2).fill(null))),
        ).toHaveLength(MAX_BUTTONS);
    });

    it('preserves action targets and keeps only the first occurrence of a learned signal', () => {
        const signal = { type: 'pointerdown', buttons: 32 };
        const data = [
            { action: 'macro', target: 'macro-a', signal },
            { action: 'tool', target: 'ellipse', signal },
            {
                action: 'undo',
                target: '',
                signal: { type: 'pointerdown', buttons: 1 },
            },
        ];
        expect(readBindings(JSON.stringify(data))).toEqual([
            data[0],
            { ...data[1], signal: null },
            { ...data[2], signal: null },
        ]);
    });
});

describe('pen contact signals', () => {
    it('recognizes eraser and secondary taps while ignoring ordinary tips and other input sources', () => {
        const event = { type: 'pointerdown', pointerType: 'pen', buttons: 2 };
        expect(getContactMask(event, 0)).toBe(2);
        expect(getContactMask({ ...event, buttons: 32 }, 0)).toBe(32);
        expect(getContactMask({ ...event, buttons: 1 }, 0)).toBe(0);
        expect(getContactMask({ ...event, pointerType: 'mouse' }, 0)).toBe(0);
        expect(getContactMask({ ...event, pointerType: 'touch' }, 0)).toBe(0);
    });

    it('recognizes the tip going down with an already held button on a move event', () => {
        const event = { type: 'pointermove', pointerType: 'pen', buttons: 3 };
        expect(getContactMask(event, 2)).toBe(3);
        expect(getContactMask(event, 0)).toBe(0);
        expect(getContactMask(event, 3)).toBe(0);
        expect(getContactMask(event, 1)).toBe(0);
        expect(getContactMask({ ...event, buttons: 2 }, 0)).toBe(0);
    });
});
