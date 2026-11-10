import { expectTypeOf, it } from 'vitest';
import { settings } from '../src/settings.ts';
import { type SettingsValuesOf } from '@template/foundry-core';

/** Compile the module's setting value contracts without reading Foundry settings at runtime. */
function verifySettingTypes(): void {
    expectTypeOf(settings.get('stylusBindings')).toEqualTypeOf<string>();
    expectTypeOf(settings.get('swipeOverride')).toEqualTypeOf<string>();
    expectTypeOf<
        SettingsValuesOf<typeof settings>['isVerbose']
    >().toEqualTypeOf<boolean>();
    void settings.set('stylusBindings', '[]');
}

it('widens serialized client settings to strings', () => {
    expectTypeOf(verifySettingTypes).returns.toEqualTypeOf<void>();
});
