import { stylusDiagnostics, verbose } from '../../settings.ts';

const FOLLOW_UPS = ['touchmove', 'touchend', 'touchcancel'] as const;
const CAPTURE_TOUCH = { capture: true, passive: false };

export function listenForPenTouchDuplicates(
    board: HTMLCanvasElement,
    signal: AbortSignal,
) {
    const penTouches = new Set<number>();
    let lastPenDown: PointerEvent | undefined;

    function onStart(event: TouchEvent): void {
        if (event.target !== board || !event.isTrusted) return;
        const pen = lastPenDown;
        lastPenDown = undefined;
        const changes = event.changedTouches;
        if (!changes.length) return;
        if (verbose.isVerbose && pen) {
            const first = changes[0]!;
            stylusDiagnostics.record('pointer', 'touchstart', {
                eventTimeMs: event.timeStamp,
                touchId: first.identifier,
                count: changes.length,
                clientX: first.clientX,
                clientY: first.clientY,
                penTimeMs: pen.timeStamp,
                penPointerId: pen.pointerId,
            });
        }
        for (const touch of changes) {
            if ('touchType' in touch) {
                if (touch.touchType !== 'stylus') return;
            } else if (
                changes.length !== 1 ||
                !pen ||
                // Chromium exposes both DOM events for one input sample with the same timestamp.
                // The coordinate check permits differences in CSS pixel rounding.
                event.timeStamp !== pen.timeStamp ||
                Math.abs(touch.clientX - pen.clientX) > 1 ||
                Math.abs(touch.clientY - pen.clientY) > 1
            )
                return;
        }
        if (!penTouches.size)
            for (const type of FOLLOW_UPS)
                window.addEventListener(type, onFollowUp, CAPTURE_TOUCH);
        for (const touch of changes) penTouches.add(touch.identifier);
        suppress(event);
    }

    function onFollowUp(event: TouchEvent): void {
        if (event.target !== board || !event.isTrusted) return;
        const changes = event.changedTouches;
        if (!changes.length) return;
        const isMove = event.type === 'touchmove';
        let areAllPen = true;
        for (const touch of changes) {
            const { identifier } = touch;
            const isPen = isMove
                ? penTouches.has(identifier)
                : penTouches.delete(identifier);
            areAllPen &&= isPen;
        }
        // Preserve real fingers in mixed TouchEvents and leave Swipe's multi-touch routing intact.
        if (areAllPen) suppress(event);
        if (!penTouches.size) detachFollowUps();
    }

    function detachFollowUps(): void {
        for (const type of FOLLOW_UPS)
            window.removeEventListener(type, onFollowUp, true);
    }

    function suppress(event: TouchEvent): void {
        if (event.cancelable) event.preventDefault();
        event.stopImmediatePropagation();
        if (event.type !== 'touchmove' && verbose.isVerbose)
            stylusDiagnostics.record('stylus', 'penTouchSuppressed', {
                inputEvent: event.type,
                eventTimeMs: event.timeStamp,
                touchId: event.changedTouches[0]?.identifier,
            });
    }

    window.addEventListener('touchstart', onStart, {
        ...CAPTURE_TOUCH,
        signal,
    });
    return {
        rememberPenDown(event: PointerEvent): void {
            if (event.isTrusted) lastPenDown = event;
        },
        reset(): void {
            lastPenDown = undefined;
            if (penTouches.size) {
                penTouches.clear();
                detachFollowUps();
            }
        },
    };
}
