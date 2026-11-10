# Foundry VTT v14 module template

A minimal TypeScript/npm workspace template for performance-first D&D 5e modules. The example module registers settings during `init`, initializes its verbose cache during `setup`, and displays **Hello World!** during `ready` in a D&D 5e world. The shared `foundry-core` package supplies system-independent Foundry helpers; `dnd5e-core` adds D&D 5e utilities, and `module-common` starts empty.

The [project wiki](docs/README.md) collects complete utility and type references, architecture guidance, lifecycle and feature examples, testing, troubleshooting, and local build/release workflows.

## Install

Use **Node.js 24.14.1 or newer** and **npm 11 or newer**. The Node minimum comes from the v14 Foundry types package. No global tools are required.

```sh
npm install
npm run check
npm run build
```

Use `npm ci` for a clean, lockfile-based install. Commit `package-lock.json` when updating dependencies. npm 12 may ask to approve dependency installation scripts; this template does not require custom installation hooks.

## Workspaces

| Package                   | Responsibility                                                          | Allowed workspace dependencies |
| ------------------------- | ----------------------------------------------------------------------- | ------------------------------ |
| `@template/foundry-core`  | System-independent hooks, settings, canvas, scene, and document helpers | None                           |
| `@template/dnd5e-core`    | Stable D&D 5e types and stateless system utilities                      | `foundry-core`                 |
| `@template/module-common` | Shared project-specific code; initially empty                           | Both core packages             |
| `@template/module`        | Foundry hooks, runtime/UI integration, production bundle                | All three shared packages      |

All packages are private. Shared packages export TypeScript source so Vite bundles only consumed code, without a separate library build. Keep dependencies acyclic and do not casually modify `dnd5e-core`. Internal workspace versions remain `0.0.0`; only the root version changes on release.

The [dnd5e-core API reference](packages/dnd5e-core/README.md) documents its nine utility namespaces, the verified D&D 5e 6.0.6 API target, and lookup semantics. The initial Hello World module does not consume these helpers, so unused core code does not enter its bundle.

The [foundry-core API reference](packages/foundry-core/README.md) covers verified `KnownHookEvents` callback inference, custom hook strings, idempotent cleanup, typed settings with explicit registration, lifecycle-safe canvas reads, scene semantics, and guarded UUID resolution. It also lists deferred proposals. Shared helpers perform no automatic Foundry initialization on import.

## Commands

| Command                 | Result                                                                              |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `npm run build`         | Minified ES module and static assets in `dist/module`                               |
| `npm run typecheck`     | Check workspaces, configuration, tests, scripts, and documentation examples without emitting JavaScript |
| `npm run check:examples` | Typecheck TypeScript fences in the wiki and READMEs at their Markdown locations |
| `npm run lint`          | ESLint, Prettier, and type-aware boolean naming checks                               |
| `npm run lint:fix`      | Fix lint and formatting issues                                                      |
| `npm run test`          | Run unit tests once, in Node                                                        |
| `npm run test:watch`    | Watch unit tests                                                                    |
| `npm run check`         | Typecheck, lint, and unit tests                                                     |
| `npm run release:patch` | Validate and create the next patch release                                          |
| `npm run release:minor` | Validate and create the next minor release                                          |
| `npm run release:major` | Validate and create the next major release                                          |
| `npm run release:package` | Build and archive the current GitHub tag without changing its version or publishing |

There is no development server or watch build. Rebuild and reload Foundry to see runtime changes. Tests mock only the Foundry globals used by the module; no full runtime emulator or browser test framework is included.

Keep workspace tests in `packages/<workspace>/tests/`, beside `src/`, mirroring source paths by default: `src/utils/actor-utils.ts` maps to `tests/utils/actor-utils.test.ts`. Developer script tests live in `scripts/<name>/tests/`. Vitest discovers `.test.ts` files only in these directories; TypeScript checks them alongside source files.

## TypeScript and Foundry APIs

`tsconfig.base.json` enables strict typing, unchecked index protection, explicit overrides, bundler resolution, and inline type imports. Workspace configurations isolate browser runtime from Node tooling. Interfaces and aliases belong in dedicated `.d.ts` files:

```ts
import { type SceneContext } from '@template/foundry-core';
```

`packages/foundry-core/src/foundry.d.ts` references `@dfreds/foundry-types`; the module and D&D package load/re-export these shared declarations. This keeps system-independent Foundry typing in the lowest workspace layer and preserves the existing `dnd5e-core` `FoundryGame` type export. The root paths map the documented `@client/*` and `@common/*` aliases. These aliases describe Foundry's type declarations, not runtime module imports. Foundry supplies globals at runtime; do not import the type package into runtime code. Dedicated D&D declaration files cover the system fields used by its utilities; extend them from verified system APIs when necessary.

