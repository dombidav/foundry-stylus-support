# Types and conventions

[Wiki home](README.md) · [Type catalog](type-catalog.md) · [Development checks](development-and-testing.md)

## Declaration placement and imports

Put named interfaces and type aliases in dedicated `.d.ts` files beside the feature or utility that owns them. Runtime `.ts` files contain functions and actual behavior. Use interfaces for object contracts where appropriate and aliases for unions, mapped types, conditional types, and related constructs.

For a declaration file, the pattern is:

```ts
import { type ActorReference } from '@template/dnd5e-core';

/** A caller-owned selection identified without retaining an actor document. */
export interface ExampleSelection {
    actor: ActorReference;
    isPinned: boolean;
}
```

Use inline type imports in consuming code. For local declaration files, `import { type ExampleSelection } from './example.types.js'` resolves `example.types.d.ts`. TypeScript 6 rejects explicit `.d.ts` specifiers with the inline syntax. Declaration-level `import type` and value imports for types are disallowed by the repository's lint rules.

```ts
import { type ActorReference, type Dnd5eActor } from '@template/dnd5e-core';

export function toActorReference(actor: Dnd5eActor): ActorReference {
    return { uuid: actor.uuid };
}
```

## Foundry globals and partial contracts

`foundry-core/src/foundry.d.ts` loads `@dfreds/foundry-types` and owns the missing `game`, `ui`, and `canvas` singleton declarations. `FoundryGame` is derived from native `foundry.Game.create`. The module's `foundry.d.ts` imports the core package to bring those declarations into its TypeScript program. Declarations add no runtime initialization.

The `@client/*` and `@common/*` paths resolve installed native declarations. Use them for type imports; Foundry supplies runtime classes/globals itself. Do not bundle the declaration package as a runtime dependency.

D&D actor/item/activity types describe the prepared fields used by these utilities. They are **partial contracts**, not a replacement for the complete system schema. An activity discriminator such as `Dnd5eAttackActivity` does not declare every attack formula, roll configuration, or system method. See [compatibility](compatibility-and-troubleshooting.md).

## Boolean names

Use a meaningful predicate prefix for booleans and named boolean-returning functions: `is`, `are`, `has`, `have`, `should`, `can`, `needs`, or another supported form. Uppercase constants can use names such as `IS_READY`.

```ts
import { ActorUtils, type Dnd5eActor } from '@template/dnd5e-core';

export function isCharacterActor(actor: Dnd5eActor): boolean {
    return ActorUtils.isCharacter(actor);
}
```

The type-aware check handles inferred values, optional flags, declarations, destructured bindings, and async boolean-returning functions. Object-literal keys remain API/data contracts. Required native names and established public names can use an adjacent `// boolean-name-exempt: <specific reason>` comment. The existing native `equipped`, `attuned`, and roll option fields are preserved; private locals should be renamed rather than exempted.

## Derive settings types

Use the actual facade as the source of truth instead of duplicating its keys and value unions. The following declarations belong in a module-owned `.d.ts` file:

```ts
import { type SettingsValuesOf, type SettingKeyOf } from '@template/foundry-core';
import { type settings } from '../packages/module/src/settings.ts';

export type ModuleSettings = SettingsValuesOf<typeof settings>;
export type ModuleSettingKey = SettingKeyOf<typeof settings>;
export type ExampleChoice = ModuleSettings['testChoice'];
```

Type imports and declaration-only expressions are erased. Here `ExampleChoice` is `'first' | 'second' | 'third'`, while the numeric slider remains `number`. The helper does not model numeric ranges as literal unions.

## Documentation and assertions

Every named type, interface, and function in the two core packages has English JSDoc describing its purpose and a short `@example`, including internal helpers and interface methods. Use `@returns` and `@throws` only when they add strongly justified information.

Prefer real type guards over unchecked generic casts. For example, [DocumentUtils](foundry-core/canvas-scenes-documents.md) requires a caller-supplied subtype predicate. Native settings/registration declarations have small, documented type boundaries where the installed declarations lose precision; those casts are paired with runtime validation or verified native behavior. Keep `any`, blanket suppression, and unrelated convenience casts out of project code.
