import { globSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { type DocumentationExample } from './types.js';

/** Extract independently compiled TypeScript Markdown fences without writing generated files. */
export function extractExamples(
    markdownFile: string,
    markdown: string,
): DocumentationExample[] {
    const examples: DocumentationExample[] = [];
    for (const match of markdown.matchAll(
        /^```(?:ts|typescript)[ \t]*\r?\n([\s\S]*?)^```[ \t]*\r?$/gm,
    )) {
        examples.push({
            fileName: resolve(
                dirname(markdownFile),
                `.${basename(markdownFile)}.example-${examples.length + 1}.ts`,
            ),
            source: match[1] ?? '',
            markdownFile,
            markdown,
            offset: match.index + match[0].indexOf('\n') + 1,
        });
    }
    return examples;
}

/** Typecheck actual documentation fences and map errors back to their Markdown line numbers. */
export function checkExamples(
    examples: DocumentationExample[],
    options: ts.CompilerOptions,
): readonly ts.Diagnostic[] {
    const files = new Map(
        examples.map((example) => [resolve(example.fileName), example]),
    );
    const host = ts.createCompilerHost(options);
    const getSourceFile = host.getSourceFile.bind(host);
    const doesFileExist = host.fileExists.bind(host);
    const readFile = host.readFile.bind(host);
    host.fileExists = (fileName) =>
        files.has(resolve(fileName)) || doesFileExist(fileName);
    host.readFile = (fileName) =>
        files.get(resolve(fileName))?.source ?? readFile(fileName);
    host.getSourceFile = (
        fileName,
        languageVersion,
        onError,
        shouldCreateNewSourceFile,
    ) => {
        const example = files.get(resolve(fileName));
        return example
            ? ts.createSourceFile(
                  fileName,
                  example.source,
                  languageVersion,
                  true,
              )
            : getSourceFile(
                  fileName,
                  languageVersion,
                  onError,
                  shouldCreateNewSourceFile,
              );
    };
    const program = ts.createProgram(
        [...files.keys()],
        {
            ...options,
            noEmit: true,
            moduleDetection: ts.ModuleDetectionKind.Force,
        },
        host,
    );
    return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
        const example =
            diagnostic.file && files.get(resolve(diagnostic.file.fileName));
        if (!example) return diagnostic;
        return {
            ...diagnostic,
            file: ts.createSourceFile(
                example.markdownFile,
                example.markdown,
                ts.ScriptTarget.Latest,
            ),
            start: example.offset + (diagnostic.start ?? 0),
        };
    });
}

if (
    process.argv[1] &&
    pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    const config = ts.getParsedCommandLineOfConfigFile(
        resolve(root, 'packages/foundry-core/tsconfig.json'),
        {},
        {
            ...ts.sys,
            onUnRecoverableConfigFileDiagnostic(diagnostic) {
                throw new Error(
                    ts.flattenDiagnosticMessageText(
                        diagnostic.messageText,
                        '\n',
                    ),
                );
            },
        },
    );
    if (!config || config.errors.length)
        throw new Error('Cannot read the examples compiler configuration.');
    const examples = globSync(
        ['README.md', 'packages/*/README.md', 'docs/**/*.md'],
        {
            cwd: root,
        },
    ).flatMap((fileName) => {
        const path = resolve(root, fileName);
        return extractExamples(path, readFileSync(path, 'utf8'));
    });
    if (!examples.length)
        throw new Error('No TypeScript documentation examples found.');
    const diagnostics = checkExamples(examples, config.options);
    if (diagnostics.length) {
        console.error(
            ts.formatDiagnosticsWithColorAndContext(diagnostics, {
                getCanonicalFileName: (name) => name,
                getCurrentDirectory: () => root,
                getNewLine: () => '\n',
            }),
        );
        process.exitCode = 1;
    } else
        console.log(
            `Checked ${examples.length} TypeScript documentation examples.`,
        );
}
