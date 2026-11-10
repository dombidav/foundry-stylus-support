import { SettingsUtils } from '@template/foundry-core';
import { MODULE_ID } from './module-id.ts';

export const verbose = SettingsUtils.withVerboseMode({ prefix: MODULE_ID });

export const settings = SettingsUtils.create(MODULE_ID, {
    ...verbose.schema,
    stylusBindings: { scope: 'client', isHidden: true, default: '[]' },
    swipeOverride: { scope: 'client', isHidden: true, default: '' },
});
