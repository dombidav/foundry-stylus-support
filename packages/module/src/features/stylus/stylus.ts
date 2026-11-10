import { HooksUtils } from '@template/foundry-core';
import { MODULE_ID } from '../../module-id.ts';
import { settings, stylusDiagnostics, verbose } from '../../settings.ts';
import { readBindings } from './bindings.ts';
import {
    createDrawingPaletteControls,
    isDrawingCreationTool,
} from './drawing-palette.ts';
import {
    installNativeGestureControls,
    runNativeGestureAction,
} from './native-gestures.ts';
import { listenForPenCommands } from './pen-input.ts';
import { createTipGestures } from './tip-gestures.ts';
import {
    disableSwipeOverride,
    enableSwipeOverride,
    getSwipeClient,
    getSwipeOverride,
    isSwipeTouchActive,
} from './swipe.ts';
import { getAvailableTools, STYLUS_TOOLS } from './tools.ts';
import {
    type StylusBinding,
    type StylusTool,
    type ToolId,
} from './stylus.types.js';

let toggle: HTMLButtonElement;
let toolbar: HTMLElement;
let undoButton: HTMLButtonElement;
let snapStatus: HTMLSpanElement;
let drawingPalette: ReturnType<typeof createDrawingPaletteControls>;
let board: HTMLCanvasElement | undefined;
let boardGeneration = 0;
let penInput: ReturnType<typeof listenForPenCommands> | undefined;
let tipGestures: ReturnType<typeof createTipGestures> | undefined;
let nativeGestures: ReturnType<typeof installNativeGestureControls> | undefined;
let hasInstalledNativeForBindings = false;
let customTool: StylusTool | undefined;
let lastTracedTool: ToolId | undefined;
let hasRulerBindings = false;
let stopDrawingHistory: (() => void) | undefined;
let isChangingMode = false;
let pendingTool: Promise<void> | undefined;
const histories = new WeakMap<foundry.documents.Scene, string[]>();
const pendingUndo = new WeakMap<foundry.documents.Scene, Promise<void>>();
const toolbarButtons = new Map<ToolId, HTMLButtonElement>();

export function startStylus(): void {
    drawingPalette = createDrawingPaletteControls(ui.controls, reportError);
    toggle = createIconButton(
        'fa-hand-pointer',
        'Enable stylus and Swipe VTT touch',
    );
    toggle.className = 'stylus-touch-toggle';
    toggle.addEventListener('click', () => {
        void toggleMode();
    });
    toolbar = document.createElement('nav');
    toolbar.className = 'stylus-toolbar';
    toolbar.setAttribute('aria-label', 'Stylus tools');
    toolbar.hidden = true;
    const tools = document.createElement('div');
    for (const tool of STYLUS_TOOLS) {
        const button = createIconButton(tool.icon, tool.label);
        button.addEventListener('click', () => {
            void chooseTool(tool.id);
        });
        toolbarButtons.set(tool.id, button);
        tools.append(button);
    }
    undoButton = createIconButton('fa-rotate-left', 'Undo last drawing');
    undoButton.addEventListener('click', () => {
        void undoDrawing();
    });
    snapStatus = document.createElement('span');
    snapStatus.className = 'stylus-snap-status';
    snapStatus.setAttribute('role', 'status');
    snapStatus.hidden = true;
    snapStatus.textContent = 'Snap override ready';
    toolbar.append(tools, undoButton, snapStatus);
    document.body.append(toggle, toolbar);

    HooksUtils.on('canvasReady', () => queueMicrotask(syncMode));
    HooksUtils.on('canvasTearDown', () => {
        releaseBoard();
        toolbar.hidden = true;
        toggle.disabled = true;
    });
    HooksUtils.on('renderSceneControls', syncTools);
    ui.controls.addEventListener('activate', () => {
        if (board) void drawingPalette.sync();
        syncTools();
    });
    HooksUtils.on('swipeVtt.enabled', () => queueMicrotask(syncMode));
    HooksUtils.on('swipeVtt.disabled', () => queueMicrotask(syncMode));
    HooksUtils.on('clientSettingChanged', (key: string) => {
        if (key === `${MODULE_ID}.isVerbose`) {
            queueMicrotask(() => {
                refreshDiagnostics();
                if (verbose.isVerbose)
                    stylusDiagnostics.record('stylus', 'verboseEnabled', {
                        isStylusActive: !!board,
                        tool: getActiveToolId(),
                    });
            });
        }
        if (
            key === 'swipe-vtt.oneFingerDrag' ||
            key === 'swipe-vtt.enabledOnDesktop'
        )
            syncMode();
    });
    syncMode();
}

