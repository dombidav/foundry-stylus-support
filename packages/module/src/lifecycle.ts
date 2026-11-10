import { settings, stylusDiagnostics, verbose } from './settings.ts';
import { registerStylusSettingsMenu } from './features/stylus/configuration.ts';
import {
    refreshStylusBindings,
    startStylus,
} from './features/stylus/stylus.ts';

/** Register module settings during Foundry initialization. */
export function onInit(): void {
    settings.register();
    registerStylusSettingsMenu(refreshStylusBindings);
}

/** Initialize the verbose cache after saved settings become available. */
export function onSetup(): void {
    verbose.initialize(settings.get('isVerbose'));
    stylusDiagnostics.record('stylus', 'loaded');
}

/** Mount stylus controls after the D&D world is ready. */
export function onReady(): void {
    if (game.system.id !== 'dnd5e') return;
    startStylus();
}
