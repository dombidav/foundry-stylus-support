import { type Canvas } from '@client/canvas/_module.mjs';
import { type Token } from '@client/canvas/placeables/_module.mjs';
import { type CanvasViewPosition } from '@client/_types.mjs';
import {
    type Actor,
    type ActiveEffect,
    type Combat,
    type Item,
    type Level,
    type Scene,
    type TokenDocument,
    type User,
} from '@client/documents/_module.mjs';
import {
    type DatabaseCreateOperation,
    type DatabaseUpdateOperation,
    type DatabaseDeleteOperation,
} from '@common/abstract/_types.mjs';

/**
 * Map verified native document names to their instance types for generating document lifecycle hooks.
 *
 * @example
 * type ActorDocument = HookDocuments['Actor'];
 */
export interface HookDocuments {
    Actor: Actor;
    ActiveEffect: ActiveEffect;
    Combat: Combat;
    Item: Item;
    Scene: Scene;
    Token: TokenDocument;
    User: User;
}

/**
 * Generate typed create, update, and delete hook callbacks, including synchronous cancellable pre-hooks.
 *
 * @example
 * const handler: DocumentHookEvents['updateActor'] = (actor, changed, options, userId) => { void actor; };
 */
export type DocumentHookEvents = {
    [K in keyof HookDocuments as `preCreate${K}`]: (
        document: HookDocuments[K],
        data: Record<string, unknown>,
        options: Partial<DatabaseCreateOperation<HookDocuments[K]['parent']>>,
        userId: string,
    ) => boolean | void;
} & {
    [K in keyof HookDocuments as `create${K}`]: (
        document: HookDocuments[K],
        options: Partial<DatabaseCreateOperation<HookDocuments[K]['parent']>>,
        userId: string,
    ) => void;
} & {
    [K in keyof HookDocuments as `preUpdate${K}`]: (
        document: HookDocuments[K],
        changed: Record<string, unknown>,
        options: Partial<DatabaseUpdateOperation<HookDocuments[K]['parent']>>,
        userId: string,
    ) => boolean | void;
} & {
    [K in keyof HookDocuments as `update${K}`]: (
        document: HookDocuments[K],
        changed: Record<string, unknown>,
        options: Partial<DatabaseUpdateOperation<HookDocuments[K]['parent']>>,
        userId: string,
    ) => void;
} & {
    [K in keyof HookDocuments as `preDelete${K}`]: (
        document: HookDocuments[K],
        options: Partial<DatabaseDeleteOperation<HookDocuments[K]['parent']>>,
        userId: string,
    ) => boolean | void;
} & {
    [K in keyof HookDocuments as `delete${K}`]: (
        document: HookDocuments[K],
        options: Partial<DatabaseDeleteOperation<HookDocuments[K]['parent']>>,
        userId: string,
    ) => void;
};

/**
 * Describe v14 canvas teardown destinations missing from the installed Foundry declarations.
 *
 * @example
 * const options: CanvasTearDownOptions = { nextScene: null, nextLevel: null };
 */
export interface CanvasTearDownOptions {
    nextLevel?: Level | null;
    nextScene?: Scene | null;
}

/**
 * Extend native camera coordinates with v14's last-viewed level ID.
 *
 * @example
 * const position: CanvasPanPosition = { x: 100, y: 200, scale: 1, level: null };
 */
export interface CanvasPanPosition extends CanvasViewPosition {
    level: string | null;
}

/**
 * Provide verified v14 callback signatures for lifecycle, canvas, token, and document hooks without a runtime registry.
 *
 * @example
 * const ready: KnownHookEvents['canvasReady'] = current => { void current.scene; };
 */