export function refreshStylusBindings(): void {
    if (!penInput || !canvas) return;
    const bindings = readBindings(settings.get('stylusBindings'));
    hasRulerBindings = bindings.some(
        ({ signal, action }) => signal !== null && action === 'activeTool',
    );
    penInput.setBindings(bindings);
    if (!hasRulerBindings) nativeGestures?.clearKeptRuler();
    if (verbose.isVerbose) {
        stylusDiagnostics.record('stylus', 'bindingsUpdated', {
            count: bindings.length,
        });
        for (const [index, binding] of bindings.entries()) {
            if (binding.signal)
                stylusDiagnostics.record('stylus', 'binding', {
                    slot: index + 1,
                    action: binding.action,
                    tool:
                        binding.action === 'tool' ? binding.target : undefined,
                    signalType: binding.signal.type,
                    signalButtons: binding.signal.buttons,
                });
        }
    }
    refreshDiagnostics();
}

function refreshDiagnostics(): void {
    if (!penInput || !canvas) return;
    const isVerbose = verbose.isVerbose;
    penInput.setDiagnostics(isVerbose);
    // Keep the native guard until teardown if it has handled bindings. An old claim
    // can still be waiting for a release after the user removes its binding.
    hasInstalledNativeForBindings ||= penInput.hasBindings();
    if (!hasInstalledNativeForBindings && !isVerbose) {
        nativeGestures?.stop();
        nativeGestures = undefined;
        return;
    }
    nativeGestures ??= installNativeGestureControls(
        canvas,
        getActiveToolId,
        () => hasRulerBindings,
        (pointerId) => penInput?.isClaimed(pointerId) ?? false,
        (isReady) => {
            snapStatus.hidden = !isReady;
        },
    );
    nativeGestures.setDiagnostics(isVerbose);
}

function syncMode(): void {
    if (isChangingMode) return;
    const swipe = getSwipeClient();
    const override = getSwipeOverride();
    const view = canvas?.ready ? canvas.app.view : null;
    const hasBoard = view instanceof HTMLCanvasElement;
    const isActive =
        hasBoard && !!override && !!swipe && isSwipeTouchActive(swipe);
    const nextBoard = isActive ? view : undefined;
    if (board !== nextBoard) {
        releaseBoard();
        board = nextBoard;
        if (board && canvas) {
            tipGestures = createTipGestures(
                board,
                canvas,
                () => customTool?.id,
                reportError,
            );
            penInput = listenForPenCommands(
                board,
                (binding, event) => {
                    const command = executeBinding(binding, event);
                    if (verbose.isVerbose)
                        void command.then(() => {
                            stylusDiagnostics.record(
                                'stylus',
                                'buttonSettled',
                                {
                                    action: binding.action,
                                    pointerId: event.pointerId,
                                    eventTimeMs: event.timeStamp,
                                },
                            );
                        }, reportError);
                    else void command.catch(reportError);
                },
                tipGestures.hasHandled,
                tipGestures.cancel,
            );
            if (verbose.isVerbose)
                stylusDiagnostics.record('stylus', 'canvasAttached', {
                    generation: boardGeneration,
                });
            refreshStylusBindings();
            const stopCreate = HooksUtils.on('createDrawing', onCreateDrawing);
            const stopDelete = HooksUtils.on('deleteDrawing', onDeleteDrawing);
            stopDrawingHistory = () => {
                stopCreate();
                stopDelete();
            };
        }
    }

    toggle.disabled = !swipe || (!hasBoard && !override);
    toggle.setAttribute('aria-pressed', String(isActive));
    const label = !swipe
        ? 'Swipe VTT touch controls are unavailable'
        : override
          ? 'Release stylus and Swipe VTT touch override'
          : 'Enable stylus and Swipe VTT touch';
    toggle.title = label;
    toggle.setAttribute('aria-label', label);
    toolbar.hidden = !isActive;
    if (isActive) {
        void drawingPalette.sync();
        syncTools();
    }
}

