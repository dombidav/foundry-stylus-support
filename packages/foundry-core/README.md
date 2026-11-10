# Foundry core

Wiki: [Foundry core guide](../../docs/foundry-core/README.md), [settings and verbose mode](../../docs/foundry-core/settings.md), [type catalog](../../docs/type-catalog.md).

System-independent Foundry VTT v14 helpers. All exports are standalone functions grouped with native ESM namespace re-exports. The package has no workspace dependencies or external runtime dependencies. Importing it does not access globals, register hooks/settings, create caches, or initialize Foundry.

Tests live in `tests/`, mirroring `src/`. Run `npm run check` and `npm run build` from the repository root.

## Implemented API

| Namespace       | Functions                                                                                                     | Added value                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `HooksUtils`    | `on`, `once`, `onMany`                                                                                        | Typed callbacks, idempotent cleanup, batch rollback                                    |
| `SettingsUtils` | `create`, `withVerboseMode`                                                                                   | Typed settings, explicit registration, runtime validation, cached lazy debug logging |
| `CanvasUtils`   | `isReady`, `getScene`, `getControlledTokens`, `getHoveredToken`, `getViewCenter`, `getMousePosition`, `panTo` | Readiness checks, owned snapshots, explicit coordinate semantics                       |
| `SceneUtils`    | `getContext`, `getTokensByActor`                                                                              | Active/viewed distinction and correct synthetic actor identity                         |
| `DocumentUtils` | `isDocument`, `resolve`, `resolveSync`                                                                        | Native document validation and caller-provided subtype guards                          |

`src/foundry.d.ts` owns the shared `@dfreds/foundry-types` reference and missing `game`, `ui`, and `canvas` singleton declarations. D&D-specific typing stays in `dnd5e-core`. Merely having these declarations in a TypeScript program performs no runtime initialization.

## Typed hooks and cleanup

```ts
import { HooksUtils } from '@template/foundry-core';

const stop = HooksUtils.on('updateActor', (actor, changed, options, userId) => {
  // Actor, Record<string, unknown>, native update options, string
  void [actor, changed, options, userId];
});

HooksUtils.on('my-module.changed', (payload: { enabled: boolean }) => {
  void payload.enabled;
});

stop();
stop(); // Safe: this registration is removed only once.
```

`KnownHookEvents` implements the optional callback map. It contains **53 verified names**: 11 lifecycle/canvas/token events and six generic document lifecycle events for each of Actor, ActiveEffect, Combat, Item, Scene, Token, and User. `KnownHooks` is its key union; `HookName` uses `KnownHooks | (string & {})` to retain name suggestions while permitting arbitrary custom strings. There is no runtime hook-name array or registry.

The map covers `init`, `i18nInit`, `setup`, `ready`, `canvasInit`, `canvasReady`, `canvasPan`, `canvasTearDown`, `controlToken`, `hoverToken`, and `targetToken`, plus the typed `preCreate`/`create`/`preUpdate`/`update`/`preDelete`/`delete` document-name variants. This is a curated set, not an exhaustive catalog of every v14 event. Other hook names remain usable as custom strings.

Known literal names determine callback types with `NoInfer`; callbacks cannot widen the inferred name into the custom-string fallback. Mixed `onMany` records infer each known callback independently. Dynamically widened `string` variables cannot retain literal-specific checks; preserve literal names for the strongest typing. Custom hooks have no inferred payload contract, so annotate their parameters explicitly. The fallback `HookCallback` uses `never[]` and is never invoked by these helpers, avoiding both `any` and the parameter-variance restriction of `unknown[]`.

Document hooks use native document/operation types. Differential data stays `Record<string, unknown>` because updates can use flattened dotted paths. The installed package omits some v14 details; the map follows the official API for the fourth update-hook `userId`, synchronous pre-update arguments, the canvas-pan level ID, and canvas teardown options. `CanvasPanPosition` and `CanvasTearDownOptions` supply those missing fields without changing dependency files.

`on` and `once` capture native numeric registration IDs and return idempotent cleanup functions. Original callbacks are forwarded without per-event wrappers. Native `once` handles automatic removal; its cleanup can cancel before firing and is harmless afterward. It never cleans up unrelated registrations.

```ts
import { HooksUtils } from '@template/foundry-core';

const stopAll = HooksUtils.onMany({
  ready: () => {},
  canvasReady: (canvas) => {
    void canvas.scene;
  },
  'my-module.changed': (payload: { count: number }) => {
    void payload.count;
  },
});
stopAll();
```

