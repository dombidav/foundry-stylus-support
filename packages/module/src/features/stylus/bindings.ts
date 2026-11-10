import {
    type ButtonAction,
    type PenSignal,
    type StylusBinding,
} from './stylus.types.js';

// Pointer Events has 15 possible non-tip bits in its unsigned short mask.
export const MAX_BUTTONS = 15;

export const ACTION_LABELS: Record<ButtonAction, string> = {
    none: 'Unassigned',
    previous: 'Previous tool',
    next: 'Next tool',
    undo: 'Undo last drawing',
    macro: 'Run macro',
    tool: 'Select tool',
    activeTool: 'Active tool action',
    removePoint: 'Remove last point',
    cancelGesture: 'Cancel current gesture',
    snapOnce: 'Invert grid snapping for the next stroke',
};

export function createBinding(): StylusBinding {
    return { action: 'none', target: '', signal: null };
}

export function isButtonAction(value: unknown): value is ButtonAction {
    return typeof value === 'string' && Object.hasOwn(ACTION_LABELS, value);
}

export function isSameSignal(
    left: PenSignal | null,
    right: PenSignal,
): boolean {
    return left?.type === right.type && left.buttons === right.buttons;
}

export function readBindings(json: string): StylusBinding[] {
    let source: unknown;
    try {
        source = JSON.parse(json);
    } catch {
        return [];
    }
    if (!Array.isArray(source)) return [];
    const entries: unknown[] = source;

    const bindings: StylusBinding[] = [];
    for (const entry of entries.slice(0, MAX_BUTTONS)) {
        const binding = createBinding();
        if (entry && typeof entry === 'object') {
            if ('action' in entry && isButtonAction(entry.action))
                binding.action = entry.action;
            if ('target' in entry && typeof entry.target === 'string')
                binding.target = entry.target;
            const signal = 'signal' in entry ? entry.signal : null;
            if (
                isPenSignal(signal) &&
                !bindings.some((other) => isSameSignal(other.signal, signal))
            ) {
                binding.signal = signal;
            }
        }
        bindings.push(binding);
    }
    return bindings;
}

function isPenSignal(value: unknown): value is PenSignal {
    return (
        !!value &&
        typeof value === 'object' &&
        'type' in value &&
        'buttons' in value &&
        (value.type === 'pointerdown' || value.type === 'pointermove') &&
        typeof value.buttons === 'number' &&
        Number.isInteger(value.buttons) &&
        value.buttons >= 2 &&
        value.buttons <= 0xffff &&
        (value.type === 'pointerdown' || (value.buttons & 1) !== 0)
    );
}

/** A move can start a tip contact when a held barrel button already caused pointerdown. */
export function getContactMask(
    event: Pick<PointerEvent, 'type' | 'pointerType' | 'buttons'>,
    previousButtons: number,
): number {
    if (event.pointerType !== 'pen' || event.buttons < 2) return 0;
    if (event.type === 'pointerdown') return event.buttons;
    if (
        event.type === 'pointermove' &&
        (event.buttons & 1) !== 0 &&
        previousButtons === (event.buttons & ~1)
    ) {
        return event.buttons;
    }
    return 0;
}
