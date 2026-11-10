# Type catalog

[Wiki home](README.md) · [Type conventions](types-and-conventions.md) · [Foundry core](foundry-core/README.md) · [D&D core](dnd5e-core/README.md)

This catalog covers every named interface/type declaration owned by the core source packages, plus tooling and test-support declarations. **Public** means exported from the package root. **Support** means an implementation declaration; prefer the public contract that uses it. **Tooling/test only** declarations must stay out of runtime feature imports. FoundryGame is declared canonically in foundry-core and re-exported unchanged by dnd5e-core.

Table examples are contextual expressions from the source JSDoc; they assume the referenced actor, settings, or host object exists. Independently compiled examples and behavioral guidance are in the linked guides. A type describes data; it does not register a hook, resolve a document, perform a roll, or execute a rest.

## dnd5e-core: ability

Source: [packages/dnd5e-core/src/ability/ability.types.d.ts](../packages/dnd5e-core/src/ability/ability.types.d.ts).

| Type | Scope | Purpose | Contextual example |
| --- | --- | --- | --- |
| `AbilityKey` | Public | Built-in D&D 5e ability identifiers used to index prepared creature ability data. | `const ability: AbilityKey = 'dex';` |
| `SkillKey` | Public | Built-in D&D 5e skill identifiers used to read prepared skill totals and passive scores. | `const skill: SkillKey = 'prc';` |
| `ProficiencyLevel` | Public | Standard D&D proficiency multipliers for untrained, half-proficient, proficient, and expertise values. | `const expertise: ProficiencyLevel = 2;` |
| `AbilityScoreData` | Public | Minimal prepared native ability fields, including the system's mod and nested save.value. | `const strength: AbilityScoreData = actor.system.abilities.str;` |
| `SkillData` | Support | Prepared skill total and passive score, already including system and module adjustments. | `const perception: SkillData = actor.system.skills.prc;` |
| `SkillCheckContext` | Public | Carry a creature, built-in skill, and optional advantage intent without performing a roll. | `const context: SkillCheckContext = { actor, skill: 'ste', advantage: true };` |

## dnd5e-core: activity

Source: [packages/dnd5e-core/src/activity/activity.types.d.ts](../packages/dnd5e-core/src/activity/activity.types.d.ts).

| Type | Scope | Purpose | Contextual example |
| --- | --- | --- | --- |
| `ActivityType` | Public | Built-in D&D 5e 6.0.6 activity identifiers; utility lookups also accept registered custom strings. | `const type: ActivityType = 'attack';` |
| `Dnd5eActivity` | Public | Minimal native activity model contract containing identity, display name, and an extensible type identifier. | `const activity: Dnd5eActivity \| null = ActivityUtils.getById(item, activityId);` |
| `Dnd5eAttackActivity` | Public | Narrow an activity to the attack discriminator without claiming a full attack-roll model. | `const isAttack = (activity: Dnd5eAttackActivity) => activity.type === 'attack';` |
| `Dnd5eCastActivity` | Public | Narrow an activity to the supported cast discriminator. | `const type: Dnd5eCastActivity['type'] = 'cast';` |
| `Dnd5eSaveActivity` | Public | Narrow an activity to the saving-throw discriminator. | `const type: Dnd5eSaveActivity['type'] = 'save';` |
| `Dnd5eDamageActivity` | Public | Narrow an activity to the damage discriminator. | `const type: Dnd5eDamageActivity['type'] = 'damage';` |
| `Dnd5eSummonActivity` | Public | Narrow an activity to the summon discriminator. | `const type: Dnd5eSummonActivity['type'] = 'summon';` |
| `Dnd5eActivityCollection` | Support | Reuse the native collection contract with D&D 5e's maintained activity-type index. | `const attacks = item.system.activities?.getByType('attack') ?? [];` |

## dnd5e-core: actor

Source: [packages/dnd5e-core/src/actor/actor.types.d.ts](../packages/dnd5e-core/src/actor/actor.types.d.ts).

