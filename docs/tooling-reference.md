# Tooling reference

[Wiki home](README.md) · [Development](development-and-testing.md) · [Release](build-and-release.md)

These exported helpers are development tools, not workspace runtime APIs. Keep them in Node tooling/tests. Custom scripts live at `scripts/<name>/<name>.ts`; supporting files and mirrored tests are next to their entry point.

## Release helpers

| Function | Purpose |
| --- | --- |
| `createManifest(version, urls?)` | Read source manifest metadata, validate stable version/ID/URL templates, and construct the output manifest with the requested version. |
| `verifyManifest(directory, version)` | Read the built manifest and entry point; reject mismatched version, ID, or module entry. |
| `createArchive(directory, destination)` | Collect permitted distributable files, reject development files/symlinks, exclusively create a ZIP, return its byte count. |
| `run(command, args, cwd, isQuiet?)` | Synchronous child process with hidden Windows window; throw on spawn/nonzero exit errors. |
| `npm(args, cwd, isQuiet?)` | Run the current npm CLI through the current Node executable, using `npm_execpath`. |
| `createReleaseMetadata(repository, tag, version)` | Require a matching stable tag and root version; derive GitHub manifest/download URLs and the archive filename. |
| `requireReleaseBranch(root, branch)` | Enforce an exact branch or any attached branch for `*`; skip checks for `null`. |
| `createReleasePushPlan(root, config)` | Resolve branch/tag policy and the named Git remote before version changes; return null for local-only releases. |
| `pushRelease(root, plan, tag)` | Push explicit branch/tag refs atomically when both are enabled; never follow unrelated tags or force updates. |

```ts
/// <reference types="node" />
import { createManifest } from '../scripts/release/manifest.ts';
import { type ReleaseUrls } from '../scripts/release/types.js';

const urls: ReleaseUrls = {
    manifest: 'https://example.com/modules/{id}/module.json',
    download: 'https://example.com/modules/{id}/{version}/{id}-{version}.zip',
};
const manifest = createManifest('1.2.3', urls);
console.log(manifest.id, manifest.version);
```

This constructs metadata only; it does not change root version files or upload anything. Replace illustrative URLs with the actual host before using generated metadata for distribution. The `npm` wrapper is intended for npm-run release entry points, where `npm_execpath` exists. Archive creation's recursive `collect` helper is private and follows the build output rather than the source tree.

Sources: [manifest](../scripts/release/manifest.ts), [archive](../scripts/release/archive.ts), [process](../scripts/release/process.ts), [release orchestrator](../scripts/release/release.ts).

The [Git policy helpers](../scripts/release/git.ts) implement [release.config.ts](../release.config.ts). Push failures keep completed local release artifacts available for retry; null branch configuration disables all pushes. See [release configuration](build-and-release.md#release-configuration).

The [GitHub packaging entry point](../scripts/package-release/package-release.ts) uses [release metadata](../scripts/package-release/metadata.ts) plus the same build/verifier/archive helpers. It never bumps versions or publishes. Only the tag-triggered workflow performs the GitHub upload, after checks pass; see [GitHub Releases](build-and-release.md#github-releases).

## Documentation helpers

| Function | Purpose |
| --- | --- |
| `extractExamples(markdownFile, markdown)` | Extract checked TypeScript fences into virtual modules with source offsets. |
| `checkExamples(examples, options)` | Compile virtual modules and map diagnostics to original Markdown positions. |

```ts
/// <reference types="node" />
import ts from 'typescript';
import { extractExamples, checkExamples } from '../scripts/check-examples/check-examples.ts';

const markdown = '```ts\nconst count: number = 1;\n```\n';
const examples = extractExamples(`${process.cwd()}/example.md`, markdown);
const diagnostics = checkExamples(examples, {
    target: ts.ScriptTarget.ES2023,
    module: ts.ModuleKind.ESNext,
    strict: true,
    types: [],
    skipLibCheck: true,
});
console.log(diagnostics.length);
```

`DocumentationExample` holds a virtual filename, code, original Markdown path/text, and code-body offset. The normal npm command loads the repository's installed compiler configuration and discovers wiki/root/workspace documents. These helpers write no generated source files and execute no example code.

Source: [example checker](../scripts/check-examples/check-examples.ts).

## Boolean naming helper

`getBooleanNameDiagnostics(program)` inspects the root files of a TypeScript `Program`. Its private visitors inspect declarations, and its private boolean/call-signature checks distinguish flags from mixed value unions while supporting async predicates. It returns compiler-style diagnostics; the CLI formats them and fails the command when necessary.

The check includes bindings, parameters, destructuring, declared properties, and named functions/methods. Object-literal API keys and anonymous callbacks are not renamed. Required contracts can retain names with an adjacent explanatory `boolean-name-exempt` comment. The [development guide](development-and-testing.md) explains integration into npm lint.

Source: [boolean checker](../scripts/check-boolean-names/check-boolean-names.ts).

## Private core implementation helpers

These names are documented for maintenance and are not exported utilities to call from a feature:

| Helper | Role |
| --- | --- |
| Canvas `readyCanvas` | Normalize absent/not-ready native canvas state to `null` for canvas operations. |
| Settings `validate` | Check primitive kind, finite numeric values, and fixed-map own-key membership without evaluating providers. |
| Settings `resolveDefault` | Evaluate a synchronous, fast, side-effect-free default provider at registration/reset and validate its primitive kind. |
| Settings `createChoiceInput` | Evaluate a synchronous, fast, side-effect-free choice provider only on native input rendering; preserve missing IDs as unavailable options. |
| Settings `definitionFor` | Enforce known keys and successful per-facade registration before access. |
| Settings local `set` | Share the validated native write path between public `set` and `reset`. |
| Verbose local `initialize` | Update the isolated cached boolean and serve as the schema's change callback. |
| Hook batch `cleanup` | Remove recorded registration IDs once, including rollback after a partial failure. |

The public behavior is covered by the [Foundry guides](foundry-core/README.md); internal helpers may change as long as those contracts remain correct.