`onMany` registers persistent listeners, returns one cleanup, and removes successful registrations if a later registration throws. An empty record is a no-op. A record cannot repeat a key; call `on` separately for multiple callbacks on one hook. One-time lifecycle events do not imply cleanup of other listeners.

Hooks are not awaited. Cancellation hooks accept synchronous `boolean | void` callbacks; async cancellation handlers are rejected. Other hooks may start async work, but Foundry does not wait for it. These helpers do not emit events or add an event bus.

## Typed settings

```ts
import { HooksUtils, SettingsUtils } from '@template/foundry-core';

const settings = SettingsUtils.create('my-module', {
  isEnabled: { scope: 'world', default: true },
  maxTokens: { scope: 'client', default: 10 },
});

HooksUtils.once('init', () => settings.register());
HooksUtils.once('ready', async () => {
  const isEnabled = settings.get('isEnabled'); // boolean
  const value = await settings.set('maxTokens', 12); // number: native assigned value
  void [isEnabled, value];
});
```

The factory constructs a local typed facade without touching Foundry. Explicit `register()` belongs in `init`; reads should wait until `setup` or later, when settings are initialized. Each facade tracks its own successful registrations, so repeated `register()` calls skip those keys and a partial registration failure can be retried. Use one facade per namespace/schema and do not register the same keys separately through another facade or native calls.

Settings appear in Foundry's configuration UI by default. Use `isHidden: true` to hide a setting while retaining programmatic access through `get` and `set`. `isHidden` defaults to `false` and maps to native `config: !isHidden`; the facade does not accept `config` in its schema or forward `isHidden` to Foundry.

Boolean, finite-number, and string defaults determine the native primitive kind. Direct defaults without a choice map widen to their primitive value type. A statically known choice map instead infers its string key union for `get`, `set`, and `reset`; no `as const` is needed for inline schemas. Keys and primitive callback types are inferred from the schema; wrong keys, wrong values, and mismatched callbacks fail typechecking. Direct choice defaults must belong to the choice map. Native `world`, `client`, and `user` scopes are supported. Optional names default to `<namespace>.<key>`. Hints, UI visibility, reload metadata, string choices, and numeric range metadata are forwarded. The installed declarations' numeric range and custom-input omissions are corrected at one documented native-registration boundary while preserving the receiver and runtime metadata.

`default` and `choices` also accept **synchronous, fast, side-effect-free** callbacks. Defaults are resolved at registration and re-evaluated by facade `reset`; their primitive kind must stay stable. Choices are evaluated only when the native input renders, never on reads/writes. Inference uses choice return-map keys first, then a default callback's return type, with `string` as fallback. Dynamic `Record<string, string>` choices yield `string`; literal return maps retain their key union. Explicit return annotations such as `(): number => 5` or `(): 'a' | 'b' => 'a'` control default callback inference. See [callback examples and timing](../../docs/foundry-core/settings.md#callback-defaults-and-runtime-choices).

`get` validates the native value's primitive kind. `set` validates input and the native resolved value and returns it, rather than discarding it as `void`. Fixed-map choice membership is also checked during registration, reads, writes, and change callbacks with a direct own-key lookup; invalid saved fixed choices throw. Callback choices are UI-only: removed IDs stay readable and are preserved as unavailable selections in the dropdown. Narrow callback return unions are compile-time contracts. Native write errors and permissions propagate. Change callbacks receive validated values and retain their native return semantics. The facade does not cache setting values, broadcast extra messages, enforce numeric range rules itself, or grant write permissions. Complex objects, arrays, nullable settings, caller-supplied DataModels/DataFields, menus, and document-return options remain native APIs until a concrete typed use case warrants more.

```ts
import { HooksUtils, SettingsUtils } from '@template/foundry-core';

const settings = SettingsUtils.create('my-module', {
  testChoice: {
    scope: 'world',
    default: 'first',
    choices: { first: 'First', second: 'Second', third: 'Third' },
  },
});

HooksUtils.once('init', () => settings.register());
HooksUtils.once('ready', async () => {
  const choice: 'first' | 'second' | 'third' = settings.get('testChoice');
  await settings.set('testChoice', 'second');
  void choice;
});
```