| Type | Scope | Purpose | Contextual example |
| --- | --- | --- | --- |
| `Dnd5eActorSystem` | Support | Describe only the verified D&D 5e 6.0.6 prepared fields consumed by these helpers, not the full system model. | `const identifier: Dnd5eActorSystem['identifier'] = actor.system.identifier;` |
| `Dnd5eActor` | Public | Extend a native Actor with D&D prepared data, typed owned items, and the system's identifier index. | `if (ActorUtils.isDnd5eActor(value)) { const actor: Dnd5eActor = value; }` |
| `Dnd5eCreatureSystem` | Support | Require the complete prepared creature fields shared by character and NPC actors. | `const hp = (system: Dnd5eCreatureSystem) => system.attributes.hp.effectiveMax;` |
| `Dnd5eCharacter` | Public | Narrow a D&D actor to character type with prepared creature abilities, skills, and resources. | `if (ActorUtils.isCharacter(value)) { const character: Dnd5eCharacter = value; }` |
| `Dnd5eNpc` | Public | Narrow a D&D actor to NPC type with the prepared creature data used by these utilities. | `if (ActorUtils.isNpc(value)) { const npc: Dnd5eNpc = value; }` |
| `Dnd5eCreature` | Public | Represent only character or NPC actors, excluding groups and vehicles lacking the complete creature schema. | `const missing = (actor: Dnd5eCreature) => ResourceUtils.getMissingHitPoints(actor);` |
| `ActorReference` | Public | Store a native actor UUID without retaining a live actor document. | `const reference: ActorReference = { uuid: actor.uuid };` |
| `ActorOwnershipContext` | Public | Pair a D&D actor with the user whose native permissions should be evaluated. | `const context: ActorOwnershipContext = { actor, user: game.user };` |

## dnd5e-core: combat

Source: [packages/dnd5e-core/src/combat/combat.types.d.ts](../packages/dnd5e-core/src/combat/combat.types.d.ts).

| Type | Scope | Purpose | Contextual example |
| --- | --- | --- | --- |
| `CombatContext` | Public | Snapshot a selected combat, optional current combatant, and native nullable round/turn values. | `const context: CombatContext \| null = CombatUtils.getContext();` |
| `CombatantReference` | Public | Identify an embedded combatant using its combat ID and combatant ID without retaining documents. | `const reference: CombatantReference = { combatId: combat.id, combatantId: combatant.id };` |
| `TurnChange` | Public | Describe previous and current combatant references without registering hooks or tracking turns automatically. | `const change: TurnChange = { previous: null, current: reference };` |

## dnd5e-core: effect

Source: [packages/dnd5e-core/src/effect/effect.types.d.ts](../packages/dnd5e-core/src/effect/effect.types.d.ts).

| Type | Scope | Purpose | Contextual example |
| --- | --- | --- | --- |
| `ConditionIdentifier` | Public | An extensible native status identifier, including system-defined and module-defined conditions. | `const condition: ConditionIdentifier = 'incapacitated';` |
| `ActiveCondition` | Public | Associate an active condition ID with the particular native effect that contributes it. | `const conditions: ActiveCondition[] = EffectUtils.getConditions(actor);` |
| `EffectReference` | Public | Store an effect UUID and optional native origin without retaining the effect document. | `const reference: EffectReference = { uuid: effect.uuid, origin: effect.origin };` |

## dnd5e-core: item

Source: [packages/dnd5e-core/src/item/item.types.d.ts](../packages/dnd5e-core/src/item/item.types.d.ts).

| Type | Scope | Purpose | Contextual example |
| --- | --- | --- | --- |
| `Dnd5eItem` | Public | Extend a native Item with the minimal identifier, equipment, attunement, and activity fields used here. | `const item: Dnd5eItem \| null = ItemUtils.getByIdentifier(actor, 'spell:shield');` |

## dnd5e-core: permission

Source: [packages/dnd5e-core/src/permission/permission.types.d.ts](../packages/dnd5e-core/src/permission/permission.types.d.ts).

| Type | Scope | Purpose | Contextual example |
| --- | --- | --- | --- |
| `PermissionCheckResult` | Public | Carry an explicit permission decision and optional explanation for a caller-owned permission workflow. | `const result: PermissionCheckResult = { allowed: false, reason: 'Owner access required' };` |
| `ActorUserRelation` | Public | Represent the highest effective actor ownership relation using familiar native permission tiers. | `const relation: ActorUserRelation = PermissionUtils.getUserRelation(user, actor);` |

## dnd5e-core: resource

Source: [packages/dnd5e-core/src/resource/resource.types.d.ts](../packages/dnd5e-core/src/resource/resource.types.d.ts).