export interface KnownHookEvents extends DocumentHookEvents {
    /**
     * Handle Foundry initialization, when package settings and other registrations should be defined.
     *
     * @example
     * HooksUtils.once('init', () => settings.register());
     */
    init: () => void;
    /**
     * Handle completion of translation initialization before the setup phase.
     *
     * @example
     * HooksUtils.once('i18nInit', () => initializeLocalizedLabels());
     */
    i18nInit: () => void;
    /**
     * Handle initialized documents and settings before canvas and user-interface initialization.
     *
     * @example
     * HooksUtils.once('setup', () => readRegisteredSettings());
     */
    setup: () => void;
    /**
     * Handle completion of game initialization without expecting callback arguments.
     *
     * @example
     * HooksUtils.once('ready', () => initializeModuleFeatures());
     */
    ready: () => void;
    /**
     * Receive the native canvas as it begins scene initialization.
     *
     * @example
     * HooksUtils.on('canvasInit', current => prepareScene(current.scene));
     */
    canvasInit: (canvas: Canvas) => void;
    /**
     * Receive the native canvas after its scene becomes ready for use.
     *
     * @example
     * HooksUtils.on('canvasReady', current => inspectScene(current.scene));
     */
    canvasReady: (canvas: Canvas) => void;
    /**
     * Receive constrained world camera coordinates and zoom after a native canvas pan.
     *
     * @example
     * HooksUtils.on('canvasPan', (_canvas, position) => updateZoomDisplay(position.scale));
     */
    canvasPan: (canvas: Canvas, position: CanvasPanPosition) => void;
    /**
     * Receive canvas teardown and the upcoming scene/level so module resources can be released.
     *
     * @example
     * HooksUtils.on('canvasTearDown', (_canvas, options) => releaseSceneResources(options.nextScene));
     */
    canvasTearDown: (canvas: Canvas, options: CanvasTearDownOptions) => void;
    /**
     * Receive a token placeable and whether native selection was enabled or removed.
     *
     * @example
     * HooksUtils.on('controlToken', (token, controlled) => updateSelection(token, controlled));
     */
    controlToken: (token: Token, isControlled: boolean) => void;
    /**
     * Receive a token placeable and its changed hover state.
     *
     * @example
     * HooksUtils.on('hoverToken', (token, hovered) => updateHover(token, hovered));
     */
    hoverToken: (token: Token, isHovered: boolean) => void;
    /**
     * Receive the targeting user, token placeable, and resulting targeted state.
     *
     * @example
     * HooksUtils.on('targetToken', (user, token, targeted) => updateTargets(user, token, targeted));
     */
    targetToken: (user: User, token: Token, isTargeted: boolean) => void;
}

/**
 * The union of verified hook names derived from KnownHookEvents.
 *
 * @example
 * const hook: KnownHooks = 'updateActor';
 */
export type KnownHooks = keyof KnownHookEvents;

/**
 * Preserve autocomplete for known hooks while accepting arbitrary custom string names.
 *
 * @example
 * const customHook: HookName = 'my-module.changed';
 */
export type HookName = KnownHooks | (string & {});
/**
 * Represent flexible explicitly typed custom callbacks without any or unknown-array variance restrictions.
 *
 * @example
 * const callback: HookCallback = (count: number) => count > 0;
 */
export type HookCallback = (...args: never[]) => unknown;
/**
 * Select a verified callback signature for known names and the flexible callback for custom names.
 *
 * @example
 * const callback: HookCallbackFor<'canvasReady'> = current => { void current.scene; };
 */
export type HookCallbackFor<H extends HookName> = H extends KnownHooks
    ? KnownHookEvents[H]
    : HookCallback;
/**
 * Associate each hook key with its own callback type for batch registration.
 *
 * @example
 * const handlers: HookHandlers<'ready' | 'setup'> = { ready: () => {}, setup: () => {} };
 */
export type HookHandlers<H extends HookName> = { [K in H]: HookCallbackFor<K> };
/**
 * An idempotent operation that removes only the listener registrations it owns.
 *
 * @example
 * const stop: HookCleanup = HooksUtils.on('ready', () => {});
 * stop();
 */
export type HookCleanup = () => void;

/**
 * Describe the native numeric-ID registration boundary while callbacks remain forwarded unchanged.
 *
 * @example
 * const id = registrar.on('ready', callback);
 * registrar.off('ready', id);
 */
export interface HookRegistrar {
    /**
     * Register a persistent native callback and retain its numeric ID for precise removal.
     *
     * @example
     * const id = registrar.on('ready', callback);
     */
    on(hook: string, callback: HookCallback): number;
    /**
     * Register a native one-shot callback that can still be cancelled by its numeric ID.
     *
     * @example
     * const id = registrar.once('ready', callback);
     */
    once(hook: string, callback: HookCallback): number;
    /**
     * Remove the specified registration without affecting another listener using the same callback.
     *
     * @example
     * registrar.off('ready', id);
     */
    off(hook: string, id: number): void;
}
