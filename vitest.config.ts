import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: [
            'packages/*/tests/**/*.test.ts',
            'scripts/*/tests/**/*.test.ts',
        ],
        clearMocks: true,
        restoreMocks: true,
        unstubGlobals: true,
    },
});
