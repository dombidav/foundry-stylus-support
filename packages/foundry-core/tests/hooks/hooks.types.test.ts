import {
    type Actor,
    type TokenDocument,
    type User,
} from '@client/documents/_module.mjs';
import { type Canvas } from '@client/canvas/_module.mjs';
import { type Token } from '@client/canvas/placeables/_module.mjs';
import { expectTypeOf, it } from 'vitest';
import {
    HooksUtils,
    type HookName,
    type KnownHooks,
    type KnownHookEvents,
    type HookCleanup,
} from '../../src/index.ts';

/**
 * Compile accepted and intentionally rejected hook usages without registering real listeners at runtime.
 *
 * @example
 * expectTypeOf(verifyHookTypes).returns.toEqualTypeOf<void>();
 */
function verifyHookTypes() {
    HooksUtils.on('ready', () => {});
    HooksUtils.once('canvasReady', (current) => {
        expectTypeOf(current).toEqualTypeOf<Canvas>();
    });
    const cleanup = HooksUtils.on(
        'updateActor',
        (actor, changed, options, userId) => {
            expectTypeOf(actor).toEqualTypeOf<Actor>();
            expectTypeOf(changed).toEqualTypeOf<Record<string, unknown>>();
            expectTypeOf(options.diff).toEqualTypeOf<boolean | undefined>();
            expectTypeOf(userId).toEqualTypeOf<string>();
        },
    );
    expectTypeOf(cleanup).toEqualTypeOf<HookCleanup>();
    HooksUtils.on('updateToken', (token) => {
        expectTypeOf(token).toEqualTypeOf<TokenDocument>();
    });
    HooksUtils.on('targetToken', (user, token, isTargeted) => {
        expectTypeOf(user).toEqualTypeOf<User>();
        expectTypeOf(token).toEqualTypeOf<Token>();
        expectTypeOf(isTargeted).toEqualTypeOf<boolean>();
    });
    HooksUtils.on('preUpdateActor', () => false);
    HooksUtils.on(
        'my-module.changed',
        (payload: { isEnabled: boolean }) => payload.isEnabled,
    );
    HooksUtils.once(
        'custom.hook',
        (value: number, text: string) => `${value}${text}`,
    );
    HooksUtils.onMany({
        ready: () => {},
        canvasReady: (current) => {
            expectTypeOf(current).toEqualTypeOf<Canvas>();
        },
        updateActor: (actor, _changed, _options, userId) => {
            expectTypeOf(actor).toEqualTypeOf<Actor>();
            expectTypeOf(userId).toEqualTypeOf<string>();
        },
        'custom.event': (payload: { value: number }) => payload.value,
    });
    /**
     * Provide an intentionally incompatible numeric callback for known-hook rejection checks.
     *
     * @example
     * // @ts-expect-error canvasReady receives a Canvas, not a number.
     * HooksUtils.on('canvasReady', wrongNumber);
     */
    const wrongNumber = (value: number) => value;
    /**
     * Provide an actor-argument callback that must not match a zero-argument ready hook.
     *
     * @example
     * // @ts-expect-error ready supplies no actor argument.
     * HooksUtils.on('ready', wrongReady);
     */
    const wrongReady = (actor: Actor) => actor;
    /**
     * Provide a numeric user ID callback to verify update-hook string IDs are enforced.
     *
     * @example
     * // @ts-expect-error updateActor supplies a string user ID.
     * HooksUtils.on('updateActor', wrongUserId);
     */
    const wrongUserId = (
        _actor: object,
        _changed: object,
        _options: object,
        userId: number,
    ) => userId;
    // @ts-expect-error Known lifecycle hooks do not receive an actor.
    HooksUtils.on('ready', wrongReady);
    // @ts-expect-error A known hook must not be widened to a custom name to accept a wrong callback.
    HooksUtils.on('canvasReady', wrongNumber);
    // @ts-expect-error once must enforce known payload types too.
    HooksUtils.once('updateActor', wrongNumber);
    // @ts-expect-error The user ID is a string, not a number.
    HooksUtils.on('updateActor', wrongUserId);
    // @ts-expect-error Cancellation hooks are synchronous: a Promise cannot cancel the workflow.
    HooksUtils.on('preUpdateActor', async () => false);
    HooksUtils.onMany({
        // @ts-expect-error A mixed record must still check known event callbacks.
        canvasReady: wrongNumber,
        'custom.event': (value: number) => value,
    });
}

it('exposes known hook mappings while retaining free-form strings', () => {
    expectTypeOf(verifyHookTypes).returns.toEqualTypeOf<void>();
    expectTypeOf<'ready'>().toExtend<KnownHooks>();
    expectTypeOf<'updateToken'>().toExtend<KnownHooks>();
    expectTypeOf<'my-module.changed'>().toExtend<HookName>();
    expectTypeOf<
        Parameters<KnownHookEvents['updateActor']>[3]
    >().toEqualTypeOf<string>();
});
