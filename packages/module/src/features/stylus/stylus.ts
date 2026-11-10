import { HooksUtils } from '@template/foundry-core';
import { settings, verbose } from '../../settings.ts';
import { readBindings } from './bindings.ts';
import { listenForPenCommands } from './pen-input.ts';
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
let board: HTMLCanvasElement | undefined;
let boardGeneration = 0;
let stopPen: (() => void) | undefined;
let stopDrawingHistory: (() => void) | undefined;
let isChangingMode = false;
let pendingTool: Promise<void> | undefined;
const histories = new WeakMap<foundry.documents.Scene, string[]>();
const pendingUndo = new WeakMap<foundry.documents.Scene, Promise<void>>();
const toolbarButtons = new Map<ToolId, HTMLButtonElement>();

export function startStylus(): void {
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
    toolbar.append(tools, undoButton);
    document.body.append(toggle, toolbar);

    HooksUtils.on('canvasReady', () => queueMicrotask(syncMode));
    HooksUtils.on('canvasTearDown', () => {
        releaseBoard();
        toolbar.hidden = true;
        toggle.disabled = true;
    });
    HooksUtils.on('renderSceneControls', syncTools);
    HooksUtils.on('swipeVtt.enabled', () => queueMicrotask(syncMode));
    HooksUtils.on('swipeVtt.disabled', () => queueMicrotask(syncMode));
    HooksUtils.on('clientSettingChanged', (key: string) => {
        if (
            key === 'swipe-vtt.oneFingerDrag' ||
            key === 'swipe-vtt.enabledOnDesktop'
        )
            syncMode();
    });
    syncMode();
}

export function refreshStylusBindings(): void {
    stopPen?.();
    stopPen = board
        ? listenForPenCommands(
              board,
              readBindings(settings.get('stylusBindings')),
              (binding, event) => {
                  void executeBinding(binding, event).catch(reportError);
              },
          )
        : undefined;
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
        if (board) {
            refreshStylusBindings();
            stopDrawingHistory = HooksUtils.on(
                'createDrawing',
                onCreateDrawing,
            );
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
    if (isActive) syncTools();
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
    stopPen?.();
    stopPen = undefined;
    stopDrawingHistory?.();
    stopDrawingHistory = undefined;
    board = undefined;
    boardGeneration += 1;
}

function syncTools(): void {
    if (!board) return;
    const tools = getAvailableTools();
    for (const [id, button] of toolbarButtons) {
        const tool = tools.find((available) => available.id === id);
        const isHidden = !tool;
        if (button.hidden !== isHidden) button.hidden = isHidden;
        const pressed = String(!!tool && isActiveTool(tool));
        if (button.getAttribute('aria-pressed') !== pressed)
            button.setAttribute('aria-pressed', pressed);
    }
    updateUndoButton();
}

function isActiveTool(tool: StylusTool): boolean {
    return (
        ui.controls.control?.name === tool.control &&
        ui.controls.tool?.name === tool.tool
    );
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
                const index = tools.findIndex(isActiveTool);
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
            await ui.controls.activate({
                control: tool.control,
                tool: tool.tool,
            });
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
    updateUndoButton();
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
                if (!drawing.canUserModify(game.user, 'delete')) {
                    ui.notifications.warn(
                        'You cannot delete the latest stylus drawing.',
                    );
                    return;
                }
                await scene.deleteEmbeddedDocuments('Drawing', [id]);
                if (!scene.drawings.has(id)) history.splice(index, 1);
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
    verbose.debug('Stylus operation failed', () => error);
    ui.notifications.warn(
        error instanceof Error ? error.message : 'The stylus operation failed.',
    );
}