| Type | Scope | Purpose | Contextual example |
| --- | --- | --- | --- |
| `PreparedHitPoints` | Support | Minimal native prepared HP fields, including effective maximum and missing HP after system calculations. | `const hp: PreparedHitPoints = actor.system.attributes.hp;` |
| `HitPointState` | Public | An owned HP snapshot whose max already includes temporary maximum adjustments. | `const hp: HitPointState = ResourceUtils.getHitPoints(actor);` |
| `ResourceData` | Support | Minimal raw resource data that can include numeric pools, nullable values, or boolean NPC resources. | `const lair: ResourceData = { value: true };` |
| `ResourceState` | Public | An owned finite numeric resource snapshot, optionally carrying the native display label. | `const resource: ResourceState = { value: 2, max: 4, label: 'Focus' };` |
| `SpellSlotData` | Support | Prepared native spell-slot pool data, with a level when the system provides one. | `const pool: SpellSlotData = { value: 2, max: 2, level: 3 };` |
| `SpellSlotState` | Public | An owned slot snapshot retaining the pool key so pact and custom pools at equal levels remain distinct. | `const pool: SpellSlotState = { key: 'pact', level: 3, value: 2, max: 2 };` |
| `RestType` | Public | The supported D&D rest categories, without performing or reimplementing any rest mechanics. | `const rest: RestType = 'short';` |

## dnd5e-core: token

Source: [packages/dnd5e-core/src/token/token.types.d.ts](../packages/dnd5e-core/src/token/token.types.d.ts).

| Type | Scope | Purpose | Contextual example |
| --- | --- | --- | --- |
| `Dnd5eToken` | Public | A rendered token whose placeable and document actor references have already been narrowed to D&D actors. | `const inspect = (token: Dnd5eToken) => token.actor.system.identifier;` |

## foundry-core: canvas

Source: [packages/foundry-core/src/canvas/canvas.types.d.ts](../packages/foundry-core/src/canvas/canvas.types.d.ts).

| Type | Scope | Purpose | Contextual example |
| --- | --- | --- | --- |
| `CanvasPosition` | Public | A point in stage/world pixels, rather than client-screen pixels or grid offsets. | `const position: CanvasPosition = { x: 100, y: 200 };` |

## foundry-core: document

Source: [packages/foundry-core/src/document/document.types.d.ts](../packages/foundry-core/src/document/document.types.d.ts).

| Type | Scope | Purpose | Contextual example |
| --- | --- | --- | --- |
| `FoundryDocument` | Public | The native abstract Document base shared by world, embedded, and compendium documents. | `const uuid = (document: FoundryDocument) => document.uuid;` |
| `DocumentGuard` | Public | A caller-supplied predicate that narrows an already validated native document to a subtype. | `const isActor: DocumentGuard<Actor> = document => document.documentName === 'Actor';` |

## foundry-core: src

Source: [packages/foundry-core/src/foundry.d.ts](../packages/foundry-core/src/foundry.d.ts).

| Type | Scope | Purpose | Contextual example |
| --- | --- | --- | --- |
| `FoundryGame` | Public | The native initialized Game instance type derived from Foundry's asynchronous creation API. | `const current: FoundryGame = game;` |

## foundry-core: hooks

Source: [packages/foundry-core/src/hooks/hooks.types.d.ts](../packages/foundry-core/src/hooks/hooks.types.d.ts).

| Type | Scope | Purpose | Contextual example |
| --- | --- | --- | --- |
| `HookDocuments` | Support | Map verified native document names to their instance types for generating document lifecycle hooks. | `type ActorDocument = HookDocuments['Actor'];` |
| `DocumentHookEvents` | Support | Generate typed create, update, and delete hook callbacks, including synchronous cancellable pre-hooks. | `const handler: DocumentHookEvents['updateActor'] = (actor, changed, options, userId) => { void actor; };` |
| `CanvasTearDownOptions` | Public | Describe v14 canvas teardown destinations missing from the installed Foundry declarations. | `const options: CanvasTearDownOptions = { nextScene: null, nextLevel: null };` |
| `CanvasPanPosition` | Public | Extend native camera coordinates with v14's last-viewed level ID. | `const position: CanvasPanPosition = { x: 100, y: 200, scale: 1, level: null };` |
| `KnownHookEvents` | Public | Provide verified v14 callback signatures for lifecycle, canvas, token, and document hooks without a runtime registry. | `const ready: KnownHookEvents['canvasReady'] = current => { void current.scene; };` |
| `KnownHooks` | Public | The union of verified hook names derived from KnownHookEvents. | `const hook: KnownHooks = 'updateActor';` |
| `HookName` | Public | Preserve autocomplete for known hooks while accepting arbitrary custom string names. | `const customHook: HookName = 'my-module.changed';` |
| `HookCallback` | Public | Represent flexible explicitly typed custom callbacks without any or unknown-array variance restrictions. | `const callback: HookCallback = (count: number) => count > 0;` |
| `HookCallbackFor` | Public | Select a verified callback signature for known names and the flexible callback for custom names. | `const callback: HookCallbackFor<'canvasReady'> = current => { void current.scene; };` |
| `HookHandlers` | Public | Associate each hook key with its own callback type for batch registration. | `const handlers: HookHandlers<'ready' \| 'setup'> = { ready: () => {}, setup: () => {} };` |
| `HookCleanup` | Public | An idempotent operation that removes only the listener registrations it owns. | `const stop: HookCleanup = HooksUtils.on('ready', () => {}); stop();` |
| `HookRegistrar` | Support | Describe the native numeric-ID registration boundary while callbacks remain forwarded unchanged. | `const id = registrar.on('ready', callback); registrar.off('ready', id);` |

