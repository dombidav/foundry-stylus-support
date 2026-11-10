import { type FoundryGame } from '../foundry.js';
import { type CustomFormInput } from '@client/applications/forms/fields.mjs';

/**
 * Primitive setting values supported by the typed factory; numeric values must be finite at runtime.
 *
 * @example
 * const defaultValue: SettingValue = true;
 */
export type SettingValue = boolean | number | string;
/**
 * Associate setting keys with their inferred primitive value kinds.
 *
 * @example
 * const values: SettingValues = { enabled: true, maxTokens: 10 };
 */
export type SettingValues = Record<string, SettingValue>;

/**
 * Supply a primitive default directly or through a synchronous, fast, side-effect-free callback.
 * Callbacks run during registration and reset, never during facade construction or ordinary reads/writes.
 *
 * @example
 * const defaultValue: SettingDefault<number> = () => 5;
 */
export type SettingDefault<T extends SettingValue = SettingValue> =
    T | (() => T);

/**
 * Map stored string choice keys to their display labels.
 *
 * @example
 * const choices: SettingChoices = { first: 'First', second: 'Second' };
 */
export type SettingChoices = Record<string, string>;

/**
 * Build dropdown choices synchronously when the native input is rendered.
 * The callback must be fast and side-effect-free; it is not invoked by create, register, get, set, or reset.
 *
 * @example
 * const choices: SettingChoicesProvider = () => ({ '': 'No selection' });
 */
export type SettingChoicesProvider = () => SettingChoices;

/**
 * Unwrap a synchronous provider's return type while leaving direct values unchanged.
 *
 * @example
 * type Value = SettingProviderResult<() => 'first' | 'second'>;
 */
export type SettingProviderResult<T> = T extends () => infer TResult
    ? TResult
    : T;

/**
 * Infer string keys from a direct/provider choice map, falling back to string when keys are unavailable.
 *
 * @example
 * const value: SettingChoiceValue<() => { first: string; second: string }> = 'first';
 */
export type SettingChoiceValue<T> = [SettingProviderResult<T>] extends [never]
    ? string
    : SettingProviderResult<T> extends SettingChoices
      ? [Extract<keyof SettingProviderResult<T>, string | number>] extends [
            never,
        ]
          ? string
          : `${Extract<keyof SettingProviderResult<T>, string | number>}`
      : string;

/**
 * Preserve a default callback's primitive return type, widen direct defaults, and otherwise fall back to string.
 *
 * @example
 * const value: SettingDefaultValue<() => 1 | 2> = 2;
 */
export type SettingDefaultValue<T> = T extends () => infer TResult
    ? unknown extends TResult
        ? string
        : [TResult] extends [never]
          ? string
          : TResult extends SettingValue
            ? TResult
            : string
    : T extends SettingValue
      ? WidenSetting<T>
      : string;
/**
 * Widen literal defaults to primitive read/write types so a true default still accepts false.
 *
 * @example
 * const enabled: WidenSetting<true> = false;
 */
export type WidenSetting<T extends SettingValue> = T extends boolean
    ? boolean
    : T extends number
      ? number
      : string;
/**
 * Reuse the installed native settings registration metadata before applying the facade's stricter value typing.
 *
 * @example
 * type SettingScope = NativeSettingDefinition['scope'];
 */
export type NativeSettingDefinition = Parameters<
    FoundryGame['settings']['register']
>[2];

/**
 * Preserve native metadata while correcting the installed declaration's numeric range and missing custom-input support.
 *
 * @example
 * const definition: PrimitiveSettingRegistration = { name: 'Count', type: Number, default: 5, range: { min: 0, max: 10, step: 1 } };
 */
export interface PrimitiveSettingRegistration extends Omit<
    NativeSettingDefinition,
    'range'
> {
    range?: { min: number; max: number; step: number };
    input?: CustomFormInput;
}
/**
 * Expose the verified native register operation with corrected numeric range metadata.
 *
 * @example
 * registrar.register('my-module', 'count', definition);
 */
export interface SettingsRegistrar {
    /**
     * Register a namespaced native setting while retaining its receiver and supplied metadata.
     *
     * @example
     * registrar.register('my-module', 'count', definition);
     */
    register(
        namespace: string,
        key: string,
        definition: PrimitiveSettingRegistration,
    ): void;
}

/**
 * Describe a primitive setting with a required default/scope and matching change callback and UI metadata.
 *
 * @example
 * const definition: ModuleSettingDefinition<boolean> = { scope: 'world', default: true, isHidden: true };
 */
