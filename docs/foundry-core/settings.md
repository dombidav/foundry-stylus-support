# Settings and verbose mode

[Foundry core](README.md) · [Lifecycle](../lifecycle-and-features.md) · [Type catalog](../type-catalog.md)

## Create a typed facade

`SettingsUtils.create(namespace, schema)` ties a primitive setting schema to a module namespace. Use the module's own `MODULE_ID`; a shared package must not own one global module ID. The factory does not access Foundry, so it can run at module scope.

```ts
import { HooksUtils, SettingsUtils } from '@template/foundry-core';
import { MODULE_ID } from '../../packages/module/src/module-id.ts';

export const settings = SettingsUtils.create(MODULE_ID, {
    isEnabled: { scope: 'world', default: true },
    displayMode: {
        name: 'Display mode',
        scope: 'user',
        default: 'compact',
        choices: { compact: 'Compact', detailed: 'Detailed' },
    },
    maxTokens: {
        name: 'Maximum tokens',
        scope: 'client',
        default: 5,
        range: { min: 0, max: 10, step: 1 },
    },
    lastTab: { scope: 'user', default: 'overview', isHidden: true },
});

HooksUtils.once('init', () => settings.register());
HooksUtils.once('ready', async () => {
    const mode: 'compact' | 'detailed' = settings.get('displayMode');
    await settings.set('maxTokens', 7);
    void mode;
});
```

The schema requires `scope` and `default`. The primitive kind is inferred from the default resolved during registration. Objects, arrays, nullable settings, caller-supplied DataFields/DataModels, menus, and document-return options are outside this facade's supported surface.

## Operations

| API | Behavior |
| --- | --- |
| `SettingsUtils.create(namespace, schema)` | Construct the local facade; reject a blank namespace. |
| `settings.register()` | Explicitly register each schema key once for this facade; call during `init`. |
| `settings.get(key)` | Read and validate the native value synchronously. |
| `settings.set(key, value)` | Validate input, await the native write, validate and return the assigned value. |
| `settings.reset(key)` | Resolve the schema default again, write it through the same validated path, and return the native assigned value. |

Reads/writes/resets require successful registration of the key. Read saved values at `setup` or later. Each facade remembers its successful registrations, so repeated `register()` skips completed keys and a partially failed registration can be retried. Use one facade per namespace/schema; do not also register those keys through another facade/native call.

Native permission checks, rejected writes, and other failures propagate. `reset` does not grant permissions or bypass callbacks. Setting values are not cached by the facade.

## Metadata and visibility

| Field | Meaning |
| --- | --- |
| `name` | Human-readable/localization label; defaults to `<namespace>.<key>`. |
| `hint` | Native explanatory text. |
| `scope: 'world'` | A shared world setting, subject to native permissions. |
| `scope: 'user'` | An individual user's preference. |
| `scope: 'client'` | A browser/client-specific preference. |
| `isHidden` | Defaults to `false`; `true` hides the setting from configuration UI while retaining programmatic access. |
| `choices` | String-value dropdown labels keyed by stored value, or a synchronous callback returning that map. |
| `range` | Numeric native UI metadata `{ min, max, step }`. |
| `onChange` | A validated primitive change callback, preserving native return semantics. |
| `requiresReload` | Native reload metadata, forwarded when supplied. |

Use `isHidden`, not native `config`, in schemas. Registration translates it to `config: !isHidden` and removes `isHidden` before calling Foundry. Other supported native metadata is forwarded. The installed declaration's numeric range typing is corrected at one native registration boundary.

The range slider does not impose a numeric literal union, integer validation, or min/max checks on facade writes. Numeric runtime validation requires a finite `number`; apply feature-specific business constraints explicitly when needed.

## Choice inference and validation

Inline `choices` keys infer the union returned by `get`, accepted by `set`, and returned by `reset`. No `as const` is required for inline schemas. Ordinary string defaults without choices widen to `string`; boolean defaults widen to `boolean` and numeric defaults to `number`.

```ts
import { SettingsUtils, type SettingsValuesOf, type SettingKeyOf } from '@template/foundry-core';

const settings = SettingsUtils.create('my-module', {
    mode: {
        scope: 'world',
        default: 'first',
        choices: { first: 'First', second: 'Second', third: 'Third' },
    },
    note: { scope: 'user', default: '' },
});

export type Values = SettingsValuesOf<typeof settings>;
export type Key = SettingKeyOf<typeof settings>;

export function useChoiceAfterInitialization(): Values['mode'] {
    const key: Key = 'mode';
    return settings.get(key); // 'first' | 'second' | 'third'
}
```

