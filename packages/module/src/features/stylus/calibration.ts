import { getContactMask, isSameSignal } from './bindings.ts';
import { type PenSignal, type StylusBinding } from './stylus.types.js';

export function createCalibration(
    getBindings: () => readonly StylusBinding[],
    onLearned: () => void,
) {
    const section = document.createElement('section');
    section.className = 'stylus-calibration';
    section.hidden = true;
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    const pad = document.createElement('div');
    pad.className = 'stylus-calibration-pad';
    pad.textContent = 'Pen test area';
    const next = document.createElement('button');
    next.type = 'button';
    next.textContent = 'Continue to tap test';
    next.hidden = true;
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close test';
    section.append(status, pad, next, close);

    const masks = new Map<number, number>();
    const hoverMasks = new Set<number>();
    let row: number | null = null;
    let stage: 'tip' | 'hover' | 'tap' | 'test' = 'tip';
    let sample: PenSignal | null = null;
    let matches = 0;

    function stop(): void {
        row = null;
        section.hidden = true;
        masks.clear();
    }

    function start(index: number, shouldTest: boolean): void {
        row = index;
        stage = shouldTest ? 'test' : 'tip';
        sample = null;
        matches = 0;
        masks.clear();
        hoverMasks.clear();
        next.hidden = true;
        section.hidden = false;
        status.textContent = shouldTest
            ? `Button ${index + 1}: repeat the button + tip gesture.`
            : `Button ${index + 1}: tap the test area with the pen tip alone.`;
        section.scrollIntoView({ block: 'nearest' });
    }

    function onPointer(event: PointerEvent): void {
        if (row === null || event.pointerType !== 'pen') return;
        const previous = masks.get(event.pointerId) ?? 0;
        if (event.buttons === 0) masks.delete(event.pointerId);
        else masks.set(event.pointerId, event.buttons);

        if (
            stage === 'tip' &&
            event.type === 'pointerdown' &&
            event.buttons === 1
        ) {
            stage = 'hover';
            status.textContent =
                'Lift the tip. Press and release the same button while hovering over the test area, then continue.';
            next.hidden = false;
            return;
        }
        if (stage === 'hover') {
            if (event.buttons >= 2) hoverMasks.add(event.buttons);
            return;
        }

        const buttons = getContactMask(event, previous);
        if (
            !buttons ||
            (event.type !== 'pointerdown' && event.type !== 'pointermove')
        )
            return;
        const signal = { type: event.type, buttons } satisfies PenSignal;
        const bindings = getBindings();
        const binding = bindings[row];
        if (!binding) return;

        if (stage === 'test') {
            if (isSameSignal(binding.signal, signal)) {
                matches += 1;
                status.textContent = `Button ${row + 1} recognized (${matches}).`;
            } else {
                status.textContent = `Different signal: ${signal.type}, buttons=${buttons}.`;
            }
            return;
        }
        if (stage !== 'tap') return;
        if (hoverMasks.has(buttons)) {
            status.textContent =
                'This signal also occurs in hover. Try again or leave this button unassigned.';
            return;
        }
        if (
            bindings.some(
                (other, index) =>
                    index !== row && isSameSignal(other.signal, signal),
            )
        ) {
            status.textContent =
                'This signal is already learned for another button.';
            return;
        }
        if (!isSameSignal(sample, signal)) {
            sample = signal;
            status.textContent = `Detected ${signal.type}, buttons=${buttons}. Lift the tip and repeat the same gesture.`;
            return;
        }

        binding.signal = signal;
        stage = 'test';
        status.textContent = `Button ${row + 1} learned. Try it again here or save the settings.`;
        onLearned();
    }

    for (const type of ['pointerdown', 'pointermove', 'pointerup'] as const) {
        pad.addEventListener(type, onPointer);
    }
    for (const type of ['pointerleave', 'pointercancel'] as const) {
        pad.addEventListener(type, (event) => {
            masks.delete(event.pointerId);
        });
    }
    pad.addEventListener('contextmenu', (event) => event.preventDefault());
    pad.addEventListener('auxclick', (event) => event.preventDefault());
    next.addEventListener('click', () => {
        stage = 'tap';
        next.hidden = true;
        status.textContent =
            'Hold the button first, then tap the area with the pen tip.';
    });
    close.addEventListener('click', stop);
    return { element: section, start, stop };
}
