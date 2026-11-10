# Hooks

[Foundry core](README.md) · [Lifecycle](../lifecycle-and-features.md) · [Type catalog](../type-catalog.md)

## Subscription API

| Function | Contract |
| --- | --- |
| `HooksUtils.on(hook, callback)` | Register a persistent native listener and return `HookCleanup`. |
| `HooksUtils.once(hook, callback)` | Register a native one-shot listener and return cancellation/cleanup. |
| `HooksUtils.onMany(handlers)` | Register a record of persistent listeners and return one cleanup for the batch. |

Each cleanup captures native numeric registration IDs and is idempotent. It removes only registrations owned by that call, even if another listener used the same callback. `once` can be cancelled before firing; calling cleanup after it fires is harmless. Callbacks are forwarded directly to Foundry without an extra per-event wrapper.

```ts
import { HooksUtils } from '@template/foundry-core';

let lastActorUuid: string | null = null;

export const stopTracking = HooksUtils.on('updateActor', (actor) => {
    lastActorUuid = actor.uuid;
});

export function getLastActorUuid(): string | null {
    return lastActorUuid;
}

// The owning feature calls stopTracking() when disposed; repeated calls are safe.
```

For a one-time lifecycle callback:

```ts
import { HooksUtils } from '@template/foundry-core';
import { settings } from '../../packages/module/src/settings.ts';

export const cancelRegistration = HooksUtils.once('init', () => {
    settings.register();
});
```

Use this pattern in place of equivalent bootstrap registration, not alongside the existing entry point for the same instance.

## Batch registration

```ts
import { HooksUtils } from '@template/foundry-core';

export let isCanvasReady = false;
export const stopCanvasTracking = HooksUtils.onMany({
    canvasReady: () => { isCanvasReady = true; },
    canvasTearDown: () => { isCanvasReady = false; },
});
```

Register before the first event you need to observe. `onMany` uses persistent listeners even if a key names a one-time lifecycle event. If a later native registration throws, earlier successful registrations are removed before rethrowing. An empty record returns a no-op cleanup without accessing `Hooks`. A record cannot repeat the same key; use multiple `on` calls for multiple handlers of one event.

## KnownHookEvents

The optional typed callback map is implemented with **53 verified literal names**, without a runtime hook catalog:

| Family | Names / callback arguments |
| --- | --- |
| Lifecycle | `init`, `i18nInit`, `setup`, `ready`: no arguments. |
| Canvas | `canvasInit`, `canvasReady`: native canvas. |
| Pan | `canvasPan`: canvas and `CanvasPanPosition`, including level ID. |
| Teardown | `canvasTearDown`: canvas and `CanvasTearDownOptions`. |
| Control / hover | `controlToken`, `hoverToken`: token placeable and boolean state. |
| Target | `targetToken`: user, token placeable, boolean state. |
| Document lifecycle | Six prefixes below for each of `Actor`, `ActiveEffect`, `Combat`, `Item`, `Scene`, `Token`, `User` (42 names). |

`Token` document lifecycle events receive a `TokenDocument`, while control/hover/target events receive a rendered `Token` placeable.

| Document prefix | Arguments | Cancellation |
| --- | --- | --- |
| `preCreate` | document, creation data, native create options, user ID | Synchronous `false` cancels. |
| `create` | document, native create options, user ID | None from the callback result. |
| `preUpdate` | document, changed data, native update options, user ID | Synchronous `false` cancels. |
| `update` | document, changed data, native update options, user ID | None from the callback result. |
| `preDelete` | document, native delete options, user ID | Synchronous `false` cancels. |
| `delete` | document, native delete options, user ID | None from the callback result. |

Data/change records are `Record<string, unknown>` because native updates may use flattened dotted paths. Operation options reuse partial native database operation contracts.

```ts
import { HooksUtils, type HookCallbackFor } from '@template/foundry-core';

const protectActor: HookCallbackFor<'preDeleteActor'> = (actor) => {
    if (actor.name === 'Protected example') return false;
};

export const stopProtection = HooksUtils.on('preDeleteActor', protectActor);
```

Hook dispatch is not awaited. Cancellation callbacks reject async functions at compile time. Other callbacks may start asynchronous work, but Foundry will not wait for it. Explicitly sequence dependent work inside its owner.

## Custom hooks and inference

```ts
import { HooksUtils, type HookName } from '@template/foundry-core';

const hook: HookName = 'my-module.changed';
export const stopCustom = HooksUtils.on(hook, (payload: { isEnabled: boolean }) => {
    if (payload.isEnabled) {
        // React to the feature's documented custom payload.
    }
});
```

`KnownHooks` is `keyof KnownHookEvents`. `HookName` also accepts arbitrary strings while retaining known-name autocomplete. Keep names literal for the strongest checks; a widened `string` cannot preserve literal-specific payload inference. Known literal callbacks cannot widen their hook name into the custom fallback to bypass checking.

`HookCallbackFor<H>` chooses a known signature or the custom `HookCallback`. Custom payloads must be annotated by the consumer. `HookCallback` uses a `never[]` parameter list to accept explicitly typed callbacks without `any` or an `unknown[]` variance restriction; the helper forwards it and does not invoke it itself. `HookHandlers<H>` maps each batch key to its own signature. `HookCleanup` is a no-argument cleanup function.

These helpers subscribe only. They add no event emitter, event bus, polling, or lifecycle scheduler. Native emission remains a separate Foundry API.

Source: [hook functions](../../packages/foundry-core/src/hooks/hooks.utils.ts) and [declarations](../../packages/foundry-core/src/hooks/hooks.types.d.ts).
