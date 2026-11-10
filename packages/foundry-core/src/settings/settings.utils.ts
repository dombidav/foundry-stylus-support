import {
    type ModuleSettingDefinition,
    type SettingValue,
    type SettingValues,
    type SettingDefinitions,
    type TypedSettings,
    type SettingValidationDefinition,
    type SettingDefinitionValue,
    type ResolvedSettingValues,
    type SettingSchemaConstraints,
    type RegisteredSetting,
    type SettingChoicesProvider,
    type PrimitiveSettingRegistration,
    type SettingsRegistrar,
    type VerboseMode,
    type VerboseModeOptions,
} from './settings.types.js';
import { type CustomFormInput } from '@client/applications/forms/fields.mjs';

/**
 * Validate primitive kind, finite numbers, and fixed choice membership without evaluating providers.
 *
 * @example
 * const count = validate(12, { default: 0 }, 0);
 */
function validate<T extends SettingValidationDefinition>(
    value: unknown,
    definition: T,
    defaultValue: unknown,
): SettingDefinitionValue<T> {
    if (
        (typeof value !== 'boolean' &&
            typeof value !== 'number' &&
            typeof value !== 'string') ||
        typeof value !== typeof defaultValue ||
        (typeof value === 'number' && !Number.isFinite(value))
    ) {
        throw new TypeError(
            'Expected a boolean, finite number, or string matching the registered primitive kind. Settings callbacks must be synchronous.',
        );
    }
    if (
        definition.choices !== undefined &&
        typeof definition.choices !== 'function' &&
        (typeof value !== 'string' || !Object.hasOwn(definition.choices, value))
    ) {
        throw new RangeError(`Unknown setting choice: ${String(value)}`);
    }
    // Providers are UI-only: stale IDs remain valid strings without rebuilding an option list on each read/write.
    // Literal callback return unions are compile-time contracts; fixed maps also receive runtime membership checks.
    return value as SettingDefinitionValue<T>;
}

/**
 * Evaluate a synchronous, fast, side-effect-free default provider at registration or explicit reset.
 * A resolved registration default fixes the primitive kind checked on later resets and ordinary operations.
 *
 * @example
 * const value = resolveDefault({ default: () => 5 });
 */
function resolveDefault<T extends SettingValidationDefinition>(
    definition: T,
    defaultValue?: SettingValue,
): SettingDefinitionValue<T> {
    const value: unknown =
        typeof definition.default === 'function'
            ? definition.default()
            : definition.default;
    return validate(value, definition, defaultValue ?? value);
}

/**
 * Adapt a synchronous, fast, side-effect-free choice provider to Foundry's public render-time custom input API.
 * Preserve missing saved IDs as selectable unavailable entries rather than replacing the user's selection.
 *
 * @example
 * const input = createChoiceInput(() => ({ '': 'None' }), '');
 */
function createChoiceInput(
    provider: SettingChoicesProvider,
    defaultValue: string,
): CustomFormInput {
    return (_field, config) => {
        const choices: unknown = provider();
        if (
            !choices ||
            typeof choices !== 'object' ||
            Array.isArray(choices) ||
            ('then' in choices && typeof choices.then === 'function')
        ) {
            throw new TypeError(
                'A choices callback must synchronously return a string-label record.',
            );
        }
        const entries: [string, unknown][] = Object.entries(choices);
        const options = entries.map(([value, label]) => {
            if (typeof label !== 'string')
                throw new TypeError('Choice labels must be strings.');
            return { value, label };
        });
        const value = config.value ?? defaultValue;
        if (typeof value !== 'string')
            throw new TypeError('A dynamic dropdown requires a string value.');
        if (!Object.hasOwn(choices, value)) {
            options.push({
                value,
                label: value
                    ? `${value} (unavailable)`
                    : 'Unavailable selection',
            });
        }
        return foundry.applications.fields.createSelectInput({
            ...config,
            value,
            options,
        });
    };
}

/**
 * Create an isolated verbose-mode cache, client checkbox schema, and lazy console logging functions without accessing Foundry.
 * Register the spread schema during init and initialize the saved value during setup or later.
 *
 * @example
 * const verbose = SettingsUtils.withVerboseMode();
 * const settings = SettingsUtils.create('my-module', { ...verbose.schema });
 * HooksUtils.once('init', () => settings.register());
 * HooksUtils.once('setup', () => verbose.initialize(settings.get('isVerbose')));
 * verbose.debug('Diagnostics', () => ({ scene: canvas?.scene?.name }));
 */
export function withVerboseMode(options?: VerboseModeOptions): VerboseMode {
    let isVerbose = false;
    const prefix = options?.prefix ? `[${options.prefix}]` : undefined;

    /**
     * Update the local cache from the saved value or the setting's validated change callback.
     *
     * @example
     * initialize(true);
     */
    function initialize(isEnabled: boolean): void {
        if (typeof isEnabled !== 'boolean')
            throw new TypeError('Expected a boolean verbose setting value.');
        isVerbose = isEnabled;
    }

    return {
        schema: {
            isVerbose: {
                name: 'Verbose mode',
                hint: 'Write detailed diagnostic messages to the browser console.',
                scope: 'client',
                default: false,
                onChange: initialize,
            },
        },
        /**
         * Read the local flag without querying Foundry settings.
         *
         * @example
         * const isEnabled = verbose.isVerbose;
         */
        get isVerbose() {
            return isVerbose;
        },
        initialize,
        /**
         * Evaluate lazy arguments and forward their results to console.debug only when verbose mode is enabled.
         *
         * @example
         * verbose.debug('Token state', () => token.document.toObject());
         */
        debug(...args) {
            if (!isVerbose) return;
            for (let index = 0; index < args.length; index++) {
                const value = args[index];
                if (typeof value === 'function') args[index] = value();
            }
            if (prefix) console.debug(prefix, ...args);
            else console.debug(...args);
        },
        /**
         * Evaluate optional lazy table data and column names only when verbose mode is enabled.
         *
         * @example
         * verbose.debugTable(() => actors.map(actor => ({ name: actor.name })), ['name']);
         */
        debugTable(tabularData, properties) {
            if (!isVerbose) return;
            const data: unknown =
                typeof tabularData === 'function' ? tabularData() : tabularData;
            const columns =
                typeof properties === 'function' ? properties() : properties;
            if (prefix) console.debug(prefix);
            console.table(data, columns);
        },
    };
}