The aliases in this example belong in a dedicated `.d.ts` file in application code. They are included together here to keep the example self-contained.

A wrong known key, primitive value, choice value, or direct choice default fails typechecking. Numeric object keys in a string choice map are converted to their string key forms (`1` becomes `'1'`). If a dictionary was already widened to `Record<string, string>`, its lost literal keys cannot be recovered and values remain `string`. Prefer inference over explicit broad factory generic arguments. An extracted schema variable must retain the choice default's literal type for static membership checks.

For fixed choice maps, runtime validation checks primitive kind, finite numbers, and own-key membership during registration, reads, writes, native write results, and change callbacks. A corrupted/obsolete saved fixed choice throws. Prototype keys that are not own choices are rejected. If a schema changes allowed values, implement migration/reset deliberately; there is no automatic fallback or extra synchronization protocol.

## Callback defaults and runtime choices

Both `default` and `choices` accept zero-argument callbacks. **Callbacks must be synchronous, fast, and side-effect-free.** Do not fetch data, return a Promise, write documents/settings, register hooks, or perform expensive calculations inside them. Async callbacks fail typechecking and invalid results are rejected at runtime. Callback errors propagate.

| Operation | Default callback | Choices callback |
| --- | --- | --- |
| `create` | Never | Never |
| `register` | Once per key being registered; successful keys are skipped on repeated calls | Never |
| `get`, `set`, native `onChange` | Never | Never |
| Facade `reset` | Evaluated again | Never |
| Native input rendering | Never | Evaluated on every render, including panel opening/re-rendering |

Registration resolves the default to determine the native primitive kind. Its callback must already work during `init` and keep returning that same primitive kind. A failed registration may evaluate it again on retry. The facade retains the resolved registration default, not a cached setting value. Foundry's own reset-all UI uses that registered snapshot; `settings.reset(key)` re-evaluates the callback.

Callback-backed choices are presentation options, not a persistent-value membership validator. The facade never invokes them to validate a read/write. If a saved user ID disappears, `get` still returns its string and the input preserves it as an unavailable selection. Resolve the document separately and handle a missing result. An already open panel updates when Foundry re-renders its input; no polling or automatic refresh listeners are added.

```ts
import { HooksUtils, SettingsUtils, type SettingChoices } from '@template/foundry-core';

const settings = SettingsUtils.create('my-module', {
    selectedUserId: {
        name: 'Selected user',
        scope: 'world',
        // Synchronous, fast, and side-effect-free; valid already during init.
        default: (): string => '',
        // Synchronous, fast, and side-effect-free; users are read only during input rendering.
        choices: (): SettingChoices => {
            const choices: SettingChoices = { '': 'No user' };
            for (const user of game.users ?? []) {
                if (user.id) choices[user.id] = user.name ?? user.id;
            }
            return choices;
        },
    },
});

HooksUtils.once('init', () => settings.register());
HooksUtils.once('ready', () => {
    const userId: string = settings.get('selectedUserId');
    const user = game.users.get(userId) ?? null;
    void user;
});
```

