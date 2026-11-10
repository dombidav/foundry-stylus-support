import { stylusDiagnostics } from '../../settings.ts';
import { getContactMask } from './bindings.ts';
import { pointerDetails } from './diagnostics.ts';
import { listenForPenTouchDuplicates } from './pen-touch.ts';
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
    const touchDuplicates = listenForPenTouchDuplicates(
        board,
        listeners.signal,
    );
    const masks = new Map<number, number>();
    // An entry claims the gesture. Its value records whether a command has run during this contact.
    const claimed = new Map<number, boolean>();
    let released: PointerEvent | undefined;
    let tipPointerId: number | undefined;
    let isListeningForMoves = false;
    let traceListeners: AbortController | undefined;
    const traceMasks = new Map<number, number>();

    function tracePointer(event: PointerEvent): void {
        if (event.pointerType !== 'pen') return;
        const previous = traceMasks.get(event.pointerId);
        if (event.target !== board && !previous) return;
        if (event.type === 'pointermove' && (previous ?? 0) === event.buttons)
            return;
        if (
            event.type === 'pointerup' ||
            event.type === 'pointercancel' ||
            !event.buttons
        )
            traceMasks.delete(event.pointerId);
        else traceMasks.set(event.pointerId, event.buttons);
        stylusDiagnostics.record('pointer', event.type, {
            ...pointerDetails(event),
            previousButtons: previous,
            isOnBoard: event.target === board,
        });
    }

    function traceMouse(event: MouseEvent): void {
        stylusDiagnostics.record('pointer', event.type, {
            eventTimeMs: event.timeStamp,
            pointerType:
                'pointerType' in event ? String(event.pointerType) : undefined,
            button: event.button,
            buttons: event.buttons,
            clientX: event.clientX,
            clientY: event.clientY,
            isTrusted: event.isTrusted,
            isDefaultPrevented: event.defaultPrevented,
        });
    }

    function onDown(event: PointerEvent): void {
        if (event.target !== board) return;
        if (traceListeners) tracePointer(event);
        released = undefined;
        if (event.pointerType === 'pen') {
            touchDuplicates.rememberPenDown(event);
            if (hasHandledCommand(event)) {
                syncMoveListener();
                return;
            }
        }
        if (hasHandledTip(event)) {
            tipPointerId ??= event.pointerId;
            consume(event);
            if (traceListeners && event.pointerType === 'pen')
                stylusDiagnostics.record('stylus', 'tipClaimed', {
                    pointerId: event.pointerId,
                });
            syncMoveListener();
        }
    }

    function onMove(event: PointerEvent): void {
        if (traceListeners) tracePointer(event);
        if (tipPointerId === event.pointerId) {
            hasHandledTip(event);
            consume(event);
        } else if (event.target === board && event.pointerType === 'pen') {
            hasHandledCommand(event);
        }
    }

    function syncMoveListener(): void {
        const shouldListen =
            move.size > 0 ||
            claimed.size > 0 ||
            tipPointerId !== undefined ||
            !!traceListeners;
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
        if ((binding || isPrecedingHover) && !claimed.has(pointerId)) {
            claimed.set(pointerId, false);
            if (traceListeners && !binding)
                stylusDiagnostics.record('stylus', 'hoverClaimed', {
                    pointerId,
                    buttons,
                });
        }
        if (!claimed.has(pointerId)) return false;
        consume(event);
        if ((previous & 1) !== 0 && (buttons & 1) === 0)
            claimed.set(pointerId, false);
        if (binding && claimed.get(pointerId) === false) {
            claimed.set(pointerId, true);
            if (traceListeners)
                stylusDiagnostics.record('stylus', 'buttonMatched', {
                    pointerId,
                    eventTimeMs: event.timeStamp,
                    action: binding.action,
                    tool:
                        binding.action === 'tool' ? binding.target : undefined,
                    buttons,
                    signalType: binding.signal?.type,
                    signalButtons: binding.signal?.buttons,
                });
            onCommand(binding, event);
        }
        return true;
    }

    function onEnd(event: PointerEvent): void {
        if (traceListeners) tracePointer(event);
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
        if (traceListeners && event.pointerType === 'pen')
            stylusDiagnostics.record('stylus', 'releaseConsumed', {
                pointerId,
                eventTimeMs: event.timeStamp,
                inputEvent: event.type,
                isTip,
                wasClaimed,
            });
        syncMoveListener();
        if (isTip) hasHandledTip(event);
    }

    function onClick(event: MouseEvent): void {
        if (traceListeners && event.target === board) traceMouse(event);
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
        (event) => {
            masks.delete(event.pointerId);
            if (traceListeners) tracePointer(event);
        },
        { signal: listeners.signal },
    );
    board.addEventListener(
        'lostpointercapture',
        (event) => {
            if (traceListeners) tracePointer(event);
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
            if (traceListeners) stylusDiagnostics.record('pointer', 'blur');
            claimed.clear();
            masks.clear();
            traceMasks.clear();
            touchDuplicates.reset();
            released = undefined;
            tipPointerId = undefined;
            onResetTip();
            syncMoveListener();
        },
        { signal: listeners.signal },
    );

    function stopTracing(): void {
        traceListeners?.abort();
        traceListeners = undefined;
        traceMasks.clear();
    }

    return {
        setDiagnostics(isEnabled: boolean): void {
            if (isEnabled === !!traceListeners) return;
            if (isEnabled) {
                traceListeners = new AbortController();
                const { signal } = traceListeners;
                board.addEventListener('pointerenter', tracePointer, {
                    signal,
                });
                board.addEventListener('gotpointercapture', tracePointer, {
                    signal,
                });
                for (const type of ['mousedown', 'mouseup'] as const)
                    board.addEventListener(type, traceMouse, { signal });
            } else stopTracing();
            syncMoveListener();
        },
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
            stopTracing();
            touchDuplicates.reset();
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
