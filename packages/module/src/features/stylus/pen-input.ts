import { getContactMask } from './bindings.ts';
import { type StylusBinding } from './stylus.types.js';

export function listenForPenCommands(
    board: HTMLCanvasElement,
    bindings: readonly StylusBinding[],
    onCommand: (binding: StylusBinding, event: PointerEvent) => void,
    hasHandledTip: (event: PointerEvent) => boolean,
    onResetTip: () => void,
) {
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
    const listeners = new AbortController();
    const options = { capture: true, signal: listeners.signal };
    const masks = new Map<number, number>();
    // An entry claims the gesture. Its value records whether a command has run during this contact.
    const claimed = new Map<number, boolean>();
    let released: PointerEvent | undefined;

    function onPointer(event: PointerEvent): void {
        if (event.type === 'pointerdown' && event.target !== board) return;
        if (event.type === 'pointerdown') released = undefined;
        if (
            event.pointerType === 'pen' &&
            event.target === board &&
            hasHandledCommand(event)
        )
            return;
        if (hasHandledTip(event)) consume(event);
    }

    function hasHandledCommand(event: PointerEvent): boolean {
        const { pointerId, type, buttons } = event;
        const isDown = type === 'pointerdown';
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
        if (!claimed.has(pointerId)) return false;
        consume(event);
        if ((previous & 1) !== 0 && (buttons & 1) === 0)
            claimed.set(pointerId, false);
        if (binding && claimed.get(pointerId) === false) {
            claimed.set(pointerId, true);
            onCommand(binding, event);
        }
        return true;
    }

    function onEnd(event: PointerEvent): void {
        let wasClaimed = false;
        if (event.pointerType === 'pen') {
            masks.delete(event.pointerId);
            wasClaimed = claimed.delete(event.pointerId);
        }
        if (!wasClaimed && !hasHandledTip(event)) return;
        released = event.type === 'pointerup' ? event : undefined;
        consume(event);
    }

    function onClick(event: MouseEvent): void {
        if (
            event.target === board &&
            'pointerType' in event &&
            'pointerId' in event &&
            typeof event.pointerId === 'number' &&
            ((event.pointerType === 'pen' && claimed.has(event.pointerId)) ||
                (released?.pointerId === event.pointerId &&
                    released.pointerType === event.pointerType))
        ) {
            consume(event);
        }
    }

    // Foundry/Pixi and Swipe may have board listeners already. Capture one level earlier and claim only matched pen gestures.
    window.addEventListener('pointerdown', onPointer, options);
    window.addEventListener('pointermove', onPointer, options);
    window.addEventListener('pointerup', onEnd, options);
    window.addEventListener('pointercancel', onEnd, options);
    if (move.size)
        board.addEventListener(
            'pointerleave',
            (event) => masks.delete(event.pointerId),
            { signal: listeners.signal },
        );
    board.addEventListener(
        'lostpointercapture',
        (event) => {
            hasHandledTip(event);
        },
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
            onResetTip();
        },
        { signal: listeners.signal },
    );
    return {
        stop: () => listeners.abort(),
        isClaimed: (pointerId: number) => claimed.has(pointerId),
    };
}

function consume(event: Event): void {
    event.preventDefault();
    event.stopImmediatePropagation();
}
