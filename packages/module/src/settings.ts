import { SettingsUtils } from '@template/foundry-core';
import { createStylusDiagnostics } from './features/stylus/diagnostics.ts';
import { MODULE_ID } from './module-id.ts';

export const verbose = SettingsUtils.withVerboseMode({ prefix: MODULE_ID });
export const stylusDiagnostics = createStylusDiagnostics(verbose);

export const settings = SettingsUtils.create(MODULE_ID, {
    ...verbose.schema,
    isVerbose: {
        ...verbose.schema.isVerbose,
        hint: 'Record stylus diagnostics in the browser console and in memory for JSON export.',
    },
    stylusBindings: { scope: 'client', isHidden: true, default: '[]' },
    swipeOverride: { scope: 'client', isHidden: true, default: '' },
});