async function toggleMode(): Promise<void> {
    if (isChangingMode) return;
    const swipe = getSwipeClient();
    if (!swipe) return;
    isChangingMode = true;
    toggle.disabled = true;
    try {
        const override = getSwipeOverride();
        if (override) {
            releaseBoard();
            toolbar.hidden = true;
            await disableSwipeOverride(swipe, override);
        } else {
            await enableSwipeOverride(swipe);
        }
    } catch (error) {
        reportError(error);
    } finally {
        isChangingMode = false;
        syncMode();
    }
}

function releaseBoard(): void {
    if (board) drawingPalette.stop();
    if (board && verbose.isVerbose)
        stylusDiagnostics.record('stylus', 'canvasDetached', {
            generation: boardGeneration,
        });
    nativeGestures?.stop();
    nativeGestures = undefined;
    hasInstalledNativeForBindings = false;
    tipGestures?.cancel();
    tipGestures = undefined;
    penInput?.stop();
    penInput = undefined;
    customTool = undefined;
    lastTracedTool = undefined;
    stopDrawingHistory?.();
    stopDrawingHistory = undefined;
    board = undefined;
    boardGeneration += 1;
}

function syncTools(): void {
    if (!board) return;
    if (customTool && !isNativeTool(customTool)) {
        tipGestures?.cancel();
        customTool = undefined;
    }
    const tools = getAvailableTools();
    const activeId = getActiveToolId();
    if (verbose.isVerbose && lastTracedTool !== activeId) {
        lastTracedTool = activeId;
        stylusDiagnostics.record('stylus', 'toolChanged', {
            tool: activeId ?? null,
        });
    }
    if (activeId !== 'measure') nativeGestures?.clearKeptRuler();
    for (const [id, button] of toolbarButtons) {
        const tool = tools.find((available) => available.id === id);
        const isHidden = !tool;
        if (button.hidden !== isHidden) button.hidden = isHidden;
        const pressed = String(!!tool && activeId === id);
        if (button.getAttribute('aria-pressed') !== pressed)
            button.setAttribute('aria-pressed', pressed);
    }
    updateUndoButton();
}

function isNativeTool(tool: StylusTool): boolean {
    return (
        ui.controls.control?.name === tool.control &&
        ui.controls.tool?.name === tool.tool
    );
}

function getActiveToolId(): ToolId | undefined {
    if (customTool && isNativeTool(customTool)) return customTool.id;
    return STYLUS_TOOLS.find(
        (tool) =>
            tool.id !== 'eraser' && tool.id !== 'lasso' && isNativeTool(tool),
    )?.id;
}

function chooseTool(target: string, direction = 0): Promise<void> {
    const generation = boardGeneration;
    const currentScene = canvas?.scene;
    const task = (pendingTool ?? Promise.resolve())
        .then(async () => {
            if (
                !board ||
                boardGeneration !== generation ||
                canvas?.scene !== currentScene
            )
                return;
            const tools = getAvailableTools();
            let tool: StylusTool | undefined;
            if (direction) {
                const activeId = getActiveToolId();
                const index = tools.findIndex(({ id }) => id === activeId);
                tool =
                    index < 0
                        ? direction < 0
                            ? tools.at(-1)
                            : tools[0]
                        : tools[
                              (index + direction + tools.length) % tools.length
                          ];
            } else {
                tool = tools.find(({ id }) => id === target);
            }
            if (!tool) return;
            tipGestures?.cancel();
            customTool = undefined;
            if (
                !isDrawingCreationTool(
                    tool.control,
                    ui.controls.controls[tool.control]?.tools[tool.tool],
                )
            ) {
                const close = drawingPalette.closeBeforeLeaving();
                if (close) await close;
                if (
                    boardGeneration !== generation ||
                    canvas?.scene !== currentScene
                )
                    return;
            }
            await ui.controls.activate({
                control: tool.control,
                tool: tool.tool,
            });
            if (
                boardGeneration !== generation ||
                canvas?.scene !== currentScene
            )
                return;
            if (
                (tool.id === 'eraser' || tool.id === 'lasso') &&
                isNativeTool(tool)
            )
                customTool = tool;
            void drawingPalette.sync(true);
            syncTools();
        })
        .catch(reportError);
    pendingTool = task;
    return task;
}

