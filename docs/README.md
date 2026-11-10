# Project wiki

This wiki explains the **implemented template**, its public utilities and types, and the conventions for extending it. The runtime target is **Foundry VTT v14** with **D&D 5e 6.0.6**. Development requires **Node.js 24.14.1+** and **npm 11+**. See [compatibility](compatibility-and-troubleshooting.md) before changing those targets.

## Start here

| Goal | Page |
| --- | --- |
| Install, build, and run the example module | [Getting started](getting-started.md) |
| Choose the correct workspace and design a feature | [Architecture](architecture.md) |
| Understand initialization and the example feature scaffold | [Lifecycle and features](lifecycle-and-features.md) |
| Write declarations and follow naming/import conventions | [Types and conventions](types-and-conventions.md) |
| Run checks and add tests | [Development and testing](development-and-testing.md) |
| Understand development script/helper APIs | [Tooling reference](tooling-reference.md) |
| Create local releases, publish GitHub assets, or configure update URLs | [Build and release](build-and-release.md) |
| Diagnose lifecycle, settings, and toolchain problems | [Compatibility and troubleshooting](compatibility-and-troubleshooting.md) |

## API reference

| Layer | Reference |
| --- | --- |
| System-independent Foundry helpers | [Foundry core](foundry-core/README.md) |
| Typed hooks, custom events, cleanup | [Hooks](foundry-core/hooks.md) |
| Settings, choice unions, reset, cached lazy logging | [Settings and verbose mode](foundry-core/settings.md) |
| Canvas, scenes, UUID/document guards | [Canvas, scenes, and documents](foundry-core/canvas-scenes-documents.md) |
| Reusable D&D 5e helpers | [D&D 5e core](dnd5e-core/README.md) |
| Actor guards and token identity | [Actors and tokens](dnd5e-core/actors-and-tokens.md) |
| Identifier indexes and activities | [Items and activities](dnd5e-core/items-and-activities.md) |
| Encounter state and ownership | [Combat and permissions](dnd5e-core/combat-and-permissions.md) |
| Conditions and active effects | [Effects](dnd5e-core/effects.md) |
| Prepared statistics and resource snapshots | [Abilities and resources](dnd5e-core/abilities-and-resources.md) |
| Every named core declaration, with scope and examples | [Type catalog](type-catalog.md) |

Each utility reference lists every function in its namespaces, explains edge cases and cost, and supplies examples. The type catalog also includes declaration support types that are not exported from package roots; their inclusion documents the implementation rather than recommending internal imports.

## How to read examples

- `ts`/`typescript` fenced blocks are independently typechecked by `npm run check:examples`, including their actual imports. They are not executed by that command.
- Foundry-dependent examples run inside the host after the appropriate lifecycle phase. A successful typecheck does not simulate a world, canvas, permissions, or D&D rules.
- Examples use the real `@template/*` workspace names. Relative imports resolve from the document containing them; adapt those paths when copying into a feature.
- Inline snippets in tables show contextual usage. Complete import/lifecycle examples live in the linked guides.
- Source links are repository-relative. Keep this wiki with the repository when sharing it.

The current example registers `isVerbose`, `testChoice`, and `testInteger`; its entry point, lifecycle handlers, and settings are under [packages/module/src](../packages/module/src). [AGENTS.md](../AGENTS.md) is the repository's contributor instruction source.