Type inference prefers the keys of `choices` (or its callback's return type), then the `default` callback's return type, then a widened direct primitive default. Unavailable choice keys or an unresolvable value type fall back to `string`. A runtime `Record<string, string>` therefore produces `string`, while a literal map returned by a callback preserves its key union.

```ts
import { SettingsUtils } from '@template/foundry-core';

const settings = SettingsUtils.create('my-module', {
    mode: {
        scope: 'world',
        default: () => 'first',
        choices: () => ({ first: 'First', second: 'Second' }),
    },
    count: { scope: 'client', default: (): number => 5 },
    density: {
        scope: 'user',
        default: (): 'compact' | 'detailed' => 'compact',
    },
});

// Call only after init registration.
export function readSettings() {
    const mode: 'first' | 'second' = settings.get('mode');
    const count: number = settings.get('count');
    const density: 'compact' | 'detailed' = settings.get('density');
    return { mode, count, density };
}
```

Annotate callback return types explicitly when you want a broad primitive or a particular union; contextual inference can otherwise retain a literal such as `5` or `true`. Unlike direct defaults, callback return types are preserved rather than widened. Arbitrary callback return unions are compile-time contracts: runtime validation enforces primitive kind and finite numbers, plus membership only for fixed choice maps. Migration of obsolete persisted values remains the caller's responsibility.

The dynamic input uses the public v14 [custom input callback](https://foundryvtt.com/api/v14/types/foundry.applications.fields.CustomFormInput.html), a native [StringField](https://foundryvtt.com/api/v14/classes/foundry.data.fields.StringField.html), and [createSelectInput](https://foundryvtt.com/api/v14/functions/foundry.applications.fields.createSelectInput.html). Field-level choice validation is intentionally omitted to keep callbacks render-only and saved IDs readable.

## Cached verbose mode

`SettingsUtils.withVerboseMode(options?)` returns one isolated `VerboseMode` controller. It supplies a spreadable schema entry, a cached flag, and two lazy logging functions:

```ts
import { HooksUtils, SettingsUtils } from '@template/foundry-core';
import { MODULE_ID } from '../../packages/module/src/module-id.ts';

export const verbose = SettingsUtils.withVerboseMode({ prefix: MODULE_ID });
const settings = SettingsUtils.create(MODULE_ID, { ...verbose.schema });

HooksUtils.once('init', () => settings.register());
HooksUtils.once('setup', () => verbose.initialize(settings.get('isVerbose')));
HooksUtils.once('ready', () => {
    verbose.debug('Module ready', () => ({ id: MODULE_ID }));
    verbose.debugTable(() => [{ module: MODULE_ID, phase: 'ready' }], ['module', 'phase']);
});
```

| Member | Contract |
| --- | --- |
| `verbose.schema` | Adds visible client-scoped `isVerbose`, labeled "Verbose mode", default `false`. Preserve its `onChange`. |
| `verbose.isVerbose` | Read-only view of the cached boolean; initially `false`. |
| `verbose.initialize(isVerbose)` | Seed/update the local boolean cache; normally seed from saved settings during `setup`. |
| `verbose.debug(...args)` | When enabled, evaluate function arguments once and pass results to `console.debug`. |
| `verbose.debugTable(tabularData?, properties?)` | When enabled, resolve optional data/columns and call `console.table`. Either argument can be a producer. |

The schema callback keeps the cache current after initialization. To save a changed preference, use `settings.set('isVerbose', true)` and let native `onChange` update the cache; `initialize` changes only the controller's local flag. Logging does not read settings. The controller adds no hooks, timers, polling, or global `window.isVerbose`. Export/import a module-owned controller so features share that module's state; create a separate controller for a separate module.

The optional prefix is formatted once as `[prefix]`. Enabled `debug` passes it as the first console argument, followed by resolved arguments. Enabled `debugTable` emits that label through `console.debug` immediately before the table, preserving the table's data and columns. Empty/omitted prefixes add no label call. Native console formatting/filter behavior still applies.

## Lazy evaluation details

```ts
import { SettingsUtils } from '@template/foundry-core';

const verbose = SettingsUtils.withVerboseMode();

function buildDiagnostics() {
    return { timestamp: Date.now(), values: [1, 2, 3] };
}

export function inspect(): void {
    verbose.debug(() => `Snapshot: ${JSON.stringify(buildDiagnostics())}`);
    verbose.debug('Details', () => buildDiagnostics());
    verbose.debugTable(() => [buildDiagnostics()], () => ['timestamp']);
}
```

Before initialization this controller is disabled, so these calls do nothing. With an enabled controller:

1. Producers are called once, left to right; table data precedes table columns.
2. Their returned values are logged, not the producer functions themselves.
3. Arrays remain single debug arguments; they are not spread automatically.
4. A returned function is logged as a value and is not evaluated recursively. To inspect a function, use `verbose.debug(() => myFunction)`.
5. Producer errors propagate and prevent that call's logging, including prefix output. Producers are synchronous; Promises are not awaited.

Disabled calls return before producer evaluation and console access. Eager expressions such as `verbose.debug(buildDiagnostics())` still execute before the call; put expensive work inside the arrow function.

Creating the producer closure and constructing function arguments still follow normal JavaScript evaluation. For a genuinely hot loop, an outer `if (verbose.isVerbose)` can guard a whole diagnostic batch when profiling justifies it. Lazy evaluation avoids running the expensive producer; it is not a claim of zero allocations at the call site.

Root types: `SettingValue`, `SettingDefault`, `SettingChoices`, `SettingChoicesProvider`, `ModuleSettingDefinition`, `SettingDefinitions`, `TypedSettings`, `SettingsValuesOf`, `SettingKeyOf`, `VerboseMode`, and `VerboseModeOptions`. Validation/inference/registration support declarations are listed separately in the [type catalog](../type-catalog.md).

Source: [settings functions](../../packages/foundry-core/src/settings/settings.utils.ts) and [declarations](../../packages/foundry-core/src/settings/settings.types.d.ts).