/**
 * Construct a schema-inferred settings facade without accessing Foundry or evaluating providers; register explicitly during init.
 * Default and choice callbacks must be synchronous, fast, and side-effect-free.
 *
 * @example
 * const settings = SettingsUtils.create('my-module', { enabled: { scope: 'world', default: true } });
 */
export function create<
    T extends SettingValues,
    const TSchema extends SettingDefinitions<T> = SettingDefinitions<T>,
>(
    namespace: string,
    schema: SettingDefinitions<T> &
        TSchema &
        NoInfer<SettingSchemaConstraints<T, TSchema>>,
): TypedSettings<ResolvedSettingValues<T, TSchema>> {
    if (!namespace.trim())
        throw new TypeError('A settings namespace is required.');
    const definitions = new Map<string, ModuleSettingDefinition<SettingValue>>(
        // Object.entries loses each key's callback/value association; validation restores it at every call boundary.
        Object.entries(schema) as [
            string,
            ModuleSettingDefinition<SettingValue>,
        ][],
    );
    const registered = new Map<
        string,
        RegisteredSetting<ModuleSettingDefinition<SettingValue>>
    >();

    /**
     * Look up a schema key only after this facade has successfully registered it.
     *
     * @example
     * const entry = definitionFor('enabled');
     */
    function definitionFor<K extends keyof T & string>(key: K) {
        const entry = registered.get(key);
        if (!entry) {
            if (!definitions.has(key))
                throw new RangeError(`Unknown setting: ${namespace}.${key}`);
            throw new Error(
                `Register settings during init before accessing ${namespace}.${key}.`,
            );
        }
        // The schema fixes the key/value association; Map intentionally stores one shared shape.
        return entry as RegisteredSetting<TSchema[K]>;
    }

    /**
     * Validate and persist one value for both explicit writes and restoring schema defaults.
     *
     * @example
     * await set('isVerbose', false);
     */
    async function set<
        K extends keyof ResolvedSettingValues<T, TSchema> & string,
    >(
        key: K,
        value: NoInfer<ResolvedSettingValues<T, TSchema>[K]>,
    ): Promise<ResolvedSettingValues<T, TSchema>[K]> {
        const entry = definitionFor(key);
        validate(value, entry.definition, entry.defaultValue);
        return validate(
            await game.settings.set(namespace, key, value),
            entry.definition,
            entry.defaultValue,
        );
    }

    return {
        /**
         * Register each schema entry once, preserving completed registrations when a later entry fails.
         *
         * @example
         * settings.register();
         */
        register() {
            for (const [key, definition] of definitions) {
                if (registered.has(key)) continue;
                const defaultValue = resolveDefault(definition);
                let type: PrimitiveSettingRegistration['type'] =
                    typeof defaultValue === 'boolean'
                        ? Boolean
                        : typeof defaultValue === 'number'
                          ? Number
                          : String;
                let input: CustomFormInput | undefined;
                const {
                    isHidden = false,
                    choices,
                    ...registration
                } = definition;
                if (typeof choices === 'function') {
                    if (typeof defaultValue !== 'string')
                        throw new TypeError(
                            'Choice providers require a string default.',
                        );
                    // No field-level choices: native validation must not invoke UI providers or invalidate removed IDs.
                    type = new foundry.data.fields.StringField({
                        required: true,
                        nullable: false,
                        blank: true,
                        trim: false,
                        initial: defaultValue,
                    });
                    input = createChoiceInput(choices, defaultValue);
                }
                // Correct upstream range/custom-input declarations; preserve the native receiver and behavior.
                const native = game.settings as unknown as SettingsRegistrar;
                native.register(namespace, key, {
                    ...registration,
                    default: defaultValue,
                    choices:
                        typeof choices === 'function' ? undefined : choices,
                    input,
                    config: !isHidden,
                    name: definition.name ?? `${namespace}.${key}`,
                    type,
                    onChange: definition.onChange
                        ? (value: unknown) =>
                              definition.onChange?.(
                                  validate(value, definition, defaultValue),
                              )
                        : undefined,
                });
                registered.set(key, { definition, defaultValue });
            }
        },
        /**
         * Read and validate a registered primitive setting without caching its native value.
         *
         * @example
         * const enabled = settings.get('enabled');
         */
        get(key) {
            const entry = definitionFor(key);
            const value: unknown = game.settings.get(namespace, key);
            return validate(value, entry.definition, entry.defaultValue);
        },
        set,
        /**
         * Restore the schema default, re-evaluating its synchronous provider through the validated set operation.
         *
         * @example
         * await settings.reset('isVerbose');
         */
        async reset(key) {
            const entry = definitionFor(key);
            return set(
                key,
                resolveDefault(entry.definition, entry.defaultValue),
            );
        },
    };
}
