import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MODULE_ID } from '../../../src/module-id.ts';
import { settings } from '../../../src/settings.ts';
import {
    disableSwipeOverride,
    enableSwipeOverride,
    getSwipeOverride,
    isSwipeTouchActive,
} from '../../../src/features/stylus/swipe.ts';
import { type SwipeClient } from '../../../src/features/stylus/stylus.types.js';

describe('Swipe VTT browser override', () => {
    const values = new Map<string, unknown>();
    const getState = vi.fn(() => 'unlocked');
    let shouldStartTouch = true;
    const swipe: SwipeClient = {
        enabled: false,
        touchManager: null,
        SettingsManager: {
            getEffective: () => values.get('swipe-vtt.oneFingerDrag'),
            locks: { getState },
        },
    };
    const callAll = vi.fn();
    const set = vi.fn(
        async (namespace: string, key: string, value: unknown) => {
            values.set(`${namespace}.${key}`, value);
            if (namespace === 'swipe-vtt' && key === 'enabledOnDesktop') {
                swipe.enabled = value === true && shouldStartTouch;
                swipe.touchManager = swipe.enabled ? {} : null;
            }
            return value;
        },
    );

    beforeEach(() => {
        values.clear();
        values.set('swipe-vtt.enabledOnDesktop', false);
        values.set('swipe-vtt.oneFingerDrag', 'pan');
        values.set(`${MODULE_ID}.swipeOverride`, '');
        shouldStartTouch = true;
        swipe.enabled = false;
        swipe.touchManager = null;
        vi.stubGlobal('Hooks', { callAll });
        vi.stubGlobal('game', {
            user: { isGM: false },
            settings: {
                register: (
                    namespace: string,
                    key: string,
                    definition: { default: unknown },
                ) => values.set(`${namespace}.${key}`, definition.default),
                get: (namespace: string, key: string) =>
                    values.get(`${namespace}.${key}`),
                set,
            },
        });
        settings.register();
    });

    it('forces the two client settings and restores their saved values on disable', async () => {
        await enableSwipeOverride(swipe);
        expect(isSwipeTouchActive(swipe)).toBe(true);
        expect(callAll).toHaveBeenCalledWith(
            'swipe-vtt.oneFingerDragChanged',
            'select',
        );
        const previous = getSwipeOverride();
        expect(previous).toEqual({
            wasDesktopEnabled: false,
            oneFingerDrag: 'pan',
        });
        if (!previous) throw new Error('Missing override');
        await disableSwipeOverride(swipe, previous);
        expect(values.get('swipe-vtt.enabledOnDesktop')).toBe(false);
        expect(values.get('swipe-vtt.oneFingerDrag')).toBe('pan');
        expect(getSwipeOverride()).toBeNull();
    });

    it('leaves pre-existing Swipe touch settings enabled', async () => {
        await set('swipe-vtt', 'enabledOnDesktop', true);
        await set('swipe-vtt', 'oneFingerDrag', 'select');
        await enableSwipeOverride(swipe);
        const previous = getSwipeOverride();
        if (!previous) throw new Error('Missing override');
        await disableSwipeOverride(swipe, previous);
        expect(isSwipeTouchActive(swipe)).toBe(true);
    });

    it('does not write browser or world settings when Swipe restricts a needed override', async () => {
        getState.mockReturnValueOnce('locked');
        await expect(enableSwipeOverride(swipe)).rejects.toThrow('GM');
        expect(set).not.toHaveBeenCalled();
        expect(values.get(`${MODULE_ID}.swipeOverride`)).toBe('');
    });

    it('rolls back the client settings if the touch manager fails to start', async () => {
        shouldStartTouch = false;
        await expect(enableSwipeOverride(swipe)).rejects.toThrow(
            'could not start',
        );
        expect(values.get('swipe-vtt.enabledOnDesktop')).toBe(false);
        expect(values.get('swipe-vtt.oneFingerDrag')).toBe('pan');
        expect(getSwipeOverride()).toBeNull();
    });
});
