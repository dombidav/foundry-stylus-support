import { getContactMask } from './bindings.ts';
import { type StylusBinding } from './stylus.types.js';

export function listenForPenCommands(
    board: HTMLCanvasElement,
    onCommand: (binding: StylusBinding, event: PointerEvent) => void,
    hasHandledTip: (event: PointerEvent) => boolean,
    onResetTip: () => void,
) {
    const down = new Map<number, StylusBinding>();
    const move = new Map<number, StylusBinding>();
    const listeners = new AbortController();
    const options = { capture: true, signal: listeners.signal };
    const masks = new Map<number, number>();
    // An entry claims the gesture. Its value records whether a command has run during this contact.
    const claimed = new Map<number, boolean>();
    let released: PointerEvent | undefined;
    let tipPointerId: number | undefined;
    let isListeningForMoves = false;

    function onDown(event: PointerEvent): void {
        if (event.target !== board) return;
        released = undefined;
        if (event.pointerType === 'pen' && hasHandledCommand(event)) {
            syncMoveListener();
            return;
        }
        if (hasHandledTip(event)) {
            tipPointerId ??= event.pointerId;
            consume(event);
            syncMoveListener();
        }
    }

    function onMove(event: PointerEvent): void {
        if (tipPointerId === event.pointerId) {
            hasHandledTip(event);
            consume(event);
        } else if (event.target === board && event.pointerType === 'pen') {
            hasHandledCommand(event);
        }
    }

    function syncMoveListener(): void {
        const shouldListen =
            move.size > 0 || claimed.size > 0 || tipPointerId !== undefined;
        if (isListeningForMoves === shouldListen) return;
        isListeningForMoves = shouldListen;
        // Hover-to-contact bindings need movement samples. Other input only needs them while claimed.
        if (shouldListen) window.addEventListener('pointermove', onMove, true);
        else window.removeEventListener('pointermove', onMove, true);
    }

    function hasHandledCommand(event: PointerEvent): boolean {
        const { pointerId, type, buttons } = event;
        const isDown = type === 'pointerdown';
        const previous = move.size ? (masks.get(pointerId) ?? 0) : 0;
        if (move.size && buttons !== previous) {
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
        const { pointerId } = event;
        const isTip = tipPointerId === pointerId;
        let wasClaimed = false;
        if (event.pointerType === 'pen') {
            masks.delete(pointerId);
            wasClaimed = claimed.delete(pointerId);
        }
        if (!wasClaimed && !isTip) return;
        if (isTip) tipPointerId = undefined;
        released = event.type === 'pointerup' ? event : undefined;
        consume(event);
        syncMoveListener();
        if (isTip) hasHandledTip(event);
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
    window.addEventListener('pointerdown', onDown, options);
    window.addEventListener('pointerup', onEnd, options);
    window.addEventListener('pointercancel', onEnd, options);
    board.addEventListener(
        'pointerleave',
        (event) => masks.delete(event.pointerId),
        { signal: listeners.signal },
    );
    board.addEventListener(
        'lostpointercapture',
        (event) => {
            if (tipPointerId === event.pointerId) hasHandledTip(event);
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
            tipPointerId = undefined;
            onResetTip();
            syncMoveListener();
        },
        { signal: listeners.signal },
    );
    return {
        setBindings(bindings: readonly StylusBinding[]): void {
            down.clear();
            move.clear();
            for (const binding of bindings) {
                if (!binding.signal || binding.action === 'none') continue;
                if (
                    (binding.action === 'macro' || binding.action === 'tool') &&
                    !binding.target
                )
                    continue;
                (binding.signal.type === 'pointerdown' ? down : move).set(
                    binding.signal.buttons,
                    binding,
                );
            }
            if (!move.size) masks.clear();
            syncMoveListener();
        },
        hasBindings: () => down.size > 0 || move.size > 0,
        stop(): void {
            listeners.abort();
            if (isListeningForMoves) {
                window.removeEventListener('pointermove', onMove, true);
                isListeningForMoves = false;
            }
        },
        isClaimed: (pointerId: number) => claimed.has(pointerId),
    };
}

function consume(event: Event): void {
    event.preventDefault();
    event.stopImmediatePropagation();
}
