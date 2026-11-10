import { settings } from '../../settings.ts';
import { type SwipeClient, type SwipeOverride } from './stylus.types.js';

const SWIPE_ID = 'swipe-vtt';
const DESKTOP_MODE = 'enabledOnDesktop';
const ONE_FINGER_DRAG = 'oneFingerDrag';

export function getSwipeClient(): SwipeClient | undefined {
    if (!game.modules.get(SWIPE_ID)?.active) return;
    const client = globalThis.SwipeVTT;
    if (
        typeof client?.SettingsManager?.getEffective !== 'function' ||
        typeof client.SettingsManager.locks?.getState !== 'function' ||
        game.settings.settings.get(`${SWIPE_ID}.${DESKTOP_MODE}`)?.scope !==
            'client' ||
        game.settings.settings.get(`${SWIPE_ID}.${ONE_FINGER_DRAG}`)?.scope !==
            'client'
    )
        return;
    return client;
}

export function getSwipeOverride(): SwipeOverride | null {
    const stored = settings.get('swipeOverride');
    if (!stored) return null;
    try {
        const value: unknown = JSON.parse(stored);
        if (
            value &&
            typeof value === 'object' &&
            'wasDesktopEnabled' in value &&
            typeof value.wasDesktopEnabled === 'boolean' &&
            'oneFingerDrag' in value &&
            (value.oneFingerDrag === 'pan' || value.oneFingerDrag === 'select')
        ) {
            return {
                wasDesktopEnabled: value.wasDesktopEnabled,
                oneFingerDrag: value.oneFingerDrag,
            };
        }
    } catch {
        // Older or invalid client data can be replaced when the override is next enabled.
    }
    return null;
}

export function isSwipeTouchActive(client: SwipeClient): boolean {
    return (
        client.enabled &&
        !!client.touchManager &&
        game.settings.get(SWIPE_ID, DESKTOP_MODE, { document: false }) ===
            true &&
        game.settings.get(SWIPE_ID, ONE_FINGER_DRAG, { document: false }) ===
            'select' &&
        client.SettingsManager.getEffective(ONE_FINGER_DRAG) === 'select'
    );
}

export async function enableSwipeOverride(client: SwipeClient): Promise<void> {
    const wasDesktopEnabled = game.settings.get(SWIPE_ID, DESKTOP_MODE, {
        document: false,
    });
    const oneFingerDrag = game.settings.get(SWIPE_ID, ONE_FINGER_DRAG, {
        document: false,
    });
    if (
        typeof wasDesktopEnabled !== 'boolean' ||
        (oneFingerDrag !== 'pan' && oneFingerDrag !== 'select')
    ) {
        throw new Error('Swipe VTT has unsupported client settings.');
    }
    if (
        (oneFingerDrag !== 'select' ||
            client.SettingsManager.getEffective(ONE_FINGER_DRAG) !==
                'select') &&
        !canChangeOneFingerDrag(client)
    ) {
        throw new Error(
            'The GM has restricted Swipe VTT’s one-finger selection setting.',
        );
    }
    const previous: SwipeOverride = { wasDesktopEnabled, oneFingerDrag };
    // Persist the original values before writing either setting so reloads can still restore them.
    await settings.set('swipeOverride', JSON.stringify(previous));
    try {
        if (oneFingerDrag !== 'select') await setOneFingerDrag('select');
        if (!wasDesktopEnabled)
            await game.settings.set(SWIPE_ID, DESKTOP_MODE, true);
        if (!isSwipeTouchActive(client)) {
            throw new Error(
                'Swipe VTT could not start touch controls for this canvas and user.',
            );
        }
    } catch (error) {
        await disableSwipeOverride(client, previous);
        throw error;
    }
}

export async function disableSwipeOverride(
    client: SwipeClient,
    previous: SwipeOverride,
): Promise<void> {
    if (
        !previous.wasDesktopEnabled &&
        game.settings.get(SWIPE_ID, DESKTOP_MODE, { document: false }) === true
    ) {
        await game.settings.set(SWIPE_ID, DESKTOP_MODE, false);
    }
    if (
        previous.oneFingerDrag === 'pan' &&
        game.settings.get(SWIPE_ID, ONE_FINGER_DRAG, { document: false }) ===
            'select'
    ) {
        if (!canChangeOneFingerDrag(client)) {
            throw new Error(
                'The Swipe VTT override could not be fully restored because the GM restricted one-finger selection.',
            );
        }
        await setOneFingerDrag('pan');
    }
    await settings.set('swipeOverride', '');
}

function canChangeOneFingerDrag(client: SwipeClient): boolean {
    const state = client.SettingsManager.locks.getState(ONE_FINGER_DRAG);
    // Swipe propagates a GM's soft/locked edits to the world. A player's soft override stays local.
    return state === 'unlocked' || (state === 'soft' && !game.user.isGM);
}

async function setOneFingerDrag(
    value: SwipeOverride['oneFingerDrag'],
): Promise<void> {
    await game.settings.set(SWIPE_ID, ONE_FINGER_DRAG, value);
    Hooks.callAll('swipe-vtt.oneFingerDragChanged', value);
}
