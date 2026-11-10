import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import ts from 'typescript';
import { getBooleanNameDiagnostics } from '../check-boolean-names.ts';

it('checks inferred flags, callbacks, async predicates and declarations while preserving explicit contract exceptions', () => {
    const fileName = resolve('.tmp/boolean-names-fixture.ts');
    const source = `
    const isEnabled = true;
    const IS_READY = false;
    const enabled = true;
    const island = true;
    const maybe: boolean | undefined = undefined;
    const mixed: boolean | string = '';
    const callback = () => true;
    const hasResult = async () => true;
    function check() { return true; }
    async function load() { return false; }
    function update(active: boolean) {}
    const { visible } = { visible: true };
    interface Flags { ready?: boolean; isReady: boolean; }
    interface Native {
      // boolean-name-exempt: Native external API requires this property name.
      active: boolean;
    }
    const payload = { active: true, testUserPermission() { return true; } };
    // boolean-name-exempt: Established external API requires this function name.
    function legacy() { return true; }
    const cancel = (): boolean | void => {};
  `;
    const host = ts.createCompilerHost({ strict: true });
    const getSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (
        path,
        languageVersion,
        onError,
        shouldCreateNewSourceFile,
    ) =>
        resolve(path) === fileName
            ? ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
            : getSourceFile(
                  path,
                  languageVersion,
                  onError,
                  shouldCreateNewSourceFile,
              );
    const program = ts.createProgram([fileName], { strict: true }, host);
    const names = getBooleanNameDiagnostics(program).map((diagnostic) =>
        diagnostic.file?.text.slice(
            diagnostic.start,
            (diagnostic.start ?? 0) + (diagnostic.length ?? 0),
        ),
    );
    expect(names).toEqual([
        'enabled',
        'island',
        'maybe',
        'callback',
        'check',
        'load',
        'active',
        'visible',
        'ready',
    ]);
});
