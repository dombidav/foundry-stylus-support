# Lifecycle and features

[Wiki home](README.md) · [Architecture](architecture.md) · [Settings](foundry-core/settings.md)

## Current bootstrap

[main.ts](../packages/module/src/main.ts) registers one `Hooks.once` handler for each stage. [lifecycle.ts](../packages/module/src/lifecycle.ts) contains their implementation:

| Phase | Current behavior | Appropriate additions |
| --- | --- | --- |
| `init` | Register browser-local settings and the stylus settings submenu. | Explicit native registrations needed by the module. |
| `setup` | Read saved `isVerbose` and initialize the cache. | Read registered settings and configure feature state. |
| `ready` | Mount the floating stylus controls in D&D 5e. | World/document-dependent feature startup. |
| `canvasReady` | Attach stylus board listeners when the touch override is active. | Scene/placeable-dependent work that must follow canvas redraws. |
| `canvasTearDown` | Release board listeners and hide the toolbar. | Release resources tied to the old canvas/scene. |

```ts
import { onInit, onSetup, onReady } from '../packages/module/src/lifecycle.ts';

Hooks.once('init', onInit);
Hooks.once('setup', onSetup);
Hooks.once('ready', onReady);
```

This is the entry point's pattern, not additional bootstrap code to register alongside the existing entry point. Importing `lifecycle.ts` defines handlers and constructs the settings facade; native settings registration occurs only when `onInit` runs.

Foundry hook dispatch does not await callbacks. An async callback can start work, but later lifecycle phases do not wait for its Promise. Keep synchronous prerequisites synchronous, and explicitly sequence any dependent asynchronous work within the feature that owns it. Cancellation pre-hooks require synchronous decisions.

## Add a feature

The three files in `src/features/example` are intentionally empty. Put feature startup/handlers in `example.ts`, declarations in `example.types.d.ts`, and standalone helpers in `example.utils.ts`. Avoid empty runtime wrappers; a feature can remain one file until it needs more.

For example, the following feature subscribes to one native event and returns ownership of its cleanup:

```ts
import { HooksUtils, type HookCleanup } from '@template/foundry-core';
import { verbose } from '../packages/module/src/settings.ts';

export function registerActorDiagnostics(): HookCleanup {
    return HooksUtils.on('updateActor', (actor, changed) => {
        verbose.debug('Actor updated', () => ({
            uuid: actor.uuid,
            changed,
        }));
    });
}
```

Call feature registration once from the appropriate lifecycle handler. Keep the returned cleanup when the feature can be disabled or disposed before the session ends. For a temporary tool, the owner can return that cleanup to its caller:

```ts
import { HooksUtils, type HookCleanup } from '@template/foundry-core';
import { verbose } from '../packages/module/src/settings.ts';

export function startSelectionDiagnostics(): HookCleanup {
    const stop = HooksUtils.on('controlToken', (token, isControlled) => {
        verbose.debug(token.id, isControlled);
    });
    return stop;
}

// A caller starts the tool, then calls stop() when that tool closes.
```

There is no generic feature manager or automatic module-deactivation hook in this template. The actual UI/feature owner must invoke cleanup when its own lifetime ends. Use `canvasReady` for repeated canvas lifetimes; a world-level `ready` callback does not repeat for each scene.

## Share state intentionally

Other module files import the existing `settings` and `verbose` instances from `settings.ts`. Do not create another facade for the same registered keys. A second module should own a separate settings file, ID, and verbose controller.

```ts
import { settings, verbose } from '../packages/module/src/settings.ts';

export function inspectExampleSettings(): void {
    verbose.debug(() => ({
        hasBindings: settings.get('stylusBindings') !== '[]',
    }));
}
```

Call this after initialization. Disabled verbose mode skips the settings read because it is inside the producer.

## Test the same boundaries

- `tests/main.test.ts` checks stage-to-handler wiring and deferred initialization.
- `tests/lifecycle.test.ts` checks registration, saved verbose state, and ready behavior.
- `tests/settings.test.ts` checks inferred value contracts without reading host settings at test runtime.
- Feature tests belong under `tests/features/example/`, matching the eventual source files. `.gitkeep` preserves the empty directory until real behavior exists.
