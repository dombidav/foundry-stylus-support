import { getContactMask } from './bindings.ts';
import { type StylusBinding } from './stylus.types.js';

export function listenForPenCommands(
    board: HTMLCanvasElement,
    bindings: readonly StylusBinding[],
    onCommand: (binding: StylusBinding, event: PointerEvent) => void,
): (() => void) | undefined {
    const down = new Map<number, StylusBinding>();
    const move = new Map<number, StylusBinding>();
    for (const binding of bindings) {
        if (!binding.signal || binding.action === 'none') continue;
        if (
            (binding.action === 'macro' || binding.action === 'tool') &&
            !binding.target
        )
            continue;
        const commands = binding.signal.type === 'pointerdown' ? down : move;
        commands.set(binding.signal.buttons, binding);
    }
    if (!down.size && !move.size) return;

    const listeners = new AbortController();
    const options = { capture: true, signal: listeners.signal };
    const masks = new Map<number, number>();
    // An entry claims the gesture. Its value records whether a command has run during this contact.
    const claimed = new Map<number, boolean>();
    let released: number | undefined;

    function onPointer(event: PointerEvent): void {
        if (event.target !== board || event.pointerType !== 'pen') return;
        const { pointerId, type, buttons } = event;
        const isDown = type === 'pointerdown';
        if (isDown) released = undefined;
        const previous = masks.get(pointerId) ?? 0;
        if (move.size) {
            if (buttons) masks.set(pointerId, buttons);
            else masks.delete(pointerId);
        }
        const binding = isDown
            ? down.get(buttons)
            : move.get(getContactMask(event, previous));
        const isPrecedingHover =
            isDown && (buttons & 1) === 0 && move.has(buttons | 1);
        if ((binding || isPrecedingHover) && !claimed.has(pointerId))
            claimed.set(pointerId, false);
        if (!claimed.has(pointerId)) return;
        consume(event);
        if ((previous & 1) !== 0 && (buttons & 1) === 0)
            claimed.set(pointerId, false);
        if (binding && claimed.get(pointerId) === false) {
            claimed.set(pointerId, true);
            onCommand(binding, event);
        }
    }

    function onEnd(event: PointerEvent): void {
        if (event.pointerType !== 'pen') return;
        masks.delete(event.pointerId);
        if (!claimed.delete(event.pointerId)) return;
        released = event.type === 'pointerup' ? event.pointerId : undefined;
        consume(event);
    }

    function onClick(event: MouseEvent): void {
        if (
            event.target === board &&
            'pointerType' in event &&
            event.pointerType === 'pen' &&
            'pointerId' in event &&
            typeof event.pointerId === 'number' &&
            (claimed.has(event.pointerId) || released === event.pointerId)
        ) {
            consume(event);
        }
    }

    // Foundry/Pixi and Swipe may have board listeners already. Capture one level earlier and claim only matched pen gestures.
    window.addEventListener('pointerdown', onPointer, options);
    window.addEventListener('pointermove', onPointer, options);
    window.addEventListener('pointerup', onEnd, options);
    window.addEventListener('pointercancel', onEnd, options);
    board.addEventListener(
        'pointerleave',
        (event) => masks.delete(event.pointerId),
        { signal: listeners.signal },
    );
    for (const type of ['click', 'auxclick', 'contextmenu'] as const) {
        window.addEventListener(type, onClick, options);
    }
    window.addEventListener(
        'blur',
        () => {
            claimed.clear();
            masks.clear();
            released = undefined;
        },
        { signal: listeners.signal },
    );
    return () => listeners.abort();
}

function consume(event: Event): void {
    event.preventDefault();
    event.stopImmediatePropagation();
}
