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
    applyTheme,
    readStoredValue,
    ThemeContext,
    THEME_STORAGE_KEY,
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

    useEffect(() => {
        applyTheme(theme);

        try {
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch {
            // Storage can be unavailable; the active theme still applies.
        }

        if (theme !== 'system') {
            return;
        }

        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = (): void => applyTheme(theme);

        media.addEventListener('change', onChange);

        return () => media.removeEventListener('change', onChange);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
