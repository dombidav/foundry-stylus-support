import { expectTypeOf, it } from 'vitest';
import {
    SettingsUtils,
    type SettingsValuesOf,
    type SettingKeyOf,
} from '../../src/index.ts';
import { type SettingDefinitionValue } from '../../src/settings/settings.types.js';

/**
 * Compile setting inference and intentional rejection cases without executing the test-only accesses.
 *
 * @example
 * expectTypeOf(verifySettingTypes).returns.toEqualTypeOf<void>();
 */
function verifySettingTypes() {
    const verbose = SettingsUtils.withVerboseMode();
    const settings = SettingsUtils.create('test', {
        ...verbose.schema,
        isEnabled: {
            scope: 'world',
            isHidden: false,
            default: true,
            onChange: (isEnabled) => {
                expectTypeOf(isEnabled).toEqualTypeOf<boolean>();
            },
        },
        count: {
            scope: 'client',
            isHidden: false,
            default: 10,
            range: { min: 0, max: 20, step: 1 },
            onChange: (value) => {
                expectTypeOf(value).toEqualTypeOf<number>();
            },
        },
        mode: {
            scope: 'user',
            isHidden: false,
            default: 'small',
            choices: { small: 'Small', large: 'Large' },
        },
    });
    expectTypeOf(settings.get('isEnabled')).toEqualTypeOf<boolean>();
    expectTypeOf(settings.get('count')).toEqualTypeOf<number>();
    expectTypeOf(settings.get('mode')).toEqualTypeOf<'small' | 'large'>();
    expectTypeOf(settings.reset('mode')).toEqualTypeOf<
        Promise<'small' | 'large'>
    >();
    expectTypeOf(settings.get('isVerbose')).toEqualTypeOf<boolean>();
    expectTypeOf(verbose.isVerbose).toEqualTypeOf<boolean>();
    expectTypeOf<SettingsValuesOf<typeof settings>>().toEqualTypeOf<{
        isEnabled: boolean;
        count: number;
        mode: 'small' | 'large';
        isVerbose: boolean;
    }>();
    expectTypeOf<SettingKeyOf<typeof settings>>().toEqualTypeOf<
        'isEnabled' | 'count' | 'mode' | 'isVerbose'
    >();
    expectTypeOf<SettingsValuesOf<unknown>>().toEqualTypeOf<never>();
    expectTypeOf<SettingKeyOf<unknown>>().toEqualTypeOf<never>();
    expectTypeOf(settings.reset('count')).toEqualTypeOf<Promise<number>>();
    // @ts-expect-error Reset accepts only known schema keys.
    settings.reset('unknown');
    SettingsUtils.withVerboseMode({ prefix: 'my-module' });
    // @ts-expect-error A log prefix must be a string.
    SettingsUtils.withVerboseMode({ prefix: 123 });
    verbose.initialize(settings.get('isVerbose'));
    verbose.debug('Count', () => settings.get('count'));
    verbose.debugTable();
    verbose.debugTable([{ name: 'Actor' }], ['name']);
    verbose.debugTable(
        () => [{ name: 'Actor' }],
        () => ['name'],
    );
    verbose.debugTable(undefined, () => undefined);
    // @ts-expect-error Column names must be a string array or a producer of one.
    verbose.debugTable([], 'name');
    // @ts-expect-error Lazy column names must resolve to a string array or undefined.
    verbose.debugTable([], () => 42);
    // @ts-expect-error Like console.table, debugTable accepts at most two arguments.
    verbose.debugTable([], ['name'], 'extra');
    // @ts-expect-error The cache is read-only outside the verbose controller.
    verbose.isVerbose = true;
    // @ts-expect-error Verbose mode must be initialized with a boolean value.
    verbose.initialize('true');
    // @ts-expect-error The verbose checkbox only accepts boolean values.
    settings.set('isVerbose', 'true');
    expectTypeOf(settings.set('count', 12)).toEqualTypeOf<Promise<number>>();
    settings.set('isEnabled', false);
    settings.set('mode', 'large');
    // @ts-expect-error Choices constrain accepted string values.
    settings.set('mode', 'unknown');
    const invalidChoiceDefinition = {
        scope: 'world',
        default: 'unknown',
        choices: { small: 'Small' },
    } as const;
    SettingsUtils.create('test', {
        // @ts-expect-error A choice default must be a key in the choices map.
        mode: invalidChoiceDefinition,
    });
    SettingsUtils.create('test', {
        text: { scope: 'world', default: 'hello' },
    }).set('text', 'anything');
    const dynamicChoices: Record<string, string> = { first: 'First' };
    const dynamicSettings = SettingsUtils.create('test', {
        mode: { scope: 'world', default: 'first', choices: dynamicChoices },
    });
    expectTypeOf(dynamicSettings.get('mode')).toEqualTypeOf<string>();
    const numericChoices = SettingsUtils.create('test', {
        mode: { scope: 'world', default: '1', choices: { 1: 'One', 2: 'Two' } },
    });
    expectTypeOf(numericChoices.get('mode')).toEqualTypeOf<'1' | '2'>();
    const emptySettings = SettingsUtils.create('test', {});
    expectTypeOf(emptySettings.get).parameter(0).toEqualTypeOf<never>();
    // @ts-expect-error Known schema keys only.
    settings.get('unknown');
    // @ts-expect-error Key/value inference must not widen to accept another setting's type.
    settings.set('count', 'wrong');
    // @ts-expect-error Boolean settings cannot receive numbers.
    settings.set('isEnabled', 1);
    SettingsUtils.create('test', {
        isEnabled: {
            scope: 'world',
            default: true,
            // @ts-expect-error Use isHidden instead of native config metadata.
            config: true,
        },
    });
    SettingsUtils.create('test', {
        isEnabled: {
            scope: 'world',
            default: true,
            // @ts-expect-error Visibility must be boolean.
            isHidden: 'yes',
        },
    });
    /**
     * Provide an incompatible numeric callback to test boolean setting callback validation.
     *
     * @example
     * // @ts-expect-error A boolean default requires a boolean callback.
     * const definition: ModuleSettingDefinition<boolean> = { scope: 'world', default: true, onChange: badCallback };
     */
    const badCallback = (value: number) => {
        void value;
    };
    SettingsUtils.create('test', {
        // @ts-expect-error A callback cannot change the inferred boolean value type.
        isEnabled: { scope: 'world', default: true, onChange: badCallback },
    });
    SettingsUtils.create('test', {
        isEnabled: {
            scope: 'world',
            default: true,
            // @ts-expect-error Only numeric settings support ranges.
            range: { min: 0, max: 1, step: 1 },
        },
    });
    SettingsUtils.create('test', {
        // @ts-expect-error Object and DataField settings intentionally use the native API for now.
        complex: { scope: 'world', default: { isEnabled: true } },
    });
}

