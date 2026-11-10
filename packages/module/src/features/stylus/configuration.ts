import { MODULE_ID } from '../../module-id.ts';
import { settings, stylusDiagnostics } from '../../settings.ts';
import {
    ACTION_LABELS,
    createBinding,
    isButtonAction,
    MAX_BUTTONS,
    readBindings,
} from './bindings.ts';
import { createCalibration } from './calibration.ts';
import { getAvailableTools } from './tools.ts';

export function registerStylusSettingsMenu(onSaved: () => void): void {
    class StylusSettings extends foundry.applications.api.ApplicationV2 {
        static override DEFAULT_OPTIONS = {
            id: `${MODULE_ID}-settings`,
            window: {
                title: 'Stylus buttons',
                icon: 'fa-solid fa-pen',
                resizable: true,
            },
            position: { width: 540 },
        };

        protected override async _renderHTML(): Promise<HTMLFormElement> {
            return createSettingsForm(onSaved);
        }

        protected override _replaceHTML(
            result: unknown,
            content: HTMLElement,
        ): void {
            if (result instanceof HTMLFormElement)
                content.replaceChildren(result);
        }
    }

    game.settings.registerMenu(MODULE_ID, 'buttons', {
        name: 'Stylus buttons',
        label: 'Configure stylus buttons',
        hint: 'Set the number of buttons, learn their pen signals, and choose an action for each button on this browser.',
        icon: 'fa-solid fa-pen',
        type: StylusSettings,
        restricted: false,
    });
}

function createSettingsForm(onSaved: () => void): HTMLFormElement {
    const draft = readBindings(settings.get('stylusBindings'));
    let count = draft.length;
    const tools = getAvailableTools();
    let macroChoices: [string, string][] | undefined;

    const form = document.createElement('form');
    form.className = 'standard-form stylus-settings';
    const help = document.createElement('p');
    help.textContent =
        'Hold a stylus button before tapping with the pen tip. Zero buttons keeps the toolbar available for touch and mouse.';
    const number = document.createElement('input');
    number.type = 'number';
    number.min = '0';
    number.max = String(MAX_BUTTONS);
    number.step = '1';
    number.required = true;
    number.value = String(count);
    const rows = document.createElement('div');
    rows.className = 'stylus-button-rows';
    const calibration = createCalibration(
        () => draft.slice(0, count),
        renderRows,
    );
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    const save = createButton('Save changes', 'submit');
    const exportDiagnostics = createButton('Export diagnostics (JSON)');
    exportDiagnostics.addEventListener('click', () => {
        const json = stylusDiagnostics.exportJson({
            moduleId: MODULE_ID,
            moduleVersion: game.modules.get(MODULE_ID)?.version,
            foundryVersion: game.version,
            swipeVersion: game.modules.get('swipe-vtt')?.version,
            userAgent: navigator.userAgent,
        });
        const date = new Date().toISOString().replaceAll(':', '-');
        foundry.utils.saveDataToFile(
            json,
            'application/json',
            `${MODULE_ID}-diagnostics-${date}.json`,
        );
    });
    const diagnosticsHint = document.createElement('p');
    diagnosticsHint.textContent =
        'Enable Verbose mode in Module Settings to collect diagnostics for this browser session.';
    form.append(
        help,
        createField('Number of stylus buttons', number),
        rows,
        calibration.element,
        save,
        status,
        diagnosticsHint,
        exportDiagnostics,
    );

    function renderRows(): void {
        const content = document.createDocumentFragment();
        for (let index = 0; index < count; index += 1) {
            const binding = draft[index] ?? createBinding();
            draft[index] = binding;
            const row = document.createElement('fieldset');
            const legend = document.createElement('legend');
            legend.textContent = `Button ${index + 1}`;
            const action = createSelect(
                Object.entries(ACTION_LABELS),
                binding.action,
            );
            const target = document.createElement('div');
            const signal = document.createElement('span');
            signal.textContent = binding.signal
                ? `${binding.signal.type}, buttons=${binding.signal.buttons}`
                : 'Signal not learned';

            function renderTarget(): void {
                target.replaceChildren();
                let choices: [string, string][];
                if (binding.action === 'macro') {
                    macroChoices ??= game.macros.contents
                        .flatMap<[string, string]>((macro) =>
                            macro.id && macro.canExecute
                                ? [[macro.id, macro.name]]
                                : [],
                        )
                        .sort((left, right) => left[1].localeCompare(right[1]));
                    choices = macroChoices;
                } else if (binding.action === 'tool') {
                    choices = tools.map(({ id, label }) => [id, label]);
                } else return;

                const label = binding.action === 'macro' ? 'Macro' : 'Tool';
                const options: [string, string][] = [
                    ['', `Choose ${label.toLowerCase()}`],
                    ...choices,
                ];
                if (
                    binding.target &&
                    !choices.some(([value]) => value === binding.target)
                ) {
                    options.push([
                        binding.target,
                        'Unavailable (saved choice)',
                    ]);
                }
                const select = createSelect(options, binding.target);
                select.addEventListener('change', () => {
                    binding.target = select.value;
                });
                target.append(createField(label, select));
            }

            action.addEventListener('change', () => {
                if (!isButtonAction(action.value)) return;
                binding.action = action.value;
                binding.target = '';
                renderTarget();
            });
            const learn = createButton(binding.signal ? 'Relearn' : 'Learn');
            learn.addEventListener('click', () =>
                calibration.start(index, false),
            );
            const test = createButton('Test');
            test.disabled = !binding.signal;
            test.addEventListener('click', () =>
                calibration.start(index, true),
            );
            const clear = createButton('Clear signal');
            clear.disabled = !binding.signal;
            clear.addEventListener('click', () => {
                binding.signal = null;
                calibration.stop();
                renderRows();
            });
            const buttons = document.createElement('div');
            buttons.className = 'stylus-row-buttons';
            buttons.append(learn, test, clear);
            renderTarget();
            row.append(
                legend,
                createField('Action', action),
                target,
                signal,
                buttons,
            );
            content.append(row);
        }
        rows.replaceChildren(content);
    }

    number.addEventListener('input', () => {
        const nextCount = number.valueAsNumber;
        if (
            !Number.isInteger(nextCount) ||
            nextCount < 0 ||
            nextCount > MAX_BUTTONS ||
            count === nextCount
        )
            return;
        count = nextCount;
        calibration.stop();
        renderRows();
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (save.disabled || !form.reportValidity()) return;
        calibration.stop();
        save.disabled = true;
        status.textContent = 'Saving…';
        void settings
            .set('stylusBindings', JSON.stringify(draft.slice(0, count)))
            .then(
                () => {
                    onSaved();
                    status.textContent = 'Saved for this browser.';
                },
                () => {
                    status.textContent = 'Could not save stylus settings.';
                },
            )
            .finally(() => {
                save.disabled = false;
            });
    });

    renderRows();
    return form;
}

function createField(
    label: string,
    control: HTMLInputElement | HTMLSelectElement,
): HTMLLabelElement {
    const field = document.createElement('label');
    const text = document.createElement('span');
    text.textContent = label;
    field.className = 'stylus-field';
    field.append(text, control);
    return field;
}

function createSelect(
    choices: readonly [string, string][],
    value: string,
): HTMLSelectElement {
    const select = document.createElement('select');
    for (const [id, label] of choices) select.add(new Option(label, id));
    select.value = value;
    return select;
}

function createButton(
    label: string,
    type: 'button' | 'submit' = 'button',
): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = type;
    button.textContent = label;
    return button;
}
