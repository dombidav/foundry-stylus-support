# Getting started

[Wiki home](README.md) · [Architecture](architecture.md) · [Build and release](build-and-release.md)

## Install and verify

Use Node.js 24.14.1 or newer and npm 11 or newer. Run commands from the repository root:

```sh
node --version
npm --version
npm install
npm run check
npm run build
```

Use `npm ci` for a clean installation from the committed lockfile. Use npm for workspace/dependency changes and commit the resulting `package-lock.json`. All workspaces are private; their `0.0.0` versions are internal linking metadata.

`check` includes project typechecking, documentation example typechecking, ESLint/Prettier, boolean naming checks, and unit tests. `build` produces the browser artifact:

```text
dist/module/
├── module.json
├── scripts/main.js
└── styles/stylus.css
```

## Configure your module

Edit [the source manifest](../packages/module/static/module.json): ID, title, description, and authors. Use a lowercase slug for the ID. The root [package version](../package.json) is the release version; the manifest's source `0.0.0` is replaced during builds.

The module ID is available through [module-id.ts](../packages/module/src/module-id.ts). It is a named JSON re-export that Vite reduces to the consumed ID value, keeping unrelated manifest metadata out of runtime code.

```ts
import { SettingsUtils } from '@template/foundry-core';
import { MODULE_ID } from '../packages/module/src/module-id.ts';

const verbose = SettingsUtils.withVerboseMode({ prefix: MODULE_ID });
export const settings = SettingsUtils.create(MODULE_ID, { ...verbose.schema });
```

This example only constructs the facade. Its explicit registration and initial cache read belong in [lifecycle handlers](lifecycle-and-features.md).

## Install into Foundry

Copy the **contents** of `dist/module` into `<Foundry user data>/Data/modules/<module-id>`. The resulting layout must contain `Data/modules/<module-id>/module.json`, with `scripts/main.js` below it. Restart Foundry as needed, open a D&D 5e world, and enable the module under Manage Modules.

Enable Swipe VTT in the same world. On a loaded scene, use the floating button on the left to enable the stylus toolbar. Set up button gestures under **Configure Settings → Module Settings → Stylus Support → Configure stylus buttons**. [Stylus setup and calibration](stylus-support.md)

## Iterate

Edit source, run `npm run check`, rebuild, and reload Foundry. The template has no development server or HMR. Tests run in Node with narrow native mocks; verify actual in-app behavior against the supported host versions.

Stylus behavior lives in the [stylus feature](../packages/module/src/features/stylus). Follow the [feature walkthrough](lifecycle-and-features.md) when adding behavior. To distribute an artifact, use the [release workflow](build-and-release.md).
