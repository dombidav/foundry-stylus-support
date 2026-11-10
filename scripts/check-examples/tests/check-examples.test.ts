import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import ts from 'typescript';
import { checkExamples, extractExamples } from '../check-examples.ts';

it('extracts both TypeScript fence labels with original CRLF offsets and skips other languages', () => {
    const fileName = resolve('.tmp/README.md');
    const markdown =
        '# Examples\r\n\r\n```sh\r\nnpm run check\r\n```\r\n```ts\r\nconst count = 1;\r\n```\r\n```typescript\r\nconst count = 2;\r\n```\r\n';
    const examples = extractExamples(fileName, markdown);
    expect(examples).toHaveLength(2);
    expect(examples[0]?.source).toBe('const count = 1;\r\n');
    expect(examples[1]?.source).toBe('const count = 2;\r\n');
    for (const example of examples) {
        expect(
            markdown.slice(
                example.offset,
                example.offset + example.source.length,
            ),
        ).toBe(example.source);
    }
});

it('compiles independent examples and reports a changed API call at the README location', () => {
    const fileName = resolve('.tmp/README.md');
    const markdown =
        '```ts\nconst count = 1;\n```\n\n```ts\nconst count = 2;\n```\n\n```ts\nfunction set(value: boolean): void {}\nset("wrong");\n```\n';
    const diagnostics = checkExamples(extractExamples(fileName, markdown), {
        target: ts.ScriptTarget.ES2023,
        module: ts.ModuleKind.ESNext,
        strict: true,
        types: [],
        skipLibCheck: true,
    });
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe(2345);
    const diagnostic = diagnostics[0];
    expect(resolve(diagnostic?.file?.fileName ?? '')).toBe(fileName);
    expect(
        diagnostic?.file?.getLineAndCharacterOfPosition(diagnostic.start ?? 0)
            .line,
    ).toBe(10);
});
