# Canvas, scenes, and documents

[Foundry core](README.md) · [Hooks](hooks.md) · [Type catalog](../type-catalog.md)

## CanvasUtils

| Function | Result / behavior |
| --- | --- |
| `CanvasUtils.isReady()` | `boolean`; checks that the native canvas exists and is ready. |
| `CanvasUtils.getScene()` | Ready rendered `Scene`, otherwise `null`. |
| `CanvasUtils.getControlledTokens()` | Snapshot of controlled `Token` placeables, otherwise `[]`. |
| `CanvasUtils.getHoveredToken()` | Hovered `Token` placeable, otherwise `null`. |
| `CanvasUtils.getViewCenter()` | Owned `{ x, y }` snapshot of viewport center in world/stage pixels, otherwise `null`. |
| `CanvasUtils.getMousePosition()` | Owned world/stage pixel point, otherwise `null`. |
| `CanvasUtils.panTo(position, scale?)` | Immediate native pan; `false` if unavailable, `true` if invoked. |

`CanvasPosition` aliases the native point contract. Coordinates are not client-screen pixels or grid row/column offsets. View center uses the renderer dimensions and native PIXI `stage.toLocal`, accounting for the stage transform. Point/array containers are snapshots; tokens and documents remain live native objects.

```ts
import { HooksUtils, CanvasUtils } from '@template/foundry-core';

export const stop = HooksUtils.on('canvasReady', () => {
    const scene = CanvasUtils.getScene();
    const selected = CanvasUtils.getControlledTokens();
    const hovered = CanvasUtils.getHoveredToken();
    const center = CanvasUtils.getViewCenter();
    const mouse = CanvasUtils.getMousePosition();
    if (CanvasUtils.isReady() && center) {
        CanvasUtils.panTo(center, 1);
    }
    void scene;
    void selected;
    void hovered;
    void mouse;
});
```

This example invokes a pan for demonstration. Real features should pan only for an actual user/feature action. `panTo` requires finite coordinates and a finite positive scale when supplied; invalid values throw `RangeError` on an available canvas. It performs no animation, timer, or redraw loop; use native `animatePan` directly when animation is required.

## SceneUtils

| Function | Result / behavior |
| --- | --- |
| `SceneUtils.getContext()` | `SceneContext` with separate `active`, `viewed`, and `canvasReady` fields. |
| `SceneUtils.getTokensByActor(scene, actorOrId)` | `TokenDocument[]` from the explicit scene without rendering it. |

`active` is the player-active scene; `viewed` may be a different GM-viewed scene. Both normalize to `null` if unavailable. `canvasReady` describes rendering readiness, not document availability. These reads work with unavailable/disabled canvas.

```ts
import { SceneUtils } from '@template/foundry-core';
import { type Actor } from '@client/documents/_module.mjs';

export function locateActorInViewedScene(actor: Actor) {
    const context = SceneUtils.getContext();
    return context.viewed
        ? SceneUtils.getTokensByActor(context.viewed, actor)
        : [];
}
```

An actor ID or world actor matches linked and unlinked token references with that actor ID. A synthetic actor matches only its exact owning token, and only if that token belongs to the supplied scene. Passing an ID cannot preserve synthetic identity; pass the synthetic actor object for that behavior.

## DocumentUtils

| Function | Result / behavior |
| --- | --- |
| `DocumentUtils.isDocument(value)` | Native `foundry.abstract.Document` instance guard; document-shaped objects are insufficient. |
| `DocumentUtils.resolve(uuid, isExpectedDocument)` | Async native UUID resolution plus native-instance and subtype validation; `T` or `null`. |
| `DocumentUtils.resolveSync(uuid, isExpectedDocument)` | Synchronously available native document plus subtype validation; `T` or `null`. |

Resolvers require a caller-owned `DocumentGuard<T>`; there is no unchecked `resolve<T>(uuid)` cast. `FoundryDocument` aliases the native abstract document. Missing/wrong document types become `null`; resolver and guard exceptions propagate.

```ts
import { DocumentUtils, type FoundryDocument, type DocumentGuard } from '@template/foundry-core';
import { type Actor } from '@client/documents/_module.mjs';

const isActor: DocumentGuard<Actor> = (document: FoundryDocument): document is Actor =>
    document.documentName === 'Actor';

export async function resolveActor(uuid: string) {
    const actor = await DocumentUtils.resolve(uuid, isActor);
    return actor;
}

export function resolveAvailableActor(uuid: string) {
    return DocumentUtils.resolveSync(uuid, isActor);
}
```

The synchronous helper uses native `fromUuidSync` with `strict: false`. It rejects compendium index rows, even when their fields resemble a document; it does not asynchronously load full compendium documents. Use the async resolver when loading may be required. The subtype predicate should distinguish the actual expected native document kind rather than trusting unrelated payload fields.

The package's shared `FoundryGame` type and singleton declarations make host access type-safe; they do not make native runtime APIs available outside Foundry.

Source: [canvas](../../packages/foundry-core/src/canvas/canvas.utils.ts), [scene](../../packages/foundry-core/src/scene/scene.utils.ts), [document](../../packages/foundry-core/src/document/document.utils.ts).
