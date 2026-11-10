import { type NativeGestureAction, type ToolId } from './stylus.types.js';
import { canOverrideSnap } from './tools.ts';

export function installNativeGestureControls(
    current: foundry.canvas.Canvas,
    getTool: () => ToolId | undefined,
    shouldKeepRuler: () => boolean,
    isClaimed: (pointerId: number) => boolean,
    showSnapReady: (isReady: boolean) => void,
) {
    const manager = current.mouseInteractionManager;
    const canContinueNative = manager.callback;
    const hasOwnCallback = Object.hasOwn(manager, 'callback');
    let isMounted = true;
    let isSnapReady = false;
    let snapPointer: number | undefined;
    let isShiftOverride = false;
    let isVertexOverride = false;
    let keptRuler: Record<string, unknown> | undefined;

    function clearKeptRuler(): void {
        const interaction = keptRuler;
        keptRuler = undefined;
        if (
            interaction &&
            manager.interactionData === interaction &&
            current.controls.ruler.active
        ) {
            interaction.cancelled = true;
            manager.cancel();
        }
    }

    const canContinueGesture: typeof canContinueNative = function (
        action,
        event,
        ...args
    ) {
        if (
            !isMounted ||
            (action !== 'dragLeftStart' &&
                action !== 'dragLeftMove' &&
                action !== 'dragLeftDrop' &&
                action !== 'dragLeftCancel') ||
            !(event instanceof PIXI.FederatedPointerEvent)
        )
            return canContinueNative.call(manager, action, event, ...args);
        if (action === 'dragLeftCancel' && !event.defaultPrevented)
            snapPointer = undefined;
        if (event.pointerType !== 'pen')
            return canContinueNative.call(manager, action, event, ...args);
        const isDrop = action === 'dragLeftDrop';
        if (isDrop && isClaimed(event.pointerId)) {
            // Pixi listens for pointerup on Window before the module. Keep the native preview open
            // when this release belongs to a captured button tap instead of a native drag.
            event.preventDefault();
            return false;
        }
        const tool =
            action === 'dragLeftStart' && isSnapReady ? getTool() : undefined;
        if (tool && canOverrideSnap(tool)) {
            snapPointer = event.pointerId;
            isVertexOverride = tool !== 'measure' && current.forceSnapVertices;
            isShiftOverride = isVertexOverride || !event.shiftKey;
            isSnapReady = false;
            showSnapReady(false);
        }
        const shouldOverrideSnap =
            snapPointer === event.pointerId &&
            (action === 'dragLeftStart' || action === 'dragLeftMove' || isDrop);
        const shouldContinue =
            isDrop &&
            manager.interactionData.ruler === true &&
            !event.ctrlKey &&
            !event.metaKey &&
            shouldKeepRuler();
        if (!shouldOverrideSnap && !shouldContinue)
            return canContinueNative.call(manager, action, event, ...args);

        // Native shapes and rulers read these modifiers synchronously. Scope the changes to this
        // callback so keyboard state and unrelated Foundry interactions retain their native values.
        const wasShift = event.shiftKey;
        const wasCtrl = event.ctrlKey;
        // Forced vertex snapping takes precedence over Shift in v14 shapes. Shadow its getter
        // only during geometry work, since the public setter rerenders the scene controls.
        const snapDescriptor =
            shouldOverrideSnap && isVertexOverride
                ? Object.getOwnPropertyDescriptor(current, 'forceSnapVertices')
                : undefined;
        const shouldShadowVertices =
            shouldOverrideSnap &&
            isVertexOverride &&
            snapDescriptor?.configurable !== false;
        if (shouldShadowVertices)
            Object.defineProperty(current, 'forceSnapVertices', {
                configurable: true,
                value: false,
            });
        if (shouldOverrideSnap) event.shiftKey = isShiftOverride;
        if (shouldContinue) event.ctrlKey = true;
        try {
            const canContinue = canContinueNative.call(
                manager,
                action,
                event,
                ...args,
            );
            if (shouldContinue && manager.interactionData.released === true)
                keptRuler = manager.interactionData;
            return canContinue;
        } finally {
            event.shiftKey = wasShift;
            event.ctrlKey = wasCtrl;
            if (shouldShadowVertices) {
                if (snapDescriptor)
                    Object.defineProperty(
                        current,
                        'forceSnapVertices',
                        snapDescriptor,
                    );
                else Reflect.deleteProperty(current, 'forceSnapVertices');
            }
            if (isDrop && shouldOverrideSnap) snapPointer = undefined;
        }
    };
    manager.callback = canContinueGesture;

    return {
        clearKeptRuler,
        toggleSnap(): void {
            isSnapReady = !isSnapReady;
            showSnapReady(isSnapReady);
        },
        stop(): void {
            clearKeptRuler();
            isMounted = false;
            if (manager.callback === canContinueGesture) {
                if (hasOwnCallback) manager.callback = canContinueNative;
                else Reflect.deleteProperty(manager, 'callback');
            }
            if (isSnapReady) showSnapReady(false);
        },
    };
}

export function runNativeGestureAction(
    current: foundry.canvas.Canvas,
    tool: ToolId | undefined,
    action: NativeGestureAction,
    event: PointerEvent,
): void {
    const manager = current.mouseInteractionManager;
    const interaction = manager.interactionData;
    if (tool === 'measure') {
        const ruler = current.controls.ruler;
        const destination = ruler.destination;
        if (!destination) return;

        if (
            action === 'cancelGesture' ||
            (action === 'removePoint' && ruler.path.length <= 2)
        ) {
            if (interaction.ruler === true) {
                interaction.cancelled = true;
                manager.cancel();
            }
            if (ruler.active) ruler.reset();
        } else if (action === 'removePoint') {
            ruler.path = ruler.path.toSpliced(-2, 1);
        } else {
            const point = current.canvasCoordinatesFromClient({
                x: event.clientX,
                y: event.clientY,
            });
            const position = event.shiftKey
                ? point
                : foundry.canvas.interaction.BaseRuler.getSnappedPoint(point);
            const previous = ruler.path.at(-2);
            if (
                previous &&
                previous.x === position.x &&
                previous.y === position.y &&
                previous.elevation === destination.elevation
            )
                return;
            const waypoint = { ...position, elevation: destination.elevation };
            ruler.path = [...ruler.path.slice(0, -1), waypoint, waypoint];
        }
        return;
    }

    if (!(interaction.preview instanceof foundry.canvas.placeables.Drawing))
        return;
    if (action === 'cancelGesture') {
        interaction.cancelled = true;
        manager.cancel();
        return;
    }
    const shape = interaction.shape;
    if (
        tool !== 'polygon' ||
        !(shape instanceof foundry.data.PolygonShapeData) ||
        interaction.cancelled
    )
        return;
    if (action === 'removePoint') {
        manager.cancel(); // In v14, cancel first removes the last fixed point of an open polygon.
        return;
    }
    if (shape.points.length < 8) return; // Three fixed vertices and one moving preview vertex.

    // Run the v14 double-click and drop callbacks on the existing preview. The native drop commits it
    // and defers preview cleanup until document creation has finished. No extra board click is sent.
    const drop = new Event('pointerup', { cancelable: true });
    if (!manager.can('clickLeft2', drop) || !manager.can('dragLeftDrop', drop))
        return;
    manager.callback('clickLeft2', drop);
    manager.callback('dragLeftDrop', drop);
    manager.cancel();
}
