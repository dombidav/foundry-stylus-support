import { findDrawingToErase, selectLassoTokens } from './canvas-tools.ts';
import { type ToolId } from './stylus.types.js';

export function createTipGestures(
    board: HTMLCanvasElement,
    current: foundry.canvas.Canvas,
    getTool: () => ToolId | undefined,
    onError: (error: unknown) => void,
) {
    let pointerId: number | undefined;
    let tool: 'eraser' | 'lasso' | undefined;
    let preview: PIXI.Graphics | undefined;
    const points: number[] = [];
    let lastX = 0;
    let lastY = 0;
    let shouldAdd = false;
    let hasDragged = false;
    const deleting = new WeakSet<foundry.documents.DrawingDocument>();

    function cancel(): void {
        if (pointerId !== undefined && board.hasPointerCapture(pointerId))
            board.releasePointerCapture(pointerId);
        pointerId = undefined;
        tool = undefined;
        points.length = 0;
        preview?.destroy();
        preview = undefined;
    }

    function hasHandled(event: PointerEvent): boolean {
        // Swipe may emit synthetic mouse events for finger gestures. Only the physical mouse and pen use these tools.
        if (
            event.pointerType !== 'pen' &&
            !(event.pointerType === 'mouse' && event.isTrusted)
        )
            return false;
        if (event.type === 'pointerdown') {
            if (event.target !== board || event.buttons !== 1) return false;
            const selectedTool = getTool();
            if (selectedTool !== 'eraser' && selectedTool !== 'lasso')
                return false;
            if (pointerId !== undefined) return true;
            if (game.paused && !game.user.isGM) return true;
            pointerId = event.pointerId;
            tool = selectedTool;
            lastX = event.clientX;
            lastY = event.clientY;
            hasDragged = false;
            if (event.isTrusted) board.setPointerCapture(pointerId);
            if (tool === 'lasso') {
                const point = current.canvasCoordinatesFromClient({
                    x: event.clientX,
                    y: event.clientY,
                });
                shouldAdd = event.shiftKey;
                points.push(point.x, point.y);
                preview = new PIXI.Graphics();
                preview.eventMode = 'none';
                preview
                    .lineStyle(2 / current.stage.scale.x, 0x72dbff, 0.9)
                    .moveTo(point.x, point.y);
                current.controls.addChild(preview);
            }
            return true;
        }
        if (pointerId !== event.pointerId) return false;
        if (event.type === 'pointermove') {
            if (preview) addPoint(event, preview);
            else
                hasDragged ||=
                    Math.hypot(event.clientX - lastX, event.clientY - lastY) >
                    6;
        } else if (event.type === 'pointerup') {
            try {
                if (getTool() !== tool || (game.paused && !game.user.isGM))
                    return true;
                if (preview) {
                    addPoint(event, preview);
                    selectLassoTokens(current, points, shouldAdd);
                } else if (
                    !hasDragged &&
                    Math.hypot(event.clientX - lastX, event.clientY - lastY) <=
                        6
                ) {
                    const point = current.canvasCoordinatesFromClient({
                        x: event.clientX,
                        y: event.clientY,
                    });
                    const drawing = findDrawingToErase(current, point);
                    const document = drawing?.document;
                    if (document && !deleting.has(document)) {
                        deleting.add(document);
                        void document
                            .delete()
                            .catch(onError)
                            .finally(() => deleting.delete(document));
                    }
                }
            } finally {
                cancel();
            }
        } else if (
            event.type === 'pointercancel' ||
            event.type === 'lostpointercapture'
        ) {
            cancel();
        }
        return true;
    }

    function addPoint(event: PointerEvent, line: PIXI.Graphics): void {
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        if (dx * dx + dy * dy < 9) return;
        const point = current.canvasCoordinatesFromClient({
            x: event.clientX,
            y: event.clientY,
        });
        // Pixi finalizes the open path during rendering. Start the next batch at the last
        // sampled point so lineTo cannot fall back to (0, 0) between frames.
        if (!line.currentPath?.points.length)
            line.moveTo(points.at(-2)!, points.at(-1)!);
        line.lineTo(point.x, point.y);
        points.push(point.x, point.y);
        lastX = event.clientX;
        lastY = event.clientY;
    }

    return { hasHandled, cancel };
}
