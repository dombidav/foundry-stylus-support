import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type PrimitiveSettingRegistration } from '../../foundry-core/src/settings/settings.types.js';
import { MODULE_ID } from '../src/module-id.ts';

describe('module lifecycle', () => {
    const info = vi.fn();
    const values = new Map<string, unknown>();
    const registrations = new Map<string, PrimitiveSettingRegistration>();
    const register = vi.fn(
        (
            namespace: string,
            key: string,
            definition: PrimitiveSettingRegistration,
        ) => {
            registrations.set(key, definition);
            values.set(`${namespace}.${key}`, definition.default);
        },
    );
    const get = vi.fn((namespace: string, key: string) =>
        values.get(`${namespace}.${key}`),
    );

    beforeEach(() => {
        vi.resetModules();
        values.clear();
        registrations.clear();
        vi.stubGlobal('ui', { notifications: { info } });
        vi.stubGlobal('game', {
            system: { id: 'dnd5e' },
            settings: { register, get },
        });
    });

    it('registers the visible verbose, choice and integer settings only during init', async () => {
        const { onInit } = await import('../src/lifecycle.ts');
        expect(register).not.toHaveBeenCalled();
        expect(get).not.toHaveBeenCalled();
        onInit();
        expect(
            register.mock.calls.map(([namespace, key]) => [namespace, key]),
        ).toEqual([
            [MODULE_ID, 'isVerbose'],
            [MODULE_ID, 'testChoice'],
            [MODULE_ID, 'testInteger'],
        ]);
        expect(registrations.get('isVerbose')).toMatchObject({
            scope: 'client',
            config: true,
            default: false,
            type: Boolean,
        });
        expect(registrations.get('testChoice')).toMatchObject({
            scope: 'world',
            config: true,
            default: 'first',
            type: String,
            choices: {
                first: 'First option',
                second: 'Second option',
                third: 'Third option',
            },
        });
        expect(registrations.get('testInteger')).toMatchObject({
            scope: 'world',
            config: true,
            default: 5,
            type: Number,
            range: { min: 0, max: 10, step: 1 },
        });
    });

    it('notifies in D&D 5e only after ready', async () => {
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
        const { onInit, onSetup, onReady } =
            await import('../src/lifecycle.ts');
        expect(info).not.toHaveBeenCalled();
        onInit();
        onSetup();
        expect(get).toHaveBeenCalledExactlyOnceWith(MODULE_ID, 'isVerbose');
        expect(info).not.toHaveBeenCalled();
        onReady();
        expect(info).toHaveBeenCalledExactlyOnceWith('Hello World!');
        expect(debug).not.toHaveBeenCalled();
        expect(get).toHaveBeenCalledTimes(1);
    });

    it('loads the saved verbose flag and lazily logs test settings when enabled', async () => {
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
        const { onInit, onSetup, onReady } =
            await import('../src/lifecycle.ts');
        onInit();
        values.set(`${MODULE_ID}.isVerbose`, true);
        onSetup();
        onReady();
        expect(debug).toHaveBeenCalledExactlyOnceWith(
            `[${MODULE_ID}]`,
            'Hello World settings',
            { testChoice: 'first', testInteger: 5 },
        );
        expect(get).toHaveBeenCalledTimes(3);
        registrations.get('isVerbose')?.onChange?.(false);
        const { verbose } = await import('../src/settings.ts');
        expect(verbose.isVerbose).toBe(false);
    });

    it('does nothing in an unsupported system', async () => {
        vi.stubGlobal('game', {
            system: { id: 'pf2e' },
            settings: { register, get },
        });
        const { onInit, onSetup, onReady } =
            await import('../src/lifecycle.ts');
        onInit();
        onSetup();
        onReady();
        expect(info).not.toHaveBeenCalled();
    });
});
