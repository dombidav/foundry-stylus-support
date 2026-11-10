# Build and release

[Wiki home](README.md) · [Getting started](getting-started.md) · [Development checks](development-and-testing.md)

## Production build

```sh
npm run check
npm run build
```

[The module's Vite configuration](../packages/module/vite.config.ts) builds `src/main.ts` into browser-compatible, minified native ES modules targeting ES2023. It copies distributable files from `packages/module/static` and generates the final manifest. Output is `dist/module`; there are no source maps, development server, HMR, or bundled Foundry runtime.

```text
dist/module/
├── module.json
└── scripts/main.js
```

Shared workspaces export TypeScript source, allowing Vite to remove unused functions and type-only imports. The current module consumes Foundry settings helpers, while D&D utilities and Lodash remain unused. `MODULE_ID` comes from the source manifest's named ID export; its bundle regression test checks that unrelated manifest metadata is excluded.

This build/release workflow targets the shipped module package. Additional module packages require explicit build/output/release configuration; they are not automatically bundled into this module's ZIP.

## Version ownership

| Location | Role |
| --- | --- |
| Root `package.json` | Authoritative release version. |
| Root `package-lock.json` | Updated root version metadata and locked dependencies. |
| Workspace package versions | Private `0.0.0` linking metadata; remain unchanged during releases. |
| Source `static/module.json` version | Placeholder `0.0.0`; replaced when generating output. |
| Source manifest `id` | Authoritative module ID for runtime code, manifests, and archive names. |

Stable versions use `major.minor.patch` without prerelease labels or leading zeros. From `1.0.0`, a patch yields `1.0.1`, a minor yields `1.1.0`, and a major yields `2.0.0`.

## Create a release

First configure Git author identity, initialize the repository if necessary, and commit or stash unrelated changes. The release requires an existing commit, the repository root as its Git root, and a clean working tree including untracked files.

Run **one** command according to the intended increment:

| Command | Increment |
| --- | --- |
| `npm run release:patch` | Backward-compatible fix. |
| `npm run release:minor` | Backward-compatible capability. |
| `npm run release:major` | Breaking change. |

The [release script](../scripts/release/release.ts):

1. Validates the Git root, clean tree, configured release branch/push remote, source manifest, current version, and intended archive/tag availability.
2. Asks npm to calculate the next version in an isolated temporary package, leaving project metadata unchanged during preflight.
3. Runs the full check and an initial production build, then verifies that the tree, HEAD, and selected branch have not changed.
4. Runs `npm version --no-git-tag-version --ignore-scripts --workspaces=false` at the root, updating only root version metadata.
5. Builds again, verifies the built manifest's version/ID/entry point, and creates the archive exclusively.
6. Commits `package.json` and `package-lock.json`, then creates an annotated `v<version>` tag.
7. Pushes the selected branch and optional release tag according to the root configuration, atomically when both are enabled.

Pushing the release tag triggers the GitHub publishing workflow below. The local command does not upload GitHub release assets itself; it pushes only the selected Git refs. `release:package` remains a build/archive-only command unaffected by this configuration.

## Release configuration

Edit [release.config.ts](../release.config.ts) and commit it before running a release. Omitted options use the shown defaults:

```ts
import { type ReleaseConfig } from '../scripts/release/types.js';

export default {
    branch: 'main',
    shouldPushTag: true,
} satisfies ReleaseConfig;
```

| Configuration | Branch check | Branch push | Tag push |
| --- | --- | --- | --- |
| Defaults / `branch: 'main'` | Must be main | main | Yes |
| `branch: 'release'` | Must be release | release | Yes |
| `branch: '*'` | Any attached branch | Current branch | Yes |
| `branch: null` | None; detached HEAD is allowed | No | No, even if `shouldPushTag` is true |
| Any non-null branch with `shouldPushTag: false` | As configured | Selected branch | No |

`shouldPushTag` controls uploading the release tag, not creating it locally. Every successful local release still creates its annotated tag. With a null branch, all remote work is skipped; no configured remote is required. For non-null branches, detached HEAD, a wrong branch, or an unusable remote fails before versioning/building. The selected branch is checked again after validation and immediately before pushing, so changing branches during a release is rejected even in wildcard mode.

The remote is selected using Git's configured precedence: `branch.<current>.pushRemote`, `remote.pushDefault`, then `branch.<current>.remote`. Without those, use `origin` if present or the sole named remote. If selection is ambiguous or a configured remote does not exist, configure it explicitly, for example:

```sh
git config branch.main.pushRemote upstream
```

Replace main/upstream with the actual branch/remote names. The destination branch always has the current branch's name, regardless of upstream merge/refspec settings. The command pushes explicit refs with `--no-follow-tags`, so `push.followTags=true` cannot bypass `shouldPushTag: false`. When branch and tag are enabled, `--atomic` makes them succeed or fail together; the remote must support atomic pushes. GitHub supports this. No force push is performed, and unrelated refs/tags are excluded. See [Git push](https://git-scm.com/docs/git-push) and [Git remote selection](https://git-scm.com/docs/git-config).

## Archive contract

The artifact is `releases/<module-id>-<version>.zip`. Its root contains `module.json`, `scripts/main.js`, and any distributable static assets. There is no enclosing module directory inside the ZIP.

Archive creation rejects symbolic links, hidden/development files, source TypeScript, tests, source maps, dependency directories, and tool configuration. It requires the manifest and entry point, refuses to overwrite an existing archive, and removes an incomplete archive if writing fails. ZIPs are ignored by Git; `releases/.gitkeep` keeps the directory tracked.

For manual installation, extract the archive contents into `<Foundry user data>/Data/modules/<module-id>`. A local ZIP is not a Foundry manifest-installer URL.

## Optional hosted updates

Before building or releasing, explicitly configure **both** shell environment variables:

| Variable | Required shape |
| --- | --- |
| `FOUNDRY_MANIFEST_URL` | Stable public HTTPS manifest URL; may contain `{id}`, must not contain `{version}`. |
| `FOUNDRY_DOWNLOAD_URL` | Public HTTPS archive URL containing `{version}`; may contain `{id}`. |

For example, after replacing the illustrative host with your real release host:

```powershell
$env:FOUNDRY_MANIFEST_URL = 'https://example.com/modules/{id}/module.json'
$env:FOUNDRY_DOWNLOAD_URL = 'https://example.com/modules/{id}/{version}/{id}-{version}.zip'
npm run build
```

The builder substitutes the root version and manifest ID. URLs must be HTTPS, have a dotted non-localhost hostname, and contain no credentials. Validation checks syntax and the template contract; it does not test reachability or upload files. No update URLs are emitted when neither variable is supplied. `.env` files are not loaded by these scripts.

For a custom host, upload the versioned archive and publish the generated manifest at the stable URL yourself. Those hosted files must agree before users can update through Foundry. GitHub packaging configures and publishes its own matching URLs automatically.

## GitHub Releases

[`.github/workflows/release.yml`](../.github/workflows/release.yml) runs only when a `v*` tag is pushed, normally by `release:patch/minor/major`. Its packaging step accepts stable `vMAJOR.MINOR.PATCH` tags that exactly match the authoritative root version. Branch pushes and pull requests do not publish. The workflow does not increment versions, change Git metadata, or push anything back.

The job uses Node 24 and npm, runs `npm ci` and `npm run check`, then calls `npm run release:package`. This command validates the tag/repository, builds with GitHub update URLs, verifies the manifest, and exclusively creates `releases/<module-id>-<version>.zip`. The workflow publishes that ZIP and `dist/module/module.json` using GitHub CLI with generated release notes. Both contain the same generated manifest. The CLI uploads assets to a draft before publishing; failed builds/checks never publish a release.

### One-time repository setup

1. Put this workflow in the repository and ensure the release tag includes it.
2. Enable GitHub Actions and allow `actions/checkout` and `actions/setup-node` if organization policy restricts actions.
3. Permit the job's explicit `contents: write` permission. The built-in `GITHUB_TOKEN` is provided automatically; no personal access token or custom secret is required.
4. Use a public repository for ordinary Foundry installation. Private release assets require authentication that the public manifest installer does not supply.
5. Set the actual module ID, title, and author in `packages/module/static/module.json` before the first real module release. Repository names and module IDs may differ.

The package command reads `GITHUB_REPOSITORY` and `GITHUB_REF_NAME`; GitHub supplies both automatically. Forks/template copies therefore use their own repository URLs. The workflow targets GitHub.com. No Pages site, external hosting, or manually maintained URL variables are needed.

### Publish a new version

Commit your feature, workflow, and release configuration changes first. From main with the default configuration, run one command. For example, from root version `1.0.0`:

```sh
npm run release:patch
```

The command creates version `1.0.1`, its archive/commit/tag, and pushes the branch and tag. With `branch: null`, nothing is pushed; with `shouldPushTag: false`, only the branch is pushed. In both cases a GitHub release waits until you deliberately push the release tag. GitHub independently rebuilds the tagged commit with hosted URLs; an unconfigured local ZIP does not gain update URLs retroactively. Publish increasing stable versions. GitHub automatically selects Latest using date/version; prereleases are not supported by this template's version contract.

### Installation and update URLs

For repository `OWNER/REPO`, module ID `my-module`, and version `1.2.3`, the generated fields are:

```json
{
  "version": "1.2.3",
  "manifest": "https://github.com/OWNER/REPO/releases/latest/download/module.json",
  "download": "https://github.com/OWNER/REPO/releases/download/v1.2.3/my-module-1.2.3.zip"
}
```

The manifest URL stays stable, while the archive URL pins the manifest's exact version. Share the stable URL for Foundry's **Install Module → Manifest URL** field. Alternatively, download the attached `my-module-1.2.3.zip` and extract its contents into `Data/modules/my-module/`. Both paths install the same built files and retain the hosted update URL. GitHub's automatic **Source code (zip)** and **Source code (tar.gz)** downloads contain development source, not the distributable module.

For a specific older release, its uploaded manifest is available at `https://github.com/OWNER/REPO/releases/download/v1.2.3/module.json`; it downloads that version's archive. Its `manifest` field still points to Latest for subsequent update checks.

### Retry a failed publish

If checks/build/package fail, fix the cause before creating a new version; inspect the failed Actions run. A transient failure may be retried with **Re-run failed jobs**. If asset upload fails, inspect any remaining draft before retrying: the workflow refuses to overwrite an existing release. Remove an unpublished incomplete draft deliberately before retrying the same tag. Published releases and their assets should remain unchanged; ship a new version for corrections.

`npm run release:package` is a build/archive command only: it does not run checks itself or contact GitHub. For a local packaging smoke test, run checks first and set the GitHub variables to the intended repository and current root version's tag. Existing archives are never overwritten.

Sources: [GitHub release asset links](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases), [GitHub CLI release creation](https://cli.github.com/manual/gh_release_create), [GitHub token permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions), and [Foundry module manifests](https://foundryvtt.com/article/module-development/).

## Recover from failure

| Failure stage | Result and next action |
| --- | --- |
| Preflight/check/build before root version changes | The script removes temporary calculation data and applicable generated output. Fix the cause and retry. |
| After root version metadata changes, before the release commit | Metadata may remain changed. Review both staged and unstaged diffs before deciding to complete or abandon the attempt. |
| Archive writing fails | Incomplete output is removed; existing archives are preserved. |
| Tag creation fails after the commit | The ZIP and release commit remain valid. Create the missing tag as instructed; do not run another version increment. |
| Branch/tag push fails after local completion | Keep the ZIP, commit, and tag. Fix authentication, remote policy, or ref conflicts; retry the selected refs with follow-tags disabled and atomic mode when both are enabled. Do not increment again or rerun the release command. |

Inspect recovery state:

```sh
git status
git diff
git diff --cached
```

To abandon the metadata change **after reviewing it**, restore only `package.json` and `package-lock.json` as the script's diagnostic instructs, then rebuild. Do not reset unrelated work. The root release version is never changed merely by `npm run build`.