async function executeBinding(
    binding: StylusBinding,
    event: PointerEvent,
): Promise<void> {
    switch (binding.action) {
        case 'previous':
            return chooseTool('', -1);
        case 'next':
            return chooseTool('', 1);
        case 'undo':
            return undoDrawing();
        case 'tool':
            return chooseTool(binding.target);
        case 'activeTool':
        case 'removePoint':
        case 'cancelGesture':
            if (binding.action === 'cancelGesture') tipGestures?.cancel();
            if (canvas?.ready)
                runNativeGestureAction(
                    canvas,
                    getActiveToolId(),
                    binding.action,
                    event,
                );
            return;
        case 'snapOnce':
            nativeGestures?.toggleSnap();
            return;
        case 'macro': {
            const macro = game.macros.get(binding.target);
            if (!macro?.canExecute) {
                ui.notifications.warn(
                    'The selected stylus macro is unavailable.',
                );
                return;
            }
            await macro.execute({ event });
            return;
        }
        case 'none':
            return;
    }
}

function onCreateDrawing(
    drawing: foundry.documents.DrawingDocument,
    _options: unknown,
    userId: string,
): void {
    const scene = drawing.parent;
    if (
        !board ||
        !scene ||
        scene !== canvas?.scene ||
        !drawing.id ||
        userId !== game.user.id
    )
        return;
    const history = histories.get(scene);
    if (history) history.push(drawing.id);
    else histories.set(scene, [drawing.id]);
    if (verbose.isVerbose)
        stylusDiagnostics.record('stylus', 'drawingCreated', {
            shape: drawing.shape.type,
        });
    updateUndoButton();
}

function onDeleteDrawing(drawing: foundry.documents.DrawingDocument): void {
    const scene = drawing.parent;
    const history = scene && histories.get(scene);
    const index = history?.lastIndexOf(drawing.id ?? '') ?? -1;
    if (index >= 0) history?.splice(index, 1);
    if (scene === canvas?.scene) updateUndoButton();
}

function undoDrawing(): Promise<void> | undefined {
    const scene = canvas?.scene;
    if (!board || !scene) return;
    const generation = boardGeneration;
    const task = (pendingUndo.get(scene) ?? Promise.resolve())
        .then(async () => {
            if (boardGeneration !== generation || canvas?.scene !== scene)
                return;
            const history = histories.get(scene);
            if (!history) return;
            while (history.length) {
                const index = history.length - 1;
                const id = history[index];
                if (!id) return;
                const drawing = scene.drawings.get(id);
                if (!drawing) {
                    history.pop();
                    continue;
                }
                if (
                    drawing.locked ||
                    !drawing.canUserModify(game.user, 'delete')
                ) {
                    ui.notifications.warn(
                        'You cannot delete the latest stylus drawing.',
                    );
                    return;
                }
                await scene.deleteEmbeddedDocuments('Drawing', [id]);
                if (!scene.drawings.has(id)) {
                    const remainingIndex = history.lastIndexOf(id);
                    if (remainingIndex >= 0) history.splice(remainingIndex, 1);
                }
                return;
            }
        })
        .catch(reportError)
        .finally(updateUndoButton);
    pendingUndo.set(scene, task);
    return task;
}

function updateUndoButton(): void {
    const scene = canvas?.scene;
    undoButton.disabled = !scene || !histories.get(scene)?.length;
}

function createIconButton(icon: string, label: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.title = label;
    button.setAttribute('aria-label', label);
    const glyph = document.createElement('i');
    glyph.className = `fa-solid ${icon}`;
    glyph.setAttribute('aria-hidden', 'true');
    button.append(glyph);
    return button;
}

function reportError(error: unknown): void {
    if (verbose.isVerbose)
        stylusDiagnostics.record('stylus', 'operationFailed', {
            message: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : undefined,
        });
    ui.notifications.warn(
        error instanceof Error ? error.message : 'The stylus operation failed.',
    );
}
