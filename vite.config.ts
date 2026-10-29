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
            ],
            thresholds: {
                statements: 90,
                branches: 80,
                functions: 90,
                lines: 90,
                'src/core/assembler/**': {
                    statements: 95,
                    branches: 85,
                    functions: 100,
                    lines: 95,
                },
                'src/core/isa/**': {
                    statements: 94,
                    branches: 85,
                    functions: 100,
                    lines: 94,
                },
                'src/core/object/**': {
                    statements: 95,
                    branches: 90,
                    functions: 100,
                    lines: 95,
                },
                'src/core/vm/**': {
                    statements: 89,
                    branches: 84,
                    functions: 100,
                    lines: 89,
                },
                'src/player/**': {
                    statements: 90,
                    branches: 80,
                    functions: 100,
                    lines: 90,
                },
                'src/lib/**': {
                    statements: 95,
                    branches: 90,
                    functions: 95,
                    lines: 95,
                },
                'src/components/source-file-dialog.tsx': {
                    statements: 90,
                    branches: 85,
                    functions: 85,
                    lines: 90,
                },
                'src/components/mops-editor.tsx': {
                    statements: 80,
                    branches: 70,
                    functions: 85,
                    lines: 80,
                },
                'src/components/app-toolbar.tsx': {
                    statements: 88,
                    branches: 80,
                    functions: 90,
                    lines: 88,
                },
            },
        },
    },
});