## foundry-core: scene

Source: [packages/foundry-core/src/scene/scene.types.d.ts](../packages/foundry-core/src/scene/scene.types.d.ts).

| Type | Scope | Purpose | Contextual example |
| --- | --- | --- | --- |
| `SceneContext` | Public | Snapshot the active player scene, independently viewed scene, and canvas readiness. | `const context: SceneContext = SceneUtils.getContext();` |

## foundry-core: settings

Source: [packages/foundry-core/src/settings/settings.types.d.ts](../packages/foundry-core/src/settings/settings.types.d.ts).

| Type | Scope | Purpose | Contextual example |
| --- | --- | --- | --- |
| `SettingValue` | Public | Primitive setting values supported by the typed factory; numeric values must be finite at runtime. | `const defaultValue: SettingValue = true;` |
| `SettingValues` | Support | Associate setting keys with their inferred primitive value kinds. | `const values: SettingValues = { enabled: true, maxTokens: 10 };` |
| `SettingDefault` | Public | Supply a primitive or synchronous, fast, side-effect-free default callback. | `const value: SettingDefault<number> = () => 5;` |
| `SettingChoices` | Public | Map stored string values to dropdown labels. | `const choices: SettingChoices = { first: 'First' };` |
| `SettingChoicesProvider` | Public | Build choices synchronously on input rendering; must be fast and side-effect-free. | `const choices: SettingChoicesProvider = () => ({ '': 'None' });` |
| `SettingProviderResult` | Support | Unwrap a synchronous provider's return type, preserving direct values. | `type Value = SettingProviderResult<() => string>;` |
| `SettingChoiceValue` | Support | Infer direct/provider choice keys, falling back to string. | `const value: SettingChoiceValue<() => { first: string }> = 'first';` |
| `SettingDefaultValue` | Support | Preserve callback return types, widen direct defaults, or fall back to string. | `const value: SettingDefaultValue<() => 1 \| 2> = 2;` |
| `WidenSetting` | Support | Widen literal defaults to primitive read/write types so a true default still accepts false. | `const enabled: WidenSetting<true> = false;` |
| `NativeSettingDefinition` | Support | Reuse the installed native settings registration metadata before applying the facade's stricter value typing. | `type SettingScope = NativeSettingDefinition['scope'];` |
| `PrimitiveSettingRegistration` | Support | Correct native numeric range typing and missing custom-input declarations. | `const definition: PrimitiveSettingRegistration = { name: 'Count', type: Number, default: 5, range: { min: 0, max: 10, step: 1 } };` |
| `SettingsRegistrar` | Support | Expose the verified native register operation with corrected numeric range metadata. | `registrar.register('my-module', 'count', definition);` |
| `ModuleSettingDefinition` | Public | Describe a primitive setting with a required default/scope and matching change callback and UI metadata. | `const definition: ModuleSettingDefinition<boolean> = { scope: 'world', default: true, isHidden: true };` |
| `SettingDefinitions` | Public | Map a schema's keys to definitions whose defaults and callbacks share the corresponding value type. | `const schema: SettingDefinitions<{ enabled: boolean }> = { enabled: { scope: 'world', default: true } };` |
| `SettingValidationDefinition` | Support | Describe direct/provider defaults and choices needed for runtime validation. | `const definition: SettingValidationDefinition = { default: 'first', choices: { first: 'First' } };` |
| `RegisteredSetting` | Support | Retain the schema and resolved registration default that fixes primitive validation. | `const entry: RegisteredSetting<{ default: number }> = { definition: { default: 5 }, defaultValue: 5 };` |
| `SettingDefinitionValue` | Support | Prefer choice keys, then callback return types, then widened direct defaults. | `const value: SettingDefinitionValue<{ default: 'first'; choices: { first: string; second: string } }> = 'second';` |
| `ResolvedSettingValues` | Support | Resolve schema choice unions, callback return types, and direct primitive defaults. | `type Values = ResolvedSettingValues<{ mode: string }, { mode: { scope: 'world'; default: 'first'; choices: { first: string; second: string } } }>;` |
| `SettingSchemaConstraints` | Support | Reject unknown metadata and constrain direct defaults to choice keys without invoking callbacks. | `type Constraints = SettingSchemaConstraints<{ mode: string }, { mode: { scope: 'world'; default: 'first'; choices: { first: string } } }>;` |
| `SettingsValuesOf` | Public | Extract a settings facade's resolved value types, including choice unions, without emitting runtime code. | `type ModuleSettings = SettingsValuesOf<typeof settings>;` |
| `SettingKeyOf` | Public | Extract the string keys accepted by a typed settings facade. | `const key: SettingKeyOf<typeof settings> = 'isVerbose';` |
| `TypedSettings` | Public | Provide explicit registration and schema-checked setting access without caching native values. | `const settings: TypedSettings<{ enabled: boolean }> = SettingsUtils.create('my-module', { enabled: { scope: 'world', default: true } });` |
| `VerboseModeOptions` | Public | Configure an optional module label formatted once and logged only when verbose mode is enabled. | `const options: VerboseModeOptions = { prefix: MODULE_ID };` |
| `VerboseMode` | Public | Keep one module's verbose flag cached and expose lazy console logging with a spreadable setting schema. | `const verbose: VerboseMode = SettingsUtils.withVerboseMode(); verbose.debug('Diagnostics', () => ({ tokenCount: canvas?.tokens?.placeables.length }));` |

