import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsUtils } from '../../src/index.ts';
import { type PrimitiveSettingRegistration } from '../../src/settings/settings.types.js';

describe('typed settings facade', () => {
    const values = new Map<string, unknown>();
    const registrations = new Map<string, PrimitiveSettingRegistration>();
    const StringField = vi.fn(function (options: unknown) {
        void options;
    });
    const element = {};
    const createSelectInput = vi.fn((config: unknown) => {
        void config;
        return element;
    });
    const register = vi.fn(
        (
            namespace: string,
            key: string,
            definition: PrimitiveSettingRegistration,
        ) => {
            registrations.set(`${namespace}.${key}`, definition);
            values.set(`${namespace}.${key}`, definition.default);
        },
    );
    const get = vi.fn((namespace: string, key: string) =>
        values.get(`${namespace}.${key}`),
    );
    const set = vi.fn(
        async (namespace: string, key: string, value: unknown) => {
            values.set(`${namespace}.${key}`, value);
            return value;
        },
    );

    beforeEach(() => {
        values.clear();
        registrations.clear();
        vi.stubGlobal('game', { settings: { register, get, set } });
        vi.stubGlobal('foundry', {
            data: { fields: { StringField } },
            applications: { fields: { createSelectInput } },
        });
    });

    it('constructs outside Foundry and requires explicit registration before reads/writes', async () => {
        vi.stubGlobal('game', undefined);
        const settings = SettingsUtils.create('test', {
            enabled: { scope: 'world', isHidden: false, default: true },
        });
        expect(register).not.toHaveBeenCalled();
        expect(() => settings.get('enabled')).toThrow(
            'Register settings during init',
        );
        await expect(settings.set('enabled', false)).rejects.toThrow(
            'Register settings during init',
        );
    });

    it('infers constructors, preserves metadata, registers once, and returns native stored values', async () => {
        const changed = vi.fn<(value: number) => void>();
        const settings = SettingsUtils.create('test', {
            enabled: { scope: 'world', isHidden: false, default: true },
            count: {
                name: 'Count',
                hint: 'Hint',
                scope: 'client',
                isHidden: false,
                default: 10,
                range: { min: 1, max: 20, step: 1 },
                onChange: changed,
            },
            mode: {
                scope: 'user',
                isHidden: false,
                default: 'small',
                choices: { small: 'Small', large: 'Large' },
            },
        });
        settings.register();
        settings.register();
        expect(register).toHaveBeenCalledTimes(3);
        expect(registrations.get('test.enabled')).toMatchObject({
            type: Boolean,
            name: 'test.enabled',
        });
        expect(registrations.get('test.count')).toMatchObject({
            type: Number,
            name: 'Count',
            hint: 'Hint',
            range: { min: 1, max: 20, step: 1 },
        });
        expect(registrations.get('test.mode')).toMatchObject({
            type: String,
            scope: 'user',
        });
        expect(settings.get('enabled')).toBe(true);
        expect(settings.get('count')).toBe(10);
        await expect(settings.set('count', 12)).resolves.toBe(12);
        expect(set).toHaveBeenCalledExactlyOnceWith('test', 'count', 12);
        const onChange = registrations.get('test.count')?.onChange;
        onChange?.(7);
        expect(changed).toHaveBeenCalledExactlyOnceWith(7);
        expect(() => onChange?.('invalid')).toThrow(TypeError);
    });

    it('rejects corrupt native values and invalid JavaScript input rather than returning a misleading generic cast', async () => {
        const settings = SettingsUtils.create('test', {
            count: { scope: 'client', default: 10 },
        });
        settings.register();
        values.set('test.count', 'wrong');
        expect(() => settings.get('count')).toThrow(TypeError);
        await expect(settings.set('count', NaN)).rejects.toThrow(TypeError);
        expect(set).not.toHaveBeenCalled();
        set.mockResolvedValueOnce('wrong');
        await expect(settings.set('count', 2)).rejects.toThrow(TypeError);
    });

    it('validates choice membership for reads, writes, native results and change callbacks', async () => {
        const onChange = vi.fn<(value: string) => void>();
        const settings = SettingsUtils.create('test', {
            mode: {
                scope: 'world',
                default: 'first',
                choices: { first: 'First', second: 'Second' },
                onChange,
            },
        });
        settings.register();
        expect(settings.get('mode')).toBe('first');
        await expect(settings.set('mode', 'second')).resolves.toBe('second');
        await expect(settings.reset('mode')).resolves.toBe('first');

        values.set('test.mode', 'third');
        expect(() => settings.get('mode')).toThrow('Unknown setting choice');
        values.set('test.mode', 'toString');
        expect(() => settings.get('mode')).toThrow('Unknown setting choice');
        set.mockClear();
        // @ts-expect-error Deliberate invalid JavaScript input must also be rejected at runtime.
        await expect(settings.set('mode', 'third')).rejects.toThrow(
            'Unknown setting choice',
        );
        expect(set).not.toHaveBeenCalled();
        set.mockResolvedValueOnce('third');
        await expect(settings.set('mode', 'second')).rejects.toThrow(
            'Unknown setting choice',
        );

        const changed = registrations.get('test.mode')?.onChange;
        changed?.('second');
        expect(onChange).toHaveBeenCalledExactlyOnceWith('second');
        expect(() => changed?.('third')).toThrow('Unknown setting choice');
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('rejects a runtime choice default absent from a dynamically supplied choice map', () => {
        const choices: Record<string, string> = { first: 'First' };
        const settings = SettingsUtils.create('test', {
            mode: { scope: 'world', default: 'missing', choices },
        });
        expect(() => settings.register()).toThrow('Unknown setting choice');
        expect(register).not.toHaveBeenCalled();
    });

    it('evaluates default providers at registration and reset while retaining the original primitive kind', async () => {
        let nextDefault: number | string = 5;
        const getDefault = vi.fn(() => nextDefault);
        const settings = SettingsUtils.create('test', {
            count: { scope: 'client', default: getDefault },
        });
        expect(getDefault).not.toHaveBeenCalled();
        settings.register();
        settings.register();
        expect(getDefault).toHaveBeenCalledTimes(1);
        expect(registrations.get('test.count')).toMatchObject({
            type: Number,
            default: 5,
        });
        expect(settings.get('count')).toBe(5);
        await settings.set('count', 7);
        expect(getDefault).toHaveBeenCalledTimes(1);

        nextDefault = 9;
        await expect(settings.reset('count')).resolves.toBe(9);
        expect(getDefault).toHaveBeenCalledTimes(2);
        nextDefault = 'wrong kind';
        set.mockClear();
        await expect(settings.reset('count')).rejects.toThrow(TypeError);
        expect(set).not.toHaveBeenCalled();
    });

    it('keeps choices providers render-only and preserves disappeared selections without changing native input context', async () => {
        let choices: Record<string, string> = { '': 'No user', userA: 'Alice' };
        const getChoices = vi.fn(() => choices);
        const getDefault = vi.fn(() => '');
        const onChange = vi.fn<(value: string) => void>();
        const settings = SettingsUtils.create('test', {
            userId: {
                scope: 'world',
                default: getDefault,
                choices: getChoices,
                onChange,
            },
        });
        expect(getChoices).not.toHaveBeenCalled();
        expect(getDefault).not.toHaveBeenCalled();
        settings.register();
        settings.register();
        expect(getDefault).toHaveBeenCalledTimes(1);
        expect(getChoices).not.toHaveBeenCalled();
        expect(StringField).toHaveBeenCalledExactlyOnceWith({
            required: true,
            nullable: false,
            blank: true,
            trim: false,
            initial: '',
        });
        const registration = registrations.get('test.userId');
        if (!registration?.input || typeof registration.type === 'function')
            throw new Error(
                'Expected a native field instance and custom input.',
            );
        expect(registration.choices).toBeUndefined();

        await settings.set('userId', 'userA');
        expect(settings.get('userId')).toBe('userA');
        registration.onChange?.('userA');
        expect(onChange).toHaveBeenCalledExactlyOnceWith('userA');
        expect(getChoices).not.toHaveBeenCalled();
        expect(getDefault).toHaveBeenCalledTimes(1);

        expect(
            registration.input(registration.type, {
                name: 'test.userId',
                id: 'user-input',
                value: 'userA',
                disabled: true,
                required: true,
            }),
        ).toBe(element);
        expect(getChoices).toHaveBeenCalledTimes(1);
        expect(createSelectInput).toHaveBeenNthCalledWith(1, {
            name: 'test.userId',
            id: 'user-input',
            value: 'userA',
            disabled: true,
            required: true,
            options: [
                { value: '', label: 'No user' },
                { value: 'userA', label: 'Alice' },
            ],
        });

        choices = { '': 'No user', userB: 'Bob' };
        expect(settings.get('userId')).toBe('userA');
        registration.input(registration.type, {
            name: 'test.userId',
            value: 'userA',
        });
        expect(createSelectInput).toHaveBeenNthCalledWith(2, {
            name: 'test.userId',
            value: 'userA',
            options: [
                { value: '', label: 'No user' },
                { value: 'userB', label: 'Bob' },
                { value: 'userA', label: 'userA (unavailable)' },
            ],
        });
        expect(getChoices).toHaveBeenCalledTimes(2);
        await settings.reset('userId');
        expect(getDefault).toHaveBeenCalledTimes(2);
        expect(getChoices).toHaveBeenCalledTimes(2);
    });

    it.each([null, [], Promise.resolve({ first: 'First' }), { first: 1 }])(
        'rejects an invalid choices result only when rendering: %j',
        (result) => {
            const definition = {
                scope: 'world',
                default: '',
                choices: () => result,
            } as const;
            const settings = SettingsUtils.create('test', {
                // @ts-expect-error Intentional invalid JavaScript provider used to test the runtime boundary.
                mode: definition,
            });
            settings.register();
            expect(settings.get('mode')).toBe('');
            const registration = registrations.get('test.mode');
            if (!registration?.input || typeof registration.type === 'function')
                throw new Error('Expected a native custom input.');
            const { input, type } = registration;
            expect(() => input(type, { name: 'test.mode', value: '' })).toThrow(
                TypeError,
            );
            expect(createSelectInput).not.toHaveBeenCalled();
        },
    );

    it('rejects a Promise default result before native registration', () => {
        const definition = { scope: 'client', default: async () => 5 } as const;
        const settings = SettingsUtils.create('test', {
            // @ts-expect-error Intentional asynchronous JavaScript default used to test runtime validation.
            count: definition,
        });
        expect(() => settings.register()).toThrow(
            'callbacks must be synchronous',
        );
        expect(register).not.toHaveBeenCalled();
    });

    it('propagates a throwing default provider and retries only unsuccessful registrations', () => {
        const getDefault = vi
            .fn<() => number>()
            .mockImplementationOnce(() => {
                throw new Error('Default failed');
            })
            .mockReturnValue(5);
        const settings = SettingsUtils.create('test', {
            count: { scope: 'client', default: getDefault },
        });
        expect(() => settings.register()).toThrow('Default failed');
        expect(register).not.toHaveBeenCalled();
        settings.register();
        settings.register();
        expect(getDefault).toHaveBeenCalledTimes(2);
        expect(register).toHaveBeenCalledTimes(1);
    });

    it.each([
        { visibility: {}, isVisible: true },
        { visibility: { isHidden: false }, isVisible: true },
        { visibility: { isHidden: true }, isVisible: false },
    ])(
        'maps visibility $visibility to native config $isVisible',
        async ({ visibility, isVisible }) => {
            const settings = SettingsUtils.create('test', {
                enabled: { scope: 'world', default: true, ...visibility },
            });
            settings.register();

            const definition = registrations.get('test.enabled');
            expect(definition).toHaveProperty('config', isVisible);
            expect(definition).not.toHaveProperty('isHidden');
            expect(settings.get('enabled')).toBe(true);
            await expect(settings.set('enabled', false)).resolves.toBe(false);
        },
    );

    it('propagates native failures and can resume a partially failed registration', () => {
        const settings = SettingsUtils.create('test', {
            first: { scope: 'world', default: true },
            second: { scope: 'client', default: 1 },
        });
        register
            .mockImplementationOnce(() => {})
            .mockImplementationOnce(() => {
                throw new Error('Native failure');
            });
        expect(() => settings.register()).toThrow('Native failure');
        settings.register();
        expect(register.mock.calls.map(([, key]) => key)).toEqual([
            'first',
            'second',
            'second',
        ]);
    });

    it('does not hide native write rejections', async () => {
        const settings = SettingsUtils.create('test', {
            enabled: { scope: 'world', default: true },
        });
        settings.register();
        set.mockRejectedValueOnce(new Error('Permission denied'));
        await expect(settings.set('enabled', false)).rejects.toThrow(
            'Permission denied',
        );
    });

    it('rejects missing namespaces', () => {
        expect(() => SettingsUtils.create(' ', {})).toThrow('namespace');
    });

    it('restores schema defaults through native writes and propagates rejected resets', async () => {
        const verbose = SettingsUtils.withVerboseMode();
        const settings = SettingsUtils.create('test', {
            ...verbose.schema,
            count: { scope: 'client', default: 5 },
        });
        await expect(settings.reset('count')).rejects.toThrow(
            'Register settings',
        );
        settings.register();
        values.set('test.count', 20);
        await expect(settings.reset('count')).resolves.toBe(5);
        expect(set).toHaveBeenCalledExactlyOnceWith('test', 'count', 5);
        expect(settings.get('count')).toBe(5);

        verbose.initialize(true);
        set.mockImplementationOnce(async (namespace, key, value) => {
            values.set(`${namespace}.${key}`, value);
            registrations.get(`${namespace}.${key}`)?.onChange?.(value);
            return value;
        });
        await expect(settings.reset('isVerbose')).resolves.toBe(false);
        expect(verbose.isVerbose).toBe(false);
        set.mockRejectedValueOnce(new Error('Permission denied'));
        await expect(settings.reset('count')).rejects.toThrow(
            'Permission denied',
        );
    });

    it('loads the saved verbose flag once and keeps it synchronized through native changes', () => {
        const verbose = SettingsUtils.withVerboseMode();
        const settings = SettingsUtils.create('test', {
            isEnabled: { scope: 'world', default: true },
            ...verbose.schema,
        });
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
        const table = vi.spyOn(console, 'table').mockImplementation(() => {});
        settings.register();
        expect(registrations.get('test.isVerbose')).toMatchObject({
            type: Boolean,
            scope: 'client',
            config: true,
            default: false,
            name: 'Verbose mode',
        });

        values.set('test.isVerbose', true);
        expect(verbose.isVerbose).toBe(false);
        verbose.initialize(settings.get('isVerbose'));
        expect(verbose.isVerbose).toBe(true);
        verbose.debug('First');
        verbose.debug('Second');
        verbose.debugTable([{ isEnabled: true }]);
        expect(get).toHaveBeenCalledExactlyOnceWith('test', 'isVerbose');
        expect(debug).toHaveBeenCalledTimes(2);
        expect(table).toHaveBeenCalledTimes(1);

        registrations.get('test.isVerbose')?.onChange?.(false);
        expect(verbose.isVerbose).toBe(false);
        verbose.debug('Suppressed');
        verbose.debugTable([{ isEnabled: false }]);
        expect(debug).toHaveBeenCalledTimes(2);
        expect(table).toHaveBeenCalledTimes(1);

        registrations.get('test.isVerbose')?.onChange?.(true);
        expect(verbose.isVerbose).toBe(true);
    });
});

describe('verbose table logging', () => {
    it('prints an optional prefix before the table without changing its data or columns', () => {
        const verbose = SettingsUtils.withVerboseMode({ prefix: 'my-module' });
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
        const table = vi.spyOn(console, 'table').mockImplementation(() => {});
        const rows = [{ name: 'Actor' }];
        verbose.debugTable(() => rows, ['name']);
        expect(debug).not.toHaveBeenCalled();
        expect(table).not.toHaveBeenCalled();
        verbose.initialize(true);
        verbose.debugTable(() => rows, ['name']);
        expect(debug).toHaveBeenCalledExactlyOnceWith('[my-module]');
        expect(table).toHaveBeenCalledExactlyOnceWith(rows, ['name']);
        expect(debug.mock.invocationCallOrder[0]).toBeLessThan(
            table.mock.invocationCallOrder[0] ?? 0,
        );
    });
    it('skips data and column producers and console.table while disabled', () => {
        const verbose = SettingsUtils.withVerboseMode();
        const table = vi.spyOn(console, 'table').mockImplementation(() => {});
        const data = vi.fn(() => {
            throw new Error('Disabled data producer ran');
        });
        const properties = vi.fn(() => {
            throw new Error('Disabled column producer ran');
        });

        verbose.debugTable(data, properties);
        verbose.initialize(true);
        verbose.initialize(false);
        verbose.debugTable(data, properties);
        expect(data).not.toHaveBeenCalled();
        expect(properties).not.toHaveBeenCalled();
        expect(table).not.toHaveBeenCalled();
    });

    it('forwards direct data and optional column names with the native parameter order', () => {
        const verbose = SettingsUtils.withVerboseMode();
        const table = vi.spyOn(console, 'table').mockImplementation(() => {});
        const rows = [{ name: 'Actor', hp: 10 }];
        const properties = ['name'];
        verbose.initialize(true);

        verbose.debugTable();
        verbose.debugTable(rows);
        verbose.debugTable(rows, properties);
        expect(table).toHaveBeenNthCalledWith(1, undefined, undefined);
        expect(table).toHaveBeenNthCalledWith(2, rows, undefined);
        expect(table).toHaveBeenNthCalledWith(3, rows, properties);
        expect(table.mock.calls[2]?.[0]).toBe(rows);
        expect(table.mock.calls[2]?.[1]).toBe(properties);
    });

    it('evaluates lazy data before lazy columns exactly once', () => {
        const verbose = SettingsUtils.withVerboseMode();
        const table = vi.spyOn(console, 'table').mockImplementation(() => {});
        const order: string[] = [];
        const rows = [{ name: 'Actor' }];
        const data = vi.fn(() => {
            order.push('data');
            return rows;
        });
        const properties = vi.fn(() => {
            order.push('properties');
            return ['name'];
        });
        verbose.initialize(true);

        verbose.debugTable(data, properties);
        expect(data).toHaveBeenCalledExactlyOnceWith();
        expect(properties).toHaveBeenCalledExactlyOnceWith();
        expect(order).toEqual(['data', 'properties']);
        expect(table).toHaveBeenCalledExactlyOnceWith(rows, ['name']);
    });

    it('propagates producer errors without calling console.table', () => {
        const verbose = SettingsUtils.withVerboseMode();
        const table = vi.spyOn(console, 'table').mockImplementation(() => {});
        const properties = vi.fn(() => ['name']);
        verbose.initialize(true);

        expect(() =>
            verbose.debugTable(() => {
                throw new Error('Data failed');
            }, properties),
        ).toThrow('Data failed');
        expect(properties).not.toHaveBeenCalled();
        expect(() =>
            verbose.debugTable([], () => {
                throw new Error('Columns failed');
            }),
        ).toThrow('Columns failed');
        expect(table).not.toHaveBeenCalled();
    });
});

describe('verbose debug logging', () => {
    it('prefixes enabled messages without evaluating disabled producers', () => {
        const verbose = SettingsUtils.withVerboseMode({ prefix: 'my-module' });
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
        const producer = vi.fn(() => 'Details');
        verbose.debug(producer);
        expect(producer).not.toHaveBeenCalled();
        expect(debug).not.toHaveBeenCalled();
        verbose.initialize(true);
        verbose.debug(producer);
        expect(debug).toHaveBeenCalledExactlyOnceWith('[my-module]', 'Details');
    });
    it('constructs and suppresses lazy logging without accessing Foundry', () => {
        vi.stubGlobal('game', undefined);
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
        const producer = vi.fn(() => {
            throw new Error('Must not evaluate disabled diagnostics');
        });
        const verbose = SettingsUtils.withVerboseMode();

        expect(verbose.isVerbose).toBe(false);
        verbose.debug('Disabled', producer);
        verbose.initialize(true);
        verbose.initialize(false);
        verbose.debug(producer);
        expect(producer).not.toHaveBeenCalled();
        expect(debug).not.toHaveBeenCalled();
    });

    it('evaluates mixed lazy arguments once in order and logs their results', () => {
        const verbose = SettingsUtils.withVerboseMode();
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
        const order: number[] = [];
        const snapshot = { actorId: 'actor-id' };
        const first = vi.fn(() => {
            order.push(1);
            return snapshot;
        });
        const second = vi.fn(() => {
            order.push(2);
            return ['one', 'two'];
        });
        verbose.initialize(true);

        verbose.debug('Actor', first, 42, second);
        expect(order).toEqual([1, 2]);
        expect(first).toHaveBeenCalledExactlyOnceWith();
        expect(second).toHaveBeenCalledExactlyOnceWith();
        expect(debug).toHaveBeenCalledExactlyOnceWith('Actor', snapshot, 42, [
            'one',
            'two',
        ]);
    });

    it('logs returned functions as values without evaluating them again', () => {
        const verbose = SettingsUtils.withVerboseMode();
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
        const returnedFunction = vi.fn();
        verbose.initialize(true);

        verbose.debug(() => returnedFunction);
        expect(returnedFunction).not.toHaveBeenCalled();
        expect(debug).toHaveBeenCalledExactlyOnceWith(returnedFunction);
    });

    it('propagates enabled producer errors without logging a partial result', () => {
        const verbose = SettingsUtils.withVerboseMode();
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
        verbose.initialize(true);

        expect(() =>
            verbose.debug('Diagnostics', () => {
                throw new Error('Snapshot failed');
            }),
        ).toThrow('Snapshot failed');
        expect(debug).not.toHaveBeenCalled();
    });

    it('keeps independent modules isolated even when debug is destructured', () => {
        const first = SettingsUtils.withVerboseMode();
        const second = SettingsUtils.withVerboseMode();
        const consoleDebug = vi
            .spyOn(console, 'debug')
            .mockImplementation(() => {});
        const { debug } = first;

        first.initialize(true);
        debug('First module');
        second.debug('Second module');
        expect(first.isVerbose).toBe(true);
        expect(second.isVerbose).toBe(false);
        expect(consoleDebug).toHaveBeenCalledExactlyOnceWith('First module');
    });
});
