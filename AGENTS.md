# Foundry VTT v14 module template

This is a performance-critical Foundry VTT **v14** module targeting **D&D 5e**, written in strict TypeScript and native ES modules with npm workspaces. Verify version-specific APIs in the installed `@dfreds/foundry-types` declarations and official v14 documentation; do not guess.

## Runtime performance comes first

Verified runtime performance outranks cleanliness, readability, DRY, abstraction consistency, and usual style conventions. Prefer simple implementations that do less work. Unconventional, repetitive, or deliberately "dirty" code is permitted only with evidence or concrete technical reasoning. Comment such code to explain what it does, why it is faster, and the accepted trade-off. Hypothetical gains do not justify exceptions.

- Prefer event-driven behavior. No polling unless strictly unavoidable; no unnecessary timers, intervals, listeners, or asynchronous work.
- Minimize work and allocations in frequent hooks. Avoid repeated large collection scans and unnecessary document or DOM updates.
- Cache expensive work when useful, with correct invalidation. Consider main-thread blocking and rendering costs.
- Prevent memory leaks. Release listeners, subscriptions, and temporary resources. Use `Hooks.once` for one-time lifecycle work.
- Never optimize purely for stylistic reasons.

## TypeScript

- Prefer interfaces where appropriate; use type aliases for unions, mapped/conditional types, and other constructs that need them.
- Name boolean variables, parameters, and properties, and functions returning booleans, with a meaningful predicate prefix such as `is`, `are`, `has`, `have`, `should`, `can`, or `needs`. Preserve names required by native or external API contracts.
- `npm run lint` also checks inferred boolean bindings, declared properties, and named boolean-returning functions (including async functions). Object-literal keys remain API/data contracts. Add an adjacent `// boolean-name-exempt: <specific reason>` only for required native contracts or compatibility with an established public API; do not use broad exemptions.
- Put interfaces and type aliases in dedicated `.d.ts` files. Never declare them in runtime logic files.
- Use inline type imports: `import { type SomeType } from './types.js';` (resolves `types.d.ts`). TypeScript 6 rejects explicit `.d.ts` specifiers with inline imports. Do not use declaration-level `import type` or import types as values.
- Keep strict typing. Avoid unjustified `any`, unnecessary casts, and blanket error suppression. Dependency declaration checking is skipped centrally; project code remains checked.
- Document every named type, interface, and function in `foundry-core` and `dnd5e-core` with English JSDoc explaining its purpose and a short `@example`. Include internal helpers and interface methods. Add `@returns` or `@throws` sections only when strongly justified.
- Import Lodash functions by name from `lodash-es` when useful. Prefer native JavaScript for trivial operations. Verify unused utilities are removed from production bundles.

## Design and workspace boundaries

Apply DRY, KISS, and YAGNI, subject to verified runtime performance. Prefer functions. Use classes only when Foundry requires them, stateful behavior clearly warrants them, or they are demonstrably beneficial.

Prefer grouped utility APIs through native ES module namespace re-exports, such as `export * as ActorUtils from './actor-utils.ts';`. Implement utilities as standalone functions. Avoid utility classes and POJO containers unless they provide a demonstrated technical benefit. Preserve tree-shaking and minimize runtime overhead; verify production output when adding grouped APIs.

Avoid service containers, unnecessary patterns, premature abstractions, speculative functionality, needless wrappers, and utilities for one-off trivial expressions. Do not add features outside the requested scope.

There are four private workspaces. Dependency direction is `module → module-common → dnd5e-core → foundry-core`; downstream packages may also depend directly on any earlier shared layer. No cycles or reverse dependencies.

