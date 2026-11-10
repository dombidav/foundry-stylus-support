import { expectTypeOf, it } from 'vitest';
import { settings } from '../src/settings.ts';
import { type SettingsValuesOf } from '@template/foundry-core';

/** Compile the module's setting value contracts without reading Foundry settings at runtime. */
function verifySettingTypes(): void {
    expectTypeOf(settings.get('testChoice')).toEqualTypeOf<
        'first' | 'second' | 'third'
    >();
    expectTypeOf(settings.get('testInteger')).toEqualTypeOf<number>();
    expectTypeOf<
        SettingsValuesOf<typeof settings>['testChoice']
    >().toEqualTypeOf<'first' | 'second' | 'third'>();
    settings.set('testChoice', 'second');
    // @ts-expect-error Only declared choices can be assigned.
    settings.set('testChoice', 'fourth');
}

it('infers the example choice union without literal assertions or explicit generic arguments', () => {
    expectTypeOf(verifySettingTypes).returns.toEqualTypeOf<void>();
});
