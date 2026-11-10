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
        if (!isPointOnDrawing(drawing, point, radius)) continue;
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
    if (document.fillType && document.fillAlpha && shape.testPoint(point))
        return true;
    return isNearPath(
        point,
        shape.points,
        radius + (document.strokeWidth ?? 0) / 2,
    );
}

export function isNearPath(
    point: StylusPoint,
    points: readonly number[],
    radius: number,
): boolean {
    for (let index = 2; index + 1 < points.length; index += 2) {
        const x = points[index - 2]!;
        const y = points[index - 1]!;
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
        if (distanceX * distanceX + distanceY * distanceY <= radius * radius)
            return true;
    }
    return false;
}

export function selectLassoTokens(
    current: foundry.canvas.Canvas,
    points: number[],
    shouldAdd: boolean,
): void {
    if (points.length < 6) return;
    const polygon = new PIXI.Polygon(points);
    const bounds = new PIXI.Rectangle();
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
    bounds.x = left;
    bounds.y = top;
    bounds.width = right - left;
    bounds.height = bottom - top;
    const candidates =
        current.tokens.quadtree?.getObjects(bounds) ??
        current.tokens.placeables;
    const selected = new Set<foundry.canvas.placeables.Token>();
    for (const token of candidates) {
        if (!token.isVisible) continue;
        const center = token.center;
        if (polygon.contains(center.x, center.y)) selected.add(token);
    }
    if (!shouldAdd)
        for (const token of current.tokens.controlled) {
            if (!selected.has(token)) token.release();
        }
    for (const token of selected) {
        if (!token.controlled) token.control({ releaseOthers: false });
    }
}
