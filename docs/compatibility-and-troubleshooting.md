# Compatibility and troubleshooting

[Wiki home](README.md) · [Settings](foundry-core/settings.md) · [Release](build-and-release.md)

## Supported contracts

| Surface | Repository target |
| --- | --- |
| Foundry | Version 14; native declarations from installed `@dfreds/foundry-types`. |
| D&D 5e | Verified system API 6.0.6, requiring Foundry 14.367+. |
| Development Node.js | 24.14.1 or newer. |
| npm | 11 or newer; npm-compatible private workspace versions. |
| TypeScript | The project's pinned compatible 6.0.x line; see the lockfile. |
| Runtime format | Native ES modules built for ES2023, no UI framework or Foundry runtime bundled. |

Check the installed declarations and official version-specific sources before changing behavior. Public D&D contracts cover only the fields used by the package. The package does not run a version check or revalidate the full system schema on every call. Node unit mocks and documentation compilation do not replace live integration checks.

`skipLibCheck` skips dependency declaration checking; it does not disable strict checks on project code. The Foundry declaration package includes implementation-shaped `.mts` files, so normal TypeScript import elision remains enabled. ESLint enforces the project's inline type-import convention. Upgrade TypeScript and typescript-eslint together within their supported compatibility range.

## Common problems

| Symptom | Explanation / action |
| --- | --- |
| Settings access says to register during init | `create()` constructs a facade only. Call its `register()` during `init`; read saved values at `setup` or later. |
| A fixed dropdown value throws `Unknown setting choice` | The saved/native value is outside the fixed choice map. Implement an explicit migration or reset the registered key to its valid schema default. |
| A dynamic dropdown retains a removed user ID | Choice callbacks supply UI options only; missing IDs remain readable and appear as unavailable selections. Resolve the user separately and handle a missing document. |
| A settings callback fails during init or returns a Promise | Default callbacks run at registration and reset; choices callbacks run on input rendering. Both must be synchronous, fast, and side-effect-free. Defaults must work during init and keep the same primitive kind. |
| A numeric setting rejects `NaN` or `Infinity` | Numeric validation requires finite values. The range slider is a separate UI constraint. |
| A choice getter is `string` | Its dictionary was widened to `Record<string, string>` or factory generics were specified too broadly. Preserve the literal keys and let `create` infer the schema. |
| `testInteger` accepts a number outside 0–10 in code | The facade validates primitive kind and finite values; `range` configures the native UI, not an integer/range type or facade validator. |
| Verbose logging stays off after a reload | Seed the controller with saved `isVerbose` during `setup`; construction starts disabled. |
| Verbose is enabled but debug output is invisible | Allow debug/verbose messages in the browser console filter. |
| Expensive diagnostics still run while verbose is off | Pass a producer: `verbose.debug(() => buildDiagnostics())`. Eager arguments are evaluated by JavaScript before the wrapper is called. |
| A table prints a function or Promise unexpectedly | Function arguments are evaluated once; returned functions remain values. Producers are synchronous and are not awaited. |
| Canvas helpers return `null` / `[]` / `false` | The canvas is absent, disabled, or not ready. Use the relevant canvas lifecycle and handle the documented fallback. |
| Active scene differs from the GM's view | `SceneUtils.getContext()` intentionally separates active and viewed documents. |
| Two unlinked tokens for the same base actor behave differently | Synthetic actors have distinct UUIDs and token ownership. Use UUID-aware helpers rather than deduplicating actor IDs. |
| A world setting write rejects for a player | Native permissions are preserved. The facade does not grant GM permissions or route privileged writes. |
| Release refuses to run | Check the clean tree, repository root, stable semver, Git identity, existing tag/archive, and both-or-neither URL configuration. |
| Release rejects the current branch or cannot choose a remote | Configure release.config.ts and the branch's Git push remote before releasing. Default branch is main; null disables all pushes/checks, while `*` permits the current attached branch. |
| Release push fails after creating a commit/tag | Keep local release artifacts and retry the selected push after resolving the remote error. Do not run another version increment. |
| GitHub packaging rejects a tag | The pushed tag must be exactly `v` plus the root package version, with stable `major.minor.patch` numbering. |
| GitHub publishing returns a permission error | Enable Actions and allow the workflow's `contents: write` permission under repository/organization policy; no personal token is needed. |
| GitHub retry finds an existing release | Inspect any incomplete unpublished draft before deliberately removing it and retrying. Published releases should be replaced by a new version, not overwritten. |
| Node engine errors despite installing a newer version | Verify `node --version` and `npm --version` in the same terminal running the commands; correct that terminal's PATH/toolchain. |

## Deliberately deferred APIs

The system-independent core currently covers hooks, primitive settings, canvas reads/pan, scene context, and guarded document resolution. The following proposals are deferred or omitted until a concrete typed use case justifies them:

| Area | Current approach |
| --- | --- |
| Notifications | Use `ui.notifications` directly, preserving native options and notification handles. |
| Sockets / RPC | Define a real protocol first. Payload `senderId` is not authenticated sender identity. |
| Users and module metadata | Prefer direct native access for simple reads. |
| Grid operations | Choose explicit square/hex/gridless and coordinate/unit semantics before adding helpers. |
| Dialogs | Use native `DialogV2`; preserve native cancellation/dismissal outcomes. |
| File browsing | Use native FilePicker source, permission, and rich-result semantics. |
| I18n, keyboard, regions | Add helpers only for an actual module feature. |
| Object/array/DataModel settings and menus | Use native settings APIs; the current facade supports primitive values only. |
| Rest/rule execution | Resource helpers are read-only snapshots; they do not spend resources, execute rests, or roll activities. |

## Verification sources

- [Foundry v14 API](https://foundryvtt.com/api/v14/) and [Hooks](https://foundryvtt.com/api/v14/classes/foundry.helpers.Hooks.html).
- [Foundry hook events](https://foundryvtt.com/api/v14/modules/hookEvents.html), including generic document events.
- [ClientSettings](https://foundryvtt.com/api/v14/classes/foundry.helpers.ClientSettings.html) and [SettingConfig](https://foundryvtt.com/api/v14/interfaces/foundry.types.SettingConfig.html).
- [Canvas](https://foundryvtt.com/api/v14/classes/foundry.canvas.Canvas.html), [canvas view position](https://foundryvtt.com/api/v14/interfaces/foundry.types.CanvasViewPosition.html), and [teardown options](https://foundryvtt.com/api/v14/interfaces/foundry.types.CanvasTearDownOptions.html).
- [D&D 5e 6.0.6 source](https://github.com/foundryvtt/dnd5e/tree/release-6.0.6), especially [actor](https://github.com/foundryvtt/dnd5e/blob/release-6.0.6/module/documents/actor/actor.mjs), [creature](https://github.com/foundryvtt/dnd5e/blob/release-6.0.6/module/data/actor/templates/creature.mjs), [HP](https://github.com/foundryvtt/dnd5e/blob/release-6.0.6/module/data/actor/templates/attributes.mjs), and [spellcasting](https://github.com/foundryvtt/dnd5e/blob/release-6.0.6/module/data/spellcasting/spellcasting-model.mjs) implementations.
- Local source remains authoritative for this template's wrappers: [Foundry core](../packages/foundry-core/src/index.ts), [D&D core](../packages/dnd5e-core/src/index.ts), and [release tooling](../scripts/release/release.ts).