## packages/foundry-core/tests/hooks/fixtures.types

Source: [packages/foundry-core/tests/hooks/fixtures.types.d.ts](../packages/foundry-core/tests/hooks/fixtures.types.d.ts).

| Type | Scope | Purpose | Contextual example |
| --- | --- | --- | --- |
| `HookRegistration` | Tooling/test only | Store a mock hook's name, original callback, and one-shot flag under its numeric test ID. | `const registration: HookRegistration = { hook: 'ready', callback: () => {}, isOnce: true };` |

## scripts/check-examples/types

Source: [scripts/check-examples/types.d.ts](../scripts/check-examples/types.d.ts).

| Type | Scope | Purpose | Contextual example |
| --- | --- | --- | --- |
| `DocumentationExample` | Tooling/test only | One TypeScript Markdown fence and its original source position for useful compiler diagnostics. | `const examples: DocumentationExample[] = extractExamples(path, markdown);` |

## scripts/release/types

Source: [scripts/release/types.d.ts](../scripts/release/types.d.ts).

| Type | Scope | Purpose | Contextual example |
| --- | --- | --- | --- |
| `ReleaseUrls` | Tooling/test only | Optional manifest/download URL templates for release manifest construction. | `const urls: ReleaseUrls = {};` |
| `ReleaseConfig` | Tooling/test only | Configure the allowed release branch (main by default), local-only null mode, wildcard mode, and optional tag push. | `const config: ReleaseConfig = { branch: 'release', shouldPushTag: false };` |
| `ReleasePushPlan` | Tooling/test only | Snapshot the checked branch, selected named Git remote, and tag-push policy. | `const plan: ReleasePushPlan = { branch: 'main', remote: 'origin', shouldPushTag: true };` |

## Interpreting the contracts

- Actor/item/activity system shapes are deliberately partial. Public guards narrow native identity and supported discriminators; consult verified system sources before adding fields.
- Reference types contain IDs/UUIDs for caller-owned workflows; they do not retain live documents or resolve themselves.
- Snapshot types describe copied containers or numeric summaries. Any contained native document remains a live reference.
- Settings inference preserves choice keys and default callback return types. Runtime validation checks primitive kind, finite numbers, and fixed-map membership; provider-return unions remain compile-time contracts. See [callback timing and constraints](foundry-core/settings.md#callback-defaults-and-runtime-choices).
- Hook maps and name unions are type-only. HookRegistrar and SettingsRegistrar document small verified native typing boundaries rather than new runtime services.
- Existing public/native boolean property names such as allowed, canvasReady, advantage, equipped, and attuned are retained with specific naming-check exemptions in source.
