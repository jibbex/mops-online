/**
 * Vite, React, Tailwind, and Vitest configuration.
 *
 * @module vite.config
 */

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
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
    },
});
