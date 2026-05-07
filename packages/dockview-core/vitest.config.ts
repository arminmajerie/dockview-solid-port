import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: [
            resolve(currentDir, 'src/__tests__/__mocks__/resizeObserver.js'),
            resolve(currentDir, '../../jest-setup.ts'),
        ],
        coverage: {
            provider: 'v8',
            reportsDirectory: resolve(currentDir, 'coverage'),
            include: ['src/**/*.{js,jsx,ts,tsx}'],
            exclude: [
                'src/__tests__/__mocks__/**',
                'src/__tests__/__test_utils__/**',
            ],
        },
    },
});