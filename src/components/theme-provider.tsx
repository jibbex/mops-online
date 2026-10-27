/**
 * Application theme provider.
 *
 * Owns the persisted appearance preference and applies it to the document root.
 * Context and hook live in `theme-context.ts`; this module exports only the
 * provider component.
 *
 * @module components/theme-provider
 */

import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import {
    ACCENT_STORAGE_KEY,
    applyTheme,
    readStoredValue,
    ThemeContext,
    THEME_STORAGE_KEY,
    type Accent,
    type Theme,
} from './theme-context';

/**
 * Provides theme state to the application.
 *
 * @param children Application subtree.
 * @returns The context provider element.
 */
export function ThemeProvider({
    children,
}: {
    readonly children: ReactNode;
}): ReactElement {
    const [theme, setTheme] = useState<Theme>(() =>
        readStoredValue(
            THEME_STORAGE_KEY,
            ['light', 'dark', 'system'],
            'system',
        ),
    );
    const [accent, setAccent] = useState<Accent>(() =>
        readStoredValue(
            ACCENT_STORAGE_KEY,
            ['blue', 'emerald', 'violet'],
            'blue',
        ),
    );

    useEffect(() => {
        applyTheme(theme, accent);

        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
            localStorage.setItem(ACCENT_STORAGE_KEY, accent);
        } catch {
            // Storage can be unavailable; the active theme still applies.
        }

        if (theme !== 'system') {
            return;
        }

        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = (): void => applyTheme(theme, accent);

        media.addEventListener('change', onChange);

        return () => media.removeEventListener('change', onChange);
    }, [theme, accent]);

    return (
        <ThemeContext.Provider value={{ theme, accent, setTheme, setAccent }}>
            {children}
        </ThemeContext.Provider>
    );
}
