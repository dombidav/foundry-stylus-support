import { type StylusPoint } from './stylus.types.js';

export function findDrawingToErase(
    current: foundry.canvas.Canvas,
    point: StylusPoint,
): foundry.canvas.placeables.Drawing | undefined {
    const radius = 6 / current.stage.scale.x;
    const bounds = new PIXI.Rectangle(
        point.x - radius,
        point.y - radius,
        radius * 2,
        radius * 2,
    );
    const candidates =
        current.drawings.quadtree?.getObjects(bounds) ??
        current.drawings.placeables;
    let top: foundry.canvas.placeables.Drawing | undefined;
    for (const drawing of candidates) {
        const { document } = drawing;
        if (
            !drawing.visible ||
            !drawing.shape?.worldVisible ||
            document.locked ||
            !document.canUserModify(game.user, 'delete')
        )
            continue;
        if (!isPointOnDrawing(current, drawing, point, radius)) continue;
        if (!top || compareDrawings(drawing, top) > 0) top = drawing;
    }
    return top;
}

function compareDrawings(
    a: foundry.canvas.placeables.Drawing,
    b: foundry.canvas.placeables.Drawing,
): number {
    return (
        Number('interface' in a.document && a.document.interface === true) -
            Number(
                'interface' in b.document && b.document.interface === true,
            ) ||
        a.document.elevation - b.document.elevation ||
        drawingSort(a.document) - drawingSort(b.document) ||
        (a.shape.parent && a.shape.parent === b.shape.parent
            ? a.shape.parent.getChildIndex(a.shape) -
              a.shape.parent.getChildIndex(b.shape)
            : 0)
    );
}

function drawingSort(document: foundry.documents.DrawingDocument): number {
    return 'sort' in document && typeof document.sort === 'number'
        ? document.sort
        : 0;
}

function isPointOnDrawing(
    current: foundry.canvas.Canvas,
    drawing: foundry.canvas.placeables.Drawing,
    point: StylusPoint,
    radius: number,
): boolean {
    const { document } = drawing;
    // v14 DrawingDocument exposes its prepared, rotated world-space shape. The installed
    // declarations omit this member, so narrow to the concrete Foundry shape classes.
    const shape = '_shape' in document ? document._shape : undefined;
    if (
        shape instanceof foundry.data.RectangleShapeData ||
        shape instanceof foundry.data.EllipseShapeData
    ) {
        return shape.testPoint(point);
    }
    if (!(shape instanceof foundry.data.PolygonShapeData)) return false;
    // Foundry turns freehand control points into a smoothed polygon in Pixi. Reuse the
    // tessellated path for the tap instead of testing the chords between control points.
    const data = drawing.shape.geometry.graphicsData[0];
    if (!data || !(data.shape instanceof PIXI.Polygon)) return false;
    const path = data.shape;
    const local = drawing.shape.toLocal(point, current.stage);
    if (data.fillStyle.visible && path.contains(local.x, local.y)) return true;
    return (
        data.lineStyle.visible &&
        isNearPath(
            local,
            path.points,
            radius + data.lineStyle.width / 2,
            path.closeStroke,
        )
    );
}

export function isNearPath(
    point: StylusPoint,
    points: readonly number[],
    radius: number,
    isClosed = false,
): boolean {
    const radiusSquared = radius * radius;
    let x = (isClosed ? points.at(-2) : points[0])!;
    let y = (isClosed ? points.at(-1) : points[1])!;
    for (let index = isClosed ? 0 : 2; index + 1 < points.length; index += 2) {
        const dx = points[index]! - x;
        const dy = points[index + 1]! - y;
        const lengthSquared = dx * dx + dy * dy;
        const t = lengthSquared
            ? Math.min(
                  1,
                  Math.max(
                      0,
                      ((point.x - x) * dx + (point.y - y) * dy) / lengthSquared,
                  ),
              )
            : 0;
        const distanceX = point.x - x - t * dx;
        const distanceY = point.y - y - t * dy;
        if (distanceX * distanceX + distanceY * distanceY <= radiusSquared)
            return true;
        x = points[index]!;
        y = points[index + 1]!;
    }
    return false;
}

export function selectLassoTokens(
    current: foundry.canvas.Canvas,
    points: number[],
    shouldAdd: boolean,
): void {
    if (points.length < 6) return;
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (let index = 0; index < points.length; index += 2) {
        const x = points[index]!;
        const y = points[index + 1]!;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
    }
    if (left === right || top === bottom) return;
    const polygon = new PIXI.Polygon(points);
    const bounds = new PIXI.Rectangle(left, top, right - left, bottom - top);
    const candidates =
        current.tokens.quadtree?.getObjects(bounds) ??
        current.tokens.placeables;
    const selected = new Set<foundry.canvas.placeables.Token>();
    for (const token of candidates) {
        if (
            !token.isVisible ||
            !token.visible ||
            !token.renderable ||
            !token.interactive
        )
            continue;
        const center = token.center;
        if (polygon.contains(center.x, center.y)) selected.add(token);
    }
    // The v14 selection UI supports batching, but the installed declarations omit these fields.
    const directory = 'placeables' in ui ? ui.placeables : undefined;
    const renderDirectory =
        directory && typeof directory === 'object' && 'render' in directory
            ? directory.render
            : undefined;
    const canBatch = typeof renderDirectory === 'function';
    const releaseOptions = { renderSidebar: !canBatch };
    const controlOptions = { releaseOthers: false, renderSidebar: !canBatch };
    let hasChanged = false;
    if (!shouldAdd)
        for (const token of current.tokens.controlled) {
            if (!selected.has(token))
                hasChanged = token.release(releaseOptions) || hasChanged;
        }
    for (const token of selected) {
        if (!token.controlled)
            hasChanged = token.control(controlOptions) || hasChanged;
    }
    if (hasChanged && canBatch) {
        renderDirectory.call(directory);
        const palette =
            'placeablesPalette' in ui ? ui.placeablesPalette : undefined;
        if (
            game.activeTool === 'select' &&
            palette &&
            typeof palette === 'object' &&
            'render' in palette &&
            typeof palette.render === 'function'
        )
            palette.render();
    }
}
