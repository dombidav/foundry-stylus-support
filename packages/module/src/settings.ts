import { SettingsUtils } from '@template/foundry-core';
import { MODULE_ID } from './module-id.ts';

export const verbose = SettingsUtils.withVerboseMode({ prefix: MODULE_ID });

export const settings = SettingsUtils.create(MODULE_ID, {
    ...verbose.schema,
    testChoice: {
        name: 'Test choice',
        hint: 'Select an option for the Hello World example.',
        scope: 'world',
        default: 'first',
        choices: {
            first: 'First option',
            second: 'Second option',
            third: 'Third option',
        },
    },
    testInteger: {
        name: 'Test integer',
        hint: 'Select a whole number from 0 to 10.',
        scope: 'world',
        default: 5,
        range: { min: 0, max: 10, step: 1 },
    },
});
