/**
 * Vite, React, Tailwind, and Vitest configuration.
 *
 * @module vite.config
 */

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

const packageJson = JSON.parse(
    readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

export default defineConfig({
    // GitHub Pages builds set this to the repository base path.
    base: process.env.VITE_BASE_PATH ?? '/',
    define: {
        __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    build: {
        rolldownOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        {
                            name: 'codemirror',
                            test: /node_modules[\\/](?:@codemirror|@lezer|codemirror)[\\/]/,
                            priority: 30,
                        },
                        {
                            name: 'react',
                            test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
                            priority: 20,
                        },
                        {
                            name: 'ui',
                            test: /node_modules[\\/](?:@radix-ui|radix-ui|lucide-react|class-variance-authority)[\\/]/,
                            priority: 10,
                        },
                        {
                            name: 'vendor',
                            test: /node_modules[\\/]/,
                            priority: 0,
                        },
                    ],
                },
            },
        },
    },
    test: {
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
        include: ['src/**/*.test.{ts,tsx}'],
        css: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/*.test.{ts,tsx}',
                'src/components/ui/**',
                'src/main.tsx',
                'src/test/**',
                'src/vite-env.d.ts',
                // Type-only declarations and pure re-export barrels contain
                // no executable statements to measure.
                'src/core/isa/execution.ts',
                'src/core/isa/index.ts',
                'src/core/object/index.ts',
                'src/core/vm/index.ts',
            ],
            thresholds: {
                statements: 100,
                branches: 100,
                functions: 100,
                lines: 100,
            },
        },
    },
});