it('infers values and callbacks from schema defaults', () => {
    expectTypeOf(verifySettingTypes).returns.toEqualTypeOf<void>();
});

/**
 * Compile synchronous provider inference, literal return unions, fallback types, and invalid callback rejections.
 *
 * @example
 * expectTypeOf(verifyProviderTypes).returns.toEqualTypeOf<void>();
 */
function verifyProviderTypes(): void {
    const settings = SettingsUtils.create('test', {
        isEnabled: {
            scope: 'client',
            default: (): boolean => true,
            onChange: (isEnabled) => {
                expectTypeOf(isEnabled).toEqualTypeOf<boolean>();
            },
        },
        count: {
            scope: 'client',
            default: (): number => 5,
            range: { min: 0, max: 10, step: 1 },
            onChange: (value) => {
                expectTypeOf(value).toEqualTypeOf<number>();
            },
        },
        mode: {
            scope: 'world',
            default: () => 'first',
            choices: () => ({ first: 'First', second: 'Second' }),
        },
        literalDefault: { scope: 'world', default: (): 'a' | 'b' => 'a' },
        literalNumber: { scope: 'world', default: (): 1 | 2 => 1 },
        userId: {
            scope: 'world',
            default: () => '',
            choices: (): Record<string, string> => ({ '': 'None' }),
        },
        emptyChoices: { scope: 'world', default: '', choices: () => ({}) },
        fixedChoices: {
            scope: 'world',
            default: () => 'first',
            choices: { first: 'First', second: 'Second' },
        },
    });
    expectTypeOf(settings.get('isEnabled')).toEqualTypeOf<boolean>();
    expectTypeOf(settings.get('count')).toEqualTypeOf<number>();
    expectTypeOf(settings.get('mode')).toEqualTypeOf<'first' | 'second'>();
    expectTypeOf(settings.get('fixedChoices')).toEqualTypeOf<
        'first' | 'second'
    >();
    expectTypeOf(settings.get('literalDefault')).toEqualTypeOf<'a' | 'b'>();
    expectTypeOf(settings.get('literalNumber')).toEqualTypeOf<1 | 2>();
    expectTypeOf(settings.get('userId')).toEqualTypeOf<string>();
    expectTypeOf(settings.get('emptyChoices')).toEqualTypeOf<string>();
    expectTypeOf(settings.reset('literalNumber')).toEqualTypeOf<
        Promise<1 | 2>
    >();
    expectTypeOf<
        SettingDefinitionValue<{ default: () => unknown }>
    >().toEqualTypeOf<string>();
    expectTypeOf<
        SettingDefinitionValue<{ choices: () => unknown }>
    >().toEqualTypeOf<string>();
    settings.set('literalNumber', 2);
    settings.set('mode', 'second');
    // @ts-expect-error A provider's finite key union constrains writes.
    settings.set('mode', 'third');
    // @ts-expect-error An explicitly narrowed default callback return constrains writes.
    settings.set('literalDefault', 'c');

    const asyncDefault = { scope: 'client', default: async () => 1 } as const;
    SettingsUtils.create('test', {
        // @ts-expect-error Defaults must be synchronous primitive providers.
        count: asyncDefault,
    });
    const asyncChoices = {
        scope: 'world',
        default: '',
        choices: async () => ({ first: 'First' }),
    } as const;
    SettingsUtils.create('test', {
        // @ts-expect-error Choices must be synchronous label-map providers.
        mode: asyncChoices,
    });
    const numericChoices = {
        scope: 'client',
        default: () => 5,
        choices: () => ({ first: 'First' }),
    } as const;
    SettingsUtils.create('test', {
        // @ts-expect-error Only string settings accept choices.
        count: numericChoices,
    });
}

it('infers synchronous callback return types and rejects async providers', () => {
    expectTypeOf(verifyProviderTypes).returns.toEqualTypeOf<void>();
});
