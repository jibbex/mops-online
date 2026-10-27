/**
 * Application language provider.
 *
 * Owns the persisted language preference and keeps the document language in
 * sync. Context and helpers live in `i18n-context.ts`; this module exports only
 * the provider component.
 *
 * @module i18n/i18n-provider
 */

import {
    useEffect,
    useMemo,
    useState,
    type ReactElement,
    type ReactNode,
} from 'react';
import {
    createTranslator,
    I18nContext,
    LANGUAGE_STORAGE_KEY,
    readInitialLanguage,
} from './i18n-context';
import type { Language } from './messages';

/**
 * Provides language state to the application.
 *
 * @param children Application subtree.
 * @returns The language context provider element.
 */
export function LanguageProvider({
    children,
}: {
    readonly children: ReactNode;
}): ReactElement {
    const [language, setLanguage] = useState<Language>(() =>
        readInitialLanguage(window.location.search),
    );

    useEffect(() => {
        document.documentElement.lang = language;

        try {
            localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
        } catch {
            // Storage can be unavailable; the active language still applies.
        }
    }, [language]);

    const value = useMemo(
        () => ({
            language,
            setLanguage,
            t: createTranslator(language),
        }),
        [language],
    );

    return (
        <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
    );
}
