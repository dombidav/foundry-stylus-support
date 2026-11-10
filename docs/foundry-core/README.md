# Foundry core

[Wiki home](../README.md) · [Type catalog](../type-catalog.md)

Import from `@template/foundry-core`. This is the system-independent leaf workspace: it has no workspace or external runtime dependencies. Importing the package does not access Foundry globals, register hooks/settings, initialize the canvas, or construct module caches.

| Namespace | Functions | Guide |
| --- | --- | --- |
| `HooksUtils` | `on`, `once`, `onMany` | [Hooks](hooks.md) |
| `SettingsUtils` | `create`, `withVerboseMode` | [Settings and verbose mode](settings.md) |
| `CanvasUtils` | `isReady`, `getScene`, `getControlledTokens`, `getHoveredToken`, `getViewCenter`, `getMousePosition`, `panTo` | [Canvas, scenes, documents](canvas-scenes-documents.md) |
| `SceneUtils` | `getContext`, `getTokensByActor` | [Canvas, scenes, documents](canvas-scenes-documents.md) |
| `DocumentUtils` | `isDocument`, `resolve`, `resolveSync` | [Canvas, scenes, documents](canvas-scenes-documents.md) |

Factories and functions are explicit operations. A module may construct a settings facade at source-module scope, then register it during `init`. Hook subscriptions require the host and return cleanup. Canvas helpers normalize unavailable state to documented fallbacks; scene/document operations have their own contracts rather than a blanket "everything is ready" assumption.

```ts
import { CanvasUtils, SceneUtils } from '@template/foundry-core';

export function inspectSceneState() {
    return {
        context: SceneUtils.getContext(),
        renderedScene: CanvasUtils.getScene(),
    };
}
```

`context.active` can exist without a ready rendered scene. This is useful when canvas is disabled or a GM views another scene.

Root-exported contracts include `FoundryGame`, hook maps/names/cleanup, settings schemas and inferred values, verbose mode, canvas points, scene context, and document guards. The [type catalog](../type-catalog.md) lists each declaration, including internal registration/validation support types. Prefer package-root public imports in module code.

Source: [public exports](../../packages/foundry-core/src/index.ts). The [compatibility page](../compatibility-and-troubleshooting.md) records native sources, typing corrections, and deliberately deferred APIs.