- `foundry-core`: system-independent Foundry v14 types and high-value helpers. Never depend on the other three workspaces. Imports must not access Foundry globals, register hooks/settings, read documents, or initialize the canvas. Settings registration is explicit; hook subscriptions return idempotent cleanup. Keep `KnownHookEvents` verified against v14 documentation, allow custom strings without weakening checks for known literal names, and keep hook-name catalogs type-only. See `packages/foundry-core/README.md` for supported and deferred APIs.
- `dnd5e-core`: stable reusable D&D 5e types and stateless utilities, verified against Foundry v14 and D&D 5e 6.0.6. See `packages/dnd5e-core/README.md` for API semantics and source references. Modify only for a concrete, documented necessity; prefer adapting downstream code. No convenience changes, speculative refactors, module-specific behavior, or code moved here merely for reuse. Reuse prepared system data and native indexes; never duplicate game rules or initialize hooks/caches on import.
- `module-common`: evolving module-specific shared types and functionality. Prefer environment independence; no automatic initialization or unnecessary side effects. May depend on `foundry-core` and `dnd5e-core`, never `module`.
- `module`: Foundry lifecycle, hooks, API/UI integration, and runtime features. May consume all three shared workspaces.

In `module`, keep `src/main.ts` focused on wiring lifecycle hooks to the named handlers in `src/lifecycle.ts`. Group feature logic, feature-specific `.types.d.ts` declarations, and standalone helpers under `src/features/<feature>/`. Keep corresponding tests under `tests/features/<feature>/`, adding test files when a feature gains behavior.

All workspaces are private. Use npm-compatible dependency versions, never `workspace:*`. The root package version alone controls releases; workspace versions are internal link metadata.

## Workflow

Before coding, understand the affected lifecycle and runtime cost, check native APIs, and choose the smallest correct solution. Afterward run `npm run check` and `npm run build`; review runtime dependencies, listener cleanup, and repeated work. Add meaningful unit tests when appropriate.

Use npm only, ESLint with Prettier, and Vitest unit tests. No runtime UI framework, polling infrastructure, development server, HMR, telemetry, speculative CLI, or generic plugin architecture. The explicitly requested GitHub tag-triggered release workflow is the only publishing automation; do not add unrelated CI/CD.

Place workspace unit tests in a `tests/` directory beside `src/`, never alongside source files. By default, mirror the directory structure inside `src/`: `src/utils/actor-utils.ts` maps to `tests/utils/actor-utils.test.ts`. Vitest discovers `.test.ts` files only inside test directories. Developer scripts without a `src/` directory use `scripts/<name>/tests/`, mirroring paths relative to the script directory. Keep tests included in TypeScript checks.

Custom scripts belong at `scripts/<name>/<name>.ts`, run through `tsx`; supporting files stay alongside them. Use Node built-ins where practical. The explicitly requested `release:patch/minor/major` commands may push their release branch/tag according to `release.config.ts`: default main, null means local-only, * allows the current branch, and shouldPushTag defaults to true. Push the selected refs atomically when both are enabled, without force or implicit follow-tags. Agents must not run a real release/push merely to test implementation changes; use isolated local repositories. After a stable release tag is pushed, `.github/workflows/release.yml` may check, build, package, and publish its GitHub Release assets using the built-in token. No unrelated pushes or uploads.

The module manifest is the single source of its ID. Runtime code imports `MODULE_ID` from the module's own `src/module-id.ts`; shared workspaces must not own a module ID. Use `withVerboseMode({ prefix: MODULE_ID })` for labeled diagnostics. The prefix is prepared once; disabled logging must not evaluate producers or access console methods.

Settings `default` and `choices` callbacks must be synchronous, fast, and side-effect-free. Default callbacks run during explicit registration and facade reset, with a stable primitive kind; choices callbacks run only when native inputs render. Never evaluate choices providers in reads, writes, or change validation.

The English project wiki starts at `docs/README.md`. Keep its API references, type catalog, architecture guidance, and release instructions aligned with source changes. Every `ts` or `typescript` fenced block in `docs/**/*.md` and the root/workspace READMEs must compile independently with its own imports. `npm run check:examples` checks the actual fences, reports original Markdown locations, and runs as part of `npm run typecheck`. Use another fence language for intentional pseudocode. Declaration JSDoc examples and inline contextual examples are explanatory snippets and are not compiled by this checker.

Keep responses concise. When showing edits, show diffs or modified blocks instead of entire files.