Prefer inference over explicit factory type arguments. If a choice map has already been widened to `Record<string, string>`, its original key union cannot be recovered and the result remains `string`; fixed maps still receive runtime membership validation. When extracting a schema into a variable, retain the direct choice default's literal type so its membership can be checked.

`reset(key)` restores the schema default through the same validated write path as `set`. It requires registration, returns the assigned primitive value, propagates native permission/write errors, and preserves native change callbacks, including the verbose cache update.

`SettingsValuesOf<typeof settings>` extracts resolved values, including choice unions, and `SettingKeyOf<typeof settings>` extracts valid keys. Both are type-only exports:

```ts
import { SettingsUtils, type SettingsValuesOf, type SettingKeyOf } from '@template/foundry-core';

const settings = SettingsUtils.create('my-module', {
  isEnabled: { scope: 'world', default: true },
  maxTokens: { scope: 'client', default: 10 },
});

const key: SettingKeyOf<typeof settings> = 'maxTokens';
const defaults: SettingsValuesOf<typeof settings> = { isEnabled: true, maxTokens: 10 };
// After init registration, from a runtime feature:
await settings.reset(key); // number
```

### Verbose mode

```ts
import { HooksUtils, SettingsUtils } from '@template/foundry-core';

export const verbose = SettingsUtils.withVerboseMode({ prefix: 'my-module' });
export const settings = SettingsUtils.create('my-module', {
  isEnabled: { scope: 'world', default: true },
  ...verbose.schema,
});

HooksUtils.once('init', () => settings.register());
HooksUtils.once('setup', () => {
  verbose.initialize(settings.get('isVerbose'));
});

// Call from runtime features; other files can import this module's verbose instance.
verbose.debug('State', () => ({ sceneName: canvas?.scene?.name }));
verbose.debugTable(() => [{ sceneName: canvas?.scene?.name }], ['sceneName']);
```

`withVerboseMode()` creates one isolated controller per call. Its spreadable schema adds a visible, client-scoped `isVerbose` checkbox named "Verbose mode", defaulting to `false`. The controller starts disabled; explicitly initialize it with the saved setting during `setup` or later. Its setting's `onChange` keeps the cached flag current afterward. Preserve that callback when spreading the schema, and use a separate controller for each module. The helper registers no hooks or settings by itself, adds no listeners or timers, and does not read Foundry globals during construction or logging.

The optional `{ prefix }` is formatted as `[prefix]` once when constructing the controller. In a module, import its own `MODULE_ID` constant and pass `{ prefix: MODULE_ID }`. Enabled `debug` calls receive that label as their first console argument. Enabled `debugTable` calls print the label through `console.debug` immediately before the table, without changing table data or column names. No prefix calls occur while disabled or when a lazy producer throws.

`verbose.isVerbose` is a read-only view of the cached flag. `verbose.debug(...args)` returns immediately when disabled, without calling `console.debug`, evaluating function arguments, or reading settings. When enabled, it evaluates each function argument once, from left to right, as a synchronous zero-argument producer and forwards the results to `console.debug`. Arrays remain single console arguments. To inspect a function itself, wrap it: `verbose.debug(() => myFunction)`. Producer exceptions propagate and prevent that call from logging; async producers are not awaited. Ordinary expressions are still evaluated before the call, so defer expensive work with `verbose.debug(() => buildDiagnostics())`.

`verbose.debugTable(tabularData?, properties?)` follows the browser's `console.table` parameters: optional data and an optional array of column names. Either argument can also be a synchronous zero-argument producer, for example `verbose.debugTable(() => buildRows(), () => ['name', 'hp'])`. When enabled, it evaluates data first, then column names, once each, and calls `console.table` with the results. Disabled calls skip both producers and `console.table`; producer exceptions propagate without logging. It shares the same cached flag as `debug` and performs no settings reads.

## Canvas, scenes, and documents

Canvas helpers return `null`, `[]`, or `false` when canvas is missing or not ready. `getScene` therefore does not return stale canvas state during teardown. Token arrays and point values are snapshots; document/placeable references remain native objects. Reading values never draws or updates the canvas.

`getViewCenter` transforms the renderer screen center through PIXI's native `stage.toLocal`, so returned coordinates account for the stage transform. `getMousePosition` copies Foundry's stage mouse position. Both return world/stage pixel coordinates, not client-screen pixels or grid row/column offsets. `panTo(position, scale?)` validates finite coordinates and positive finite scale, performs an immediate native pan, and returns whether it could pan. It adds no animation or timers; use native `animatePan` explicitly when needed.