export interface ModuleSettingDefinition<T extends SettingValue> extends Omit<
    NativeSettingDefinition,
    | 'name'
    | 'default'
    | 'type'
    | 'onChange'
    | 'choices'
    | 'range'
    | 'scope'
    | 'config'
    | 'input'
> {
    name?: string;
    scope: NonNullable<NativeSettingDefinition['scope']>;
    /**
     * Use a primitive or synchronous, fast, side-effect-free callback evaluated at registration and reset.
     * The first result fixes the native primitive kind for this facade's lifetime.
     *
     * @example
     * const definition: ModuleSettingDefinition<number> = { scope: 'client', default: () => 5 };
     */
    default: SettingDefault<T>;
    /**
     * Hide this setting from Foundry's configuration UI; defaults to false.
     *
     * @example
     * const definition: ModuleSettingDefinition<string> = { scope: 'user', default: 'overview', isHidden: true };
     */
    isHidden?: boolean;
    /**
     * Handle a validated primitive setting change without changing Foundry's callback return semantics.
     *
     * @example
     * const onChange: NonNullable<ModuleSettingDefinition<boolean>['onChange']> = enabled => { void enabled; };
     */
    onChange?: (value: NoInfer<WidenSetting<T>>) => void | Promise<void>;
    /**
     * Supply a fixed map or a synchronous, fast, side-effect-free dropdown provider evaluated only on input rendering.
     * Provider-backed choices describe current UI options rather than a persistent-value membership validator.
     *
     * @example
     * const definition: ModuleSettingDefinition<string> = { scope: 'world', default: '', choices: () => ({ '': 'None' }) };
     */
    choices?: T extends string
        ? SettingChoices | SettingChoicesProvider
        : never;
    range?: T extends number
        ? { min: number; max: number; step: number }
        : never;
}
/**
 * Map a schema's keys to definitions whose defaults and callbacks share the corresponding value type.
 *
 * @example
 * const schema: SettingDefinitions<{ enabled: boolean }> = { enabled: { scope: 'world', default: true } };
 */
export type SettingDefinitions<T extends SettingValues> = {
    [K in keyof T]: ModuleSettingDefinition<T[K]>;
};

/**
 * Describe a direct/provider default and optional choices needed by runtime validation.
 *
 * @example
 * const definition: SettingValidationDefinition = { default: 'first', choices: { first: 'First' } };
 */
export interface SettingValidationDefinition {
    default: SettingDefault;
    choices?: SettingChoices | SettingChoicesProvider;
}

/**
 * Retain the original schema and the resolved default that fixes native primitive validation after registration.
 *
 * @example
 * const entry: RegisteredSetting<{ default: () => number }> = { definition: { default: () => 5 }, defaultValue: 5 };
 */
export interface RegisteredSetting<T extends SettingValidationDefinition> {
    readonly definition: T;
    readonly defaultValue: SettingValue;
}

/**
 * Prefer choice-map/provider keys, then a default callback's return type, then a widened direct primitive default.
 *
 * @example
 * const value: SettingDefinitionValue<{ default: 'first'; choices: { first: string; second: string } }> = 'second';
 */
export type SettingDefinitionValue<T> = T extends { choices: infer TChoices }
    ? SettingChoiceValue<TChoices>
    : T extends { default: infer TDefault }
      ? SettingDefaultValue<TDefault>
      : string;

/**
 * Resolve choice key unions and default callback return types while widening direct primitive defaults.
 *
 * @example
 * type Values = ResolvedSettingValues<{ mode: string }, { mode: { scope: 'world'; default: 'first'; choices: { first: string; second: string } } }>;
 */
export type ResolvedSettingValues<
    T extends SettingValues,
    TSchema extends SettingDefinitions<T>,
> = {
    -readonly [K in keyof T & keyof TSchema]: SettingDefinitionValue<
        TSchema[K]
    >;
};

/**
 * Reject unknown metadata and check direct defaults against inferred choice keys without invoking callbacks.
 * Callback defaults are checked against fixed choice maps at registration and reset.
 *
 * @example
 * type Constraints = SettingSchemaConstraints<{ mode: string }, { mode: { scope: 'world'; default: 'first'; choices: { first: string } } }>;
 */
export type SettingSchemaConstraints<
    T extends SettingValues,
    TSchema extends SettingDefinitions<T>,
