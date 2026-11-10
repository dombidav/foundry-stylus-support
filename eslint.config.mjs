import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier/recommended';

export default [
    {
        ignores: [
            '**/node_modules/**',
            'dist/**',
            'coverage/**',
            'releases/**',
            '.tmp/**',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        rules: {
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
            ],
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'ImportDeclaration[importKind="type"]',
                    message: 'Use inline import { type SomeType } syntax.',
                },
            ],
        },
    },
    {
        files: ['**/*.ts'],
        ignores: ['**/*.d.ts'],
        rules: {
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'ImportDeclaration[importKind="type"]',
                    message: 'Use inline import { type SomeType } syntax.',
                },
                {
                    selector: 'TSInterfaceDeclaration',
                    message: 'Declare interfaces in dedicated .d.ts files.',
                },
                {
                    selector: 'TSTypeAliasDeclaration',
                    message: 'Declare types in dedicated .d.ts files.',
                },
            ],
        },
    },
    prettier,
];
