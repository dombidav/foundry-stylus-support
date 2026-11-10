import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const predicatePrefix =
    /^(?:(?:is|are|has|have|should|can|needs|does|did|was|were|will|must|supports|try)(?:[A-Z0-9_]|$)|(?:IS|ARE|HAS|HAVE|SHOULD|CAN|NEEDS|DOES|DID|WAS|WERE|WILL|MUST|SUPPORTS|TRY)(?:_|$))/;

/** Check typed bindings and named boolean functions; literal object keys remain API/data contracts. */
export function getBooleanNameDiagnostics(
    program: ts.Program,
): ts.Diagnostic[] {
    const checker = program.getTypeChecker();
    const diagnostics: ts.Diagnostic[] = [];

    /** Recognize booleans, including optional/nullable values, without treating mixed value unions as flags. */
    function isBooleanType(type: ts.Type): boolean {
        if (
            type.isUnion() &&
            type.types.some((value) => (value.flags & ts.TypeFlags.Void) !== 0)
        )
            return false;
        const value = checker.getNonNullableType(type);
        return value.isUnion()
            ? value.types.every(isBooleanType)
            : (value.flags & ts.TypeFlags.BooleanLike) !== 0;
    }

    /** Recognize exclusively boolean-returning call signatures, including async predicates. */
    function hasBooleanReturn(type: ts.Type): boolean {
        const signatures = type.getCallSignatures();
        return (
            signatures.length > 0 &&
            signatures.every((signature) => {
                const result = checker.getReturnTypeOfSignature(signature);
                return isBooleanType(checker.getAwaitedType(result) ?? result);
            })
        );
    }

    for (const fileName of program.getRootFileNames()) {
        const source = program.getSourceFile(fileName);
        if (!source) continue;
        const text = source.text;

        /** Report a declaration unless an adjacent comment documents a required contract name. */
        function check(name: ts.Node | undefined, declaration: ts.Node): void {
            if (
                !name ||
                !ts.isIdentifier(name) ||
                predicatePrefix.test(name.text)
            )
                return;
            const comments =
                ts.getLeadingCommentRanges(text, declaration.getFullStart()) ??
                [];
            if (
                comments.some((comment) =>
                    /boolean-name-exempt:\s*\S[^\r\n]*/.test(
                        text.slice(comment.pos, comment.end),
                    ),
                )
            )
                return;
            const type = checker.getTypeAtLocation(name);
            if (!isBooleanType(type) && !hasBooleanReturn(type)) return;
            diagnostics.push({
                file: source,
                start: name.getStart(),
                length: name.getWidth(),
                category: ts.DiagnosticCategory.Error,
                code: 90001,
                messageText: `Boolean name '${name.text}' needs a predicate prefix (is, are, has, have, should, can, needs, etc.).`,
            });
        }

        /** Visit declarations while avoiding dependency files and anonymous callbacks. */
        function visit(node: ts.Node): void {
            if (
                ts.isVariableDeclaration(node) ||
                ts.isParameter(node) ||
                ts.isBindingElement(node)
            ) {
                check(
                    node.name,
                    ts.isVariableDeclaration(node) ? node.parent.parent : node,
                );
            } else if (
                ts.isFunctionDeclaration(node) ||
                ts.isFunctionExpression(node) ||
                ts.isMethodSignature(node) ||
                ts.isGetAccessorDeclaration(node) ||
                ts.isPropertySignature(node) ||
                ts.isPropertyDeclaration(node) ||
                (ts.isMethodDeclaration(node) &&
                    !ts.isObjectLiteralExpression(node.parent))
            ) {
                check(node.name, node);
            }
            ts.forEachChild(node, visit);
        }
        visit(source);
    }
    return diagnostics;
}

if (
    process.argv[1] &&
    pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    const configPath = resolve(root, 'tsconfig.lint.json');
    const config = ts.readConfigFile(configPath, ts.sys.readFile);
    if (config.error)
        throw new Error(
            ts.flattenDiagnosticMessageText(config.error.messageText, '\n'),
        );
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
    if (parsed.errors.length)
        throw new Error(
            ts.formatDiagnosticsWithColorAndContext(parsed.errors, {
                getCanonicalFileName: (name) => name,
                getCurrentDirectory: () => root,
                getNewLine: () => '\n',
            }),
        );
    const diagnostics = getBooleanNameDiagnostics(
        ts.createProgram(parsed.fileNames, parsed.options),
    );
    if (diagnostics.length) {
        console.error(
            ts.formatDiagnosticsWithColorAndContext(diagnostics, {
                getCanonicalFileName: (name) => name,
                getCurrentDirectory: () => root,
                getNewLine: () => '\n',
            }),
        );
        process.exitCode = 1;
    } else console.log('Boolean naming checks passed.');
}
