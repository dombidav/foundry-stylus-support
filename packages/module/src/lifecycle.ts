import { settings, verbose } from './settings.ts';

/** Register module settings during Foundry initialization. */
export function onInit(): void {
    settings.register();
}

/** Initialize the verbose cache after saved settings become available. */
export function onSetup(): void {
    verbose.initialize(settings.get('isVerbose'));
}

/** Run the Hello World example after the D&D world is ready. */
export function onReady(): void {
    if (game.system.id !== 'dnd5e') return;

    ui.notifications.info('Hello World!');
    verbose.debug('Hello World settings', () => ({
        testChoice: settings.get('testChoice'),
        testInteger: settings.get('testInteger'),
    }));
}