> = {
    [K in keyof T]: Record<
        Exclude<keyof TSchema[K], keyof ModuleSettingDefinition<T[K]>>,
        never
    > &
        (TSchema[K] extends { choices: infer TChoices; default: infer TDefault }
            ? TDefault extends () => unknown
                ? unknown
                : { default: SettingChoiceValue<TChoices> }
            : unknown);
};

/**
 * Extract a settings facade's resolved value types, including choice unions, without emitting runtime code.
 *
 * @example
 * type ModuleSettings = SettingsValuesOf<typeof settings>;
 */
export type SettingsValuesOf<T> =
    T extends TypedSettings<infer TValues> ? TValues : never;

/**
 * Extract the string keys accepted by a typed settings facade.
 *
 * @example
 * const key: SettingKeyOf<typeof settings> = 'isVerbose';
 */
export type SettingKeyOf<T> =
    T extends TypedSettings<infer TValues> ? keyof TValues & string : never;

/**
 * Provide explicit registration and schema-checked setting access without caching native values.
 *
 * @example
 * const settings: TypedSettings<{ enabled: boolean }> = SettingsUtils.create('my-module', { enabled: { scope: 'world', default: true } });
 */
export interface TypedSettings<T extends SettingValues> {
    /**
     * Register unregistered schema keys during init; successful keys are skipped on repeated calls.
     *
     * @example
     * HooksUtils.once('init', () => settings.register());
     */
    register(): void;
    /**
     * Read a registered key and validate the native value against its inferred primitive kind.
     *
     * @example
     * const enabled = settings.get('enabled');
     */
    get<K extends keyof T & string>(key: K): T[K];
    /**
     * Validate and persist a schema-checked value, preserving the native assigned value and rejected writes.
     *
     * @example
     * const count = await settings.set('maxTokens', 12);
     */
    set<K extends keyof T & string>(
        key: K,
        value: NoInfer<T[K]>,
    ): Promise<T[K]>;
    /**
     * Restore a registered setting's default, re-evaluating its synchronous provider before the validated native write.
     *
     * @example
     * await settings.reset('isVerbose');
     */
    reset<K extends keyof T & string>(key: K): Promise<T[K]>;
}

/**
 * Configure an optional module label formatted once and logged only when verbose mode is enabled.
 *
 * @example
 * const options: VerboseModeOptions = { prefix: MODULE_ID };
 */
export interface VerboseModeOptions {
    prefix?: string;
}

/**
 * Keep one module's verbose flag cached and expose lazy console logging with a spreadable setting schema.
 *
 * @example
 * const verbose: VerboseMode = SettingsUtils.withVerboseMode();
 * verbose.debug('Diagnostics', () => ({ tokenCount: canvas?.tokens?.placeables.length }));
 */
export interface VerboseMode {
    /**
     * Supply the client-scoped isVerbose checkbox and its cache-updating change callback.
     *
     * @example
     * const settings = SettingsUtils.create('my-module', { ...verbose.schema });
     */
    readonly schema: SettingDefinitions<{ isVerbose: boolean }>;
    /**
     * Read the cached verbose flag; false until explicitly initialized or changed through the setting.
     *
     * @example
     * if (verbose.isVerbose) verbose.debug('Detailed diagnostics');
     */
    readonly isVerbose: boolean;
    /**
     * Seed the cache with the saved setting during setup or later, without retaining a settings reference.
     *
     * @example
     * HooksUtils.once('setup', () => verbose.initialize(settings.get('isVerbose')));
     */
    initialize(isVerbose: boolean): void;
    /**
     * Log only when enabled, evaluating each function argument once as a synchronous zero-argument producer.
     * Returned arrays remain single console arguments, and returned functions are not evaluated again.
     * Producer errors propagate; disabled calls neither invoke producers nor access console.debug.
     *
     * @example
     * verbose.debug('Actor state', () => actor.toObject());
     */
    debug(...args: unknown[]): void;
    /**
     * Call console.table only when enabled, with optional data and column names matching the browser API.
     * Either argument may be a synchronous zero-argument producer evaluated once, data before columns.
     * Disabled calls skip producers and console.table; producer errors propagate without logging.
     *
     * @example
     * verbose.debugTable(() => actors.map(actor => ({ name: actor.name })), ['name']);
     */
    debugTable(
        tabularData?: unknown,
        properties?: string[] | (() => string[] | undefined),
    ): void;
}