`SceneUtils.getContext()` returns separate active and viewed scene documents plus canvas readiness. A GM can view a different scene from the active player scene; scene-document queries also work when canvas is disabled. `getTokensByActor(scene, idOrActor)` queries an explicit scene without rendering it. World IDs/actors match linked and unlinked references by actor ID; a synthetic actor matches only its exact owning token in that scene.

UUID resolution requires a subtype guard:

```ts
import { DocumentUtils, type FoundryDocument } from '@template/foundry-core';
import { type Actor } from '@client/documents/_module.mjs';

const isActor = (document: FoundryDocument): document is Actor =>
  document.documentName === 'Actor';

const actor = await DocumentUtils.resolve('Actor.example', isActor); // Actor | null
```

Resolvers first require an actual native `foundry.abstract.Document` instance, then apply the guard. There is no unchecked `resolve<T>()` cast. Async resolution delegates to `fromUuid`. Sync resolution uses `fromUuidSync(..., {strict: false})` and rejects compendium index entries, even if an index resembles a document. It never loads compendium documents asynchronously; use `resolve` when full documents require loading. Unresolved/wrong document types return `null`; resolver and guard exceptions propagate.

## Deferred or rejected catalog proposals

| Proposal                           | Decision and verified native alternative                                                                                                                                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NotificationUtils`                | Omitted: v14 already provides info/warn/error/**success**, rich options, and notification handles through `ui.notifications`; renaming them adds no value.                                                                   |
| Extra `SceneUtils` getters         | Omitted: direct scene collection lookup/accessors and embedded document collections suffice; context and identity helpers cover the nontrivial semantics.                                                                    |
| `DocumentUtils.getUuid/isEmbedded` | Omitted: native properties already express these operations.                                                                                                                                                                 |
| `SocketUtils`                      | Deferred until a concrete protocol needs it. Foundry exposes its Socket.IO connection through `game.socket`; payload `senderId` is not an authenticated identity. No generic RPC layer or sender-trust shortcut is provided. |
| `UserUtils`                        | Omitted: `game.user`, the user collection, `active`, and `isGM` already cover the proposed reads.                                                                                                                            |
| `GridUtils`                        | Deferred. Native grids expose offset/center/snapping/path measurements; a future API must choose center/edge/level and unit semantics for square, hex, and gridless scenes.                                                  |
| `ModuleUtils`                      | Deferred beyond direct `game.modules` and `game.system` metadata access. Asset URL construction needs a real routing/prefix and validation use case.                                                                         |
| `DialogUtils`                      | Deferred: native `DialogV2.confirm` already supports cancellation/dismissal, including nullable results; a boolean-only wrapper would hide that behavior.                                                                    |
| `FileUtils`                        | Deferred: native `FilePicker.browse(source, target, options)` returns files/directories and requires source/permission handling; a flat path-only wrapper loses information.                                                 |
| `I18nUtils`                        | Omitted until module-prefix or typed-key requirements exist; use `game.i18n` directly.                                                                                                                                       |
| `KeyboardUtils`, `RegionUtils`     | Deferred as requested until a real feature defines focus, keybinding, region, and level behavior.                                                                                                                            |

No speculative folders or stub implementations were created for deferred APIs.

## Verification sources

Signatures were checked against installed `@dfreds/foundry-types` v14.369.1 and official v14 documentation: [Hooks](https://foundryvtt.com/api/v14/classes/foundry.helpers.Hooks.html), [hook events](https://foundryvtt.com/api/v14/modules/hookEvents.html), [generic update](https://foundryvtt.com/api/v14/functions/hookEvents.updateDocument.html), [pre-update cancellation](https://foundryvtt.com/api/v14/functions/hookEvents.preUpdateDocument.html), [canvas teardown](https://foundryvtt.com/api/v14/functions/hookEvents.canvasTearDown.html), [canvas view position](https://foundryvtt.com/api/v14/interfaces/foundry.types.CanvasViewPosition.html), [settings](https://foundryvtt.com/api/v14/classes/foundry.helpers.ClientSettings.html), [setting metadata](https://foundryvtt.com/api/v14/interfaces/foundry.types.SettingConfig.html), and [Canvas](https://foundryvtt.com/api/v14/classes/foundry.canvas.Canvas.html). Unit tests use partial native mocks and compile-time rejection checks; live Foundry integration still requires an installed v14 runtime.
