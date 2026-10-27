/**
 * Shared theme context and hook.
 *
 * This module contains no JSX so it can be imported by components and hooks
 * without being treated as a component module by React Fast Refresh.
 *
 * @module components/theme-context
 */

import { createContext, useContext } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
    readonly theme: Theme;
    readonly setTheme: (theme: Theme) => void;
}

export const THEME_STORAGE_KEY = 'mops-theme';

export const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Returns whether the operating system currently prefers a dark appearance.
 *
 * @returns True when the media query matches.
 */
export function prefersDark(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Applies the selected theme to the document root.
 *
 * @param theme Selected appearance.
 */
export function applyTheme(theme: Theme): void {
    const root = document.documentElement;

    root.classList.toggle(
        'dark',
        theme === 'dark' || (theme === 'system' && prefersDark()),
    );
}

/**
 * Reads a persisted theme preference.
 *
 * @param key Storage key.
 * @param allowed Accepted values.
 * @param fallback Value used when storage is unavailable or invalid.
 * @returns The stored value or the fallback.
 */
export function readStoredValue<T extends string>(
    key: string,
    allowed: readonly T[],
    fallback: T,
): T {
    try {
        const value = localStorage.getItem(key);
        return allowed.includes(value as T) ? (value as T) : fallback;
    } catch {
        return fallback;
    }
}

/**
 * Returns the active theme context.
 *
 * @returns Theme and setter.
 * @throws When called outside a {@link ThemeContext} provider.
 */
export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider.');
    }

    return context;
}
