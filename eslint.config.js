/**
 * ESLint flat configuration for TypeScript and React.
 *
 * Formatting belongs to Prettier; ESLint enforces code quality and the curly
 * brace contract.
 *
 * @module eslint.config
 */

import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: [
            'dist',
            'coverage',
            'playwright-report',
            'test-results',
            '.agents',
            'skills-lock.json',
        ],
    },
    {
        files: ['**/*.{js,mjs,cjs}'],
        extends: [js.configs.recommended],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: { ...globals.node },
        },
    },
    {
        files: ['**/*.{ts,tsx}'],
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        languageOptions: {
            ecmaVersion: 2022,
            globals: { ...globals.browser },
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            curly: ['error', 'all'],
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            'react-refresh/only-export-components': 'warn',
        },
    },
    {
        files: ['vite.config.ts', 'playwright.config.ts'],
        languageOptions: {
            globals: { ...globals.node },
        },
    },
    prettier,
);