TypeScript is pinned to the latest compatible stable 6.0.x line: at template creation, TypeScript 7 is stable but `typescript-eslint` 8 supports TypeScript below 6.1. Upgrade them together when official support becomes available. TypeScript 6 rejects explicit `.d.ts` paths with inline type imports, so use `.js` paths resolving to those declarations while retaining `import { type SomeType }`. `skipLibCheck` avoids checking third-party declaration internals; application code is still checked strictly. The published Foundry package includes implementation-shaped `.mts` files with ordinary type imports, so TypeScript import elision remains enabled; ESLint enforces inline type imports in our code. The shared `foundry.d.ts` supplies missing `game`, `ui`, and `canvas` singleton declarations using upstream types.

Tooling-only npm overrides select patched Handlebars 4.7.10 and Minimatch 11 releases for transitive dependency advisories. These packages never enter the runtime bundle. Revisit the overrides when upstream dependencies include the fixes themselves.

Use named imports from `lodash-es` when they help; typings are installed centrally. Unused Lodash code and unused workspace exports are tree-shaken. The example module consumes Foundry settings helpers; D&D utilities and Lodash remain unused and are removed from its bundle.

API references: [Foundry v14 Hooks](https://foundryvtt.com/api/v14/classes/foundry.helpers.Hooks.html), [Notifications](https://foundryvtt.com/api/v14/classes/foundry.applications.ui.Notifications.html), [module manifests](https://foundryvtt.com/article/module-development/), and [DFreds type setup](https://github.com/DFreds/dfreds-foundry-types#readme).

## Customize and build

The module entry point wires the named `onInit`, `onSetup`, and `onReady` handlers from `lifecycle.ts` with `Hooks.once`. Feature-owned code, types, and helpers stay together:

```text
packages/module/
├── src/
│   ├── main.ts
│   ├── lifecycle.ts
│   ├── module-id.ts
│   ├── settings.ts
│   ├── foundry.d.ts
│   └── features/
│       └── example/
│           ├── example.ts
│           ├── example.types.d.ts
│           └── example.utils.ts
└── tests/
    ├── main.test.ts
    ├── lifecycle.test.ts
    ├── module-id.test.ts
    ├── settings.test.ts
    └── features/
        └── example/
            └── .gitkeep
```

The example feature files are empty module placeholders. Their mirrored test directory is retained with `.gitkeep`; add tests there when implementing actual behavior. Features that need initialization expose explicit functions called from the appropriate lifecycle handler.

Edit `packages/module/static/module.json` to change the ID, title, description, and author. Keep the ID a lowercase slug. If renaming workspace packages, update package names, workspace dependency names, and the root build command together, then run `npm install` to refresh links and the lockfile.

The manifest is the only source of the module ID. Import `MODULE_ID` from the module's `src/module-id.ts` for settings namespaces and log prefixes. Vite reduces the consumed JSON field to a constant; the whole manifest is not bundled. Each additional module package should keep its own manifest and ID export, rather than putting an ID in a shared workspace.

`packages/module/src/settings.ts` exports the module's shared `settings` and `verbose` instances. The visible example settings are `isVerbose` (client checkbox, default off), `testChoice` (world dropdown with three options, default `first`), and `testInteger` (world numeric slider from 0 to 10 with step 1, default 5). `settings.get('testChoice')` infers `'first' | 'second' | 'third'`; writes accept only those keys, and invalid native values are rejected at runtime. When verbose mode is enabled, `ready` logs the two test values with the module prefix. Disabled verbose logging skips both test-setting reads.

```ts
import { SettingsUtils } from '@template/foundry-core';
import { MODULE_ID } from './packages/module/src/module-id.ts';

const verbose = SettingsUtils.withVerboseMode({ prefix: MODULE_ID });
const settings = SettingsUtils.create(MODULE_ID, { ...verbose.schema });
```

The root `package.json` version is authoritative. The source manifest's `0.0.0` is a placeholder; every build replaces the distributed manifest version with the root version. Do not maintain the source version independently. The module targets Foundry 14 and declares D&D 5e under `relationships.systems` so Foundry restricts availability to that system.

Put distributable assets in `packages/module/static`. Vite copies them and generates the final manifest:

```text
dist/module/
├── module.json
└── scripts/main.js
```

The bundle is browser-compatible, minified, tree-shaken, and has no source maps or bundled Foundry runtime. Future outputs can use siblings such as `dist/cli`; no CLI is implemented.

## Development checks

`npm run lint` runs ESLint/Prettier and a TypeScript-based boolean naming check using `tsconfig.lint.json`. It covers inferred local bindings, parameters, destructured bindings, declared properties, and named functions returning booleans, including async functions. Predicate prefixes include `is`, `are`, `has`, `have`, `should`, `can`, `needs`, and equivalent forms; uppercase constants such as `IS_READY` are supported. Object-literal keys are treated as API/data contracts. Required native names and established public API names can be preserved with an adjacent `// boolean-name-exempt: <specific reason>` comment. Internal bindings are renamed instead of exempted. These tools never enter the production bundle.

`npm run check:examples` independently compiles every `ts`/`typescript` fence in `docs/**/*.md`, this README, and workspace READMEs using the installed APIs. Examples must include their imports; relative imports resolve from each document's directory. Diagnostics point to the original Markdown file and line. Examples are never executed or written to disk. This check also runs during `npm run typecheck` and `npm run check`; shell snippets, inline contextual examples, and explanatory declaration JSDoc examples are outside its scope.

For local installation, copy `dist/module` into `<Foundry user data>/Data/modules/<module-id>`, with `module.json` directly inside that folder. Restart Foundry, open a D&D 5e world, and enable the module in Manage Modules. The notification appears when the world finishes loading. Actual in-app behavior requires a running licensed Foundry v14 installation; unit tests check the integration calls.

## Releases

First commit all changes and configure your Git author identity. A release requires a clean working tree and an existing Git commit. From root `1.0.0`, patch/minor/major yield `1.0.1`, `1.1.0`, or `2.0.0` respectively.

The release script:

1. Checks Git, the configured release branch/push remote, the current stable semver, and target tag/archive conflicts. npm calculates the next version in an isolated temporary directory.
2. Runs `npm run check` and a production build before changing any version.
3. Uses `npm version --no-git-tag-version --ignore-scripts --workspaces=false` to update only root metadata and lockfile.
4. Rebuilds, verifies the manifest against the root version, and creates `releases/<module-id>-<version>.zip`.
5. Commits the root version files and creates an annotated `v<version>` Git tag only after ZIP creation succeeds.
6. Pushes the selected branch and, by default, the release tag. Both refs are pushed atomically when enabled; no force push or implicit follow-tags is used.

The ZIP directly contains `module.json`, `scripts/main.js`, and any static assets, with no parent folder. Development files and symbolic links are rejected. Existing archives are never overwritten. Archives are ignored by Git; `releases/.gitkeep` is tracked.

On failure before finalization, temporary calculation files and generated build/archive output are cleaned up. If npm already changed version metadata, the script leaves it available for inspection and prints recovery commands. Review both staged and unstaged changes before restoring anything. If tagging fails after the commit, keep the valid ZIP/commit and create the missing tag as instructed; do not increment again.

Configure [release.config.ts](release.config.ts) before releasing and commit your changes:

```ts
import { type ReleaseConfig } from './scripts/release/types.js';

export default {
    branch: 'main',
    shouldPushTag: true,
} satisfies ReleaseConfig;
```

| Setting | Behavior |
| --- | --- |
| `branch: 'main'` (default) | Require main and push that branch. Use `'release'` or another name to require/push that branch instead. |
| `branch: null` | Skip branch checks and all pushes, including tags, regardless of `shouldPushTag`. |
| `branch: '*'` | Allow any attached branch and push the actual current branch. |
| `shouldPushTag: true` (default) | Push this release's tag together with the branch. |
| `shouldPushTag: false` | Push only the branch; the annotated release tag stays local. |

Git remote selection respects `branch.<name>.pushRemote`, `remote.pushDefault`, and `branch.<name>.remote`, then falls back to `origin` or the sole configured remote. A missing/ambiguous remote fails before version changes. A detached HEAD requires local-only mode. Failed pushes leave the local release commit, tag, and ZIP intact; retry the push without incrementing again. See [configuration and recovery](docs/build-and-release.md#release-configuration).

Extract the ZIP into `<Foundry user data>/Data/modules/<module-id>` for manual installation; Foundry's manifest installer needs a hosted manifest URL, not a local ZIP path.

## GitHub Releases

The [release workflow](.github/workflows/release.yml) publishes when a `v<version>` tag is pushed, normally by a release command. It installs locked dependencies, checks the project, verifies the tag matches the root version, builds, and uploads `module.json` plus `<module-id>-<version>.zip` to a GitHub Release. URLs are derived from the current repository, so template copies need no hardcoded repository URL or personal token. Actions must be enabled, repository policy must permit `contents: write`, and assets must be publicly accessible for Foundry installation.

With the default configuration, run one release command from main:

```sh
npm run release:patch
```

This creates and pushes the release commit/tag; the workflow then publishes its assets. `branch: null` or `shouldPushTag: false` prevents automatic workflow publication because no tag is pushed. Publish increasing stable versions. The GitHub workflow itself never increments versions, commits, or pushes tags. `gh release create` uploads both assets before publishing; GitHub determines the Latest release from the version/date. See [release setup, installation links, and recovery](docs/build-and-release.md#github-releases).

The stable installer URL is `https://github.com/OWNER/REPO/releases/latest/download/module.json`. Users can instead download the attached module ZIP and extract it into `Data/modules/<module-id>/`. GitHub's automatic source archives are not installation packages. No GitHub Pages site is needed.

For local builds or a different host, explicitly set both environment variables before building/releasing:

| Variable               | Value                                                                       |
| ---------------------- | --------------------------------------------------------------------------- |
| `FOUNDRY_MANIFEST_URL` | Stable public HTTPS URL for the latest `module.json`; may include `{id}`    |
| `FOUNDRY_DOWNLOAD_URL` | Public HTTPS ZIP URL template; must include `{version}`, may include `{id}` |

Use your real host URLs. The generated manifest substitutes the release version/ID. Environment variables are read from the shell; `.env` files are not loaded by these scripts. For custom hosts, upload both files yourself. The GitHub packaging command sets both URLs automatically. A URL is syntax-validated, not checked for reachability. Automatic updates work only after those files are hosted. Never invent repository URLs in template metadata.
