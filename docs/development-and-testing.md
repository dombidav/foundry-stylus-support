# Development and testing

[Wiki home](README.md) · [Types](types-and-conventions.md) · [Build and release](build-and-release.md)

## Commands

Run these from the repository root:

| Command | What it checks or produces |
| --- | --- |
| `npm run typecheck` | Root tooling, every workspace's source/tests, and all checked Markdown examples. |
| `npm run check:examples` | Independent TypeScript compilation of wiki/README fences, without executing them. |
| `npm run lint` | ESLint recommended rules, Prettier, and inferred boolean naming. |
| `npm run lint:fix` | Automatic ESLint/formatting fixes followed by boolean naming checks. |
| `npm run test` | Vitest unit tests in Node. |
| `npm run test:watch` | Vitest watch mode. |
| `npm run check` | Typechecking, lint, and unit tests. |
| `npm run build` | Production browser bundle and generated manifest. |

Use the committed `.editorconfig` and `.prettierrc.json`. The current editor indentation is four spaces. Boolean naming is a separate TypeScript-based step within the npm lint command; its configuration is [tsconfig.lint.json](../tsconfig.lint.json). It is not a runtime dependency or an editor ESLint plugin.

## Test placement

```text
packages/module/src/features/example/example.utils.ts
packages/module/tests/features/example/example.utils.test.ts

scripts/check-examples/check-examples.ts
scripts/check-examples/tests/check-examples.test.ts
```

Vitest discovers `.test.ts` files only inside workspace/script test directories. Tests remain part of TypeScript checks. Empty feature directories use `.gitkeep` until behavior exists; they do not need empty test suites.

Choose tests that protect behavior: lifecycle timing, correct identity, native permission delegation, cleanup ownership, corrupted settings values, and skipped expensive logging work. Avoid tests that only repeat a trivial implementation or assert cosmetic source structure.

```ts
import { expect, it, vi } from 'vitest';
import { SettingsUtils } from '@template/foundry-core';

it('does not evaluate disabled diagnostic producers', () => {
    const verbose = SettingsUtils.withVerboseMode();
    const producer = vi.fn(() => ({ count: 42 }));
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    try {
        verbose.debug(producer);
        expect(producer).not.toHaveBeenCalled();
        expect(debug).not.toHaveBeenCalled();
    } finally {
        debug.mockRestore();
    }
});
```

The actual Vitest configuration also restores mocks and unstubs globals between tests. Use narrow mocks for the native surface being exercised. Partial native-document fixtures belong at test boundaries; they do not prove that arbitrary document-shaped objects are valid production documents.

## Documentation examples

[check-examples.ts](../scripts/check-examples/check-examples.ts) reads `README.md`, `packages/*/README.md`, and `docs/**/*.md`. Every exact `ts` or `typescript` triple-backtick fence becomes an independent virtual TypeScript module. Imports must be present in each block. Relative imports resolve from the Markdown file's directory. Compiler errors are remapped to the original Markdown line.

Fences are not executed and no generated example files are written. Shell commands, diagrams, inline contextual snippets, and declaration JSDoc examples are outside this compiler check. Use `text` for intentional pseudocode; do not mark valid executable examples as pseudocode merely to avoid fixing errors.

## Tooling scripts

Keep a custom script at `scripts/<name>/<name>.ts`, executed through `tsx`; supporting files stay alongside it. Current scripts are:

| Script | Responsibility |
| --- | --- |
| `scripts/check-boolean-names/check-boolean-names.ts` | Inspect local TypeScript declarations and named predicates for boolean prefixes. |
| `scripts/check-examples/check-examples.ts` | Compile actual Markdown examples using installed project APIs. |
| `scripts/release/release.ts` | Validate the configured branch, increment the root version, build/archive, create a commit/tag, and push according to release.config.ts. |
| `scripts/package-release/package-release.ts` | Validate GitHub tag metadata, build with hosted URLs, and package without changing the version or publishing. |

The release directory also contains the native-process runner, manifest builder/verifier, archive writer, and declaration-only URL contracts. Their full workflow is described in [Build and release](build-and-release.md).

## Before committing

Run `npm run check` and `npm run build` after relevant changes. Review runtime dependencies, listener lifetimes, repeated work, and production tree-shaking. A type-only change should stay out of emitted JavaScript. A new unused utility should disappear from the production bundle. Use a local bundle probe when the import pattern makes that uncertain.

Tests and compiled examples complement live Foundry validation. Check the actual UI, canvas, and system behavior in a supported world when the change depends on host behavior. Keep Git checkpoints reviewable. Running a release command authorizes its configured branch/tag pushes; pushing a stable release tag starts the publishing workflow. Test push behavior only against isolated local repositories.
