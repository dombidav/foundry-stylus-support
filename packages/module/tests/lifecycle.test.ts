import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type PrimitiveSettingRegistration } from '../../foundry-core/src/settings/settings.types.js';
import { MODULE_ID } from '../src/module-id.ts';

const { startStylus } = vi.hoisted(() => ({ startStylus: vi.fn() }));
vi.mock('../src/features/stylus/stylus.ts', () => ({
    startStylus,
    refreshStylusBindings: vi.fn(),
}));

describe('module lifecycle', () => {
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
    const registerMenu = vi.fn();
    const system = { id: 'dnd5e' };

    beforeEach(() => {
        vi.resetModules();
        values.clear();
        registrations.clear();
        system.id = 'dnd5e';
        vi.stubGlobal('game', {
            system,
            settings: { register, get, registerMenu },
        });
        vi.stubGlobal('foundry', {
            applications: { api: { ApplicationV2: class {} } },
        });
    });

    it('registers browser settings and a non-GM-restricted menu during init', async () => {
        const { onInit } = await import('../src/lifecycle.ts');
        expect(register).not.toHaveBeenCalled();
        expect(registerMenu).not.toHaveBeenCalled();
        onInit();
        expect(registrations.get('isVerbose')).toMatchObject({
            scope: 'client',
            config: true,
            default: false,
        });
        expect(registrations.get('stylusBindings')).toMatchObject({
            scope: 'client',
            config: false,
            default: '[]',
        });
        expect(registrations.get('swipeOverride')).toMatchObject({
            scope: 'client',
            config: false,
            default: '',
        });
        expect(registerMenu).toHaveBeenCalledExactlyOnceWith(
            MODULE_ID,
            'buttons',
            expect.objectContaining({ restricted: false }),
        );
    });

    it('loads verbose mode at setup and starts stylus behavior only at ready', async () => {
        const { onInit, onSetup, onReady } =
            await import('../src/lifecycle.ts');
        onInit();
        values.set(`${MODULE_ID}.isVerbose`, true);
        onSetup();
        expect(get).toHaveBeenCalledExactlyOnceWith(MODULE_ID, 'isVerbose');
        expect(startStylus).not.toHaveBeenCalled();
        onReady();
        expect(startStylus).toHaveBeenCalledOnce();
        const { verbose } = await import('../src/settings.ts');
        expect(verbose.isVerbose).toBe(true);
        registrations.get('isVerbose')?.onChange?.(false);
        expect(verbose.isVerbose).toBe(false);
    });

    it('skips startup in another game system', async () => {
        const { onReady } = await import('../src/lifecycle.ts');
        system.id = 'pf2e';
        onReady();
        expect(startStylus).not.toHaveBeenCalled();
    });
});
