/**
 * Language context and translation helpers.
 *
 * This module contains no JSX so components and hooks can import the context
 * without turning it into a React Fast Refresh boundary.
 *
 * @module i18n/i18n-context
 */

import { createContext, useContext } from 'react';
import {
    interpolate,
    LANGUAGES,
    messages,
    type Language,
    type MessageKey,
} from './messages';

/** Placeholder values accepted by translated messages. */
export type TranslationParams = Readonly<Record<string, string | number>>;

/** Translation function exposed to components. */
export type Translate = (key: MessageKey, params?: TranslationParams) => string;

/** Language state shared by the application. */
export interface I18nContextValue {
    readonly language: Language;
    readonly setLanguage: (language: Language) => void;
    readonly t: Translate;
}

/** Storage key for the persisted language preference. */
export const LANGUAGE_STORAGE_KEY = 'mops-language';

/** Language context; consumed through {@link useI18n}. */
export const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Returns whether a value is a supported language code.
 *
 * @param value Candidate language code.
 * @returns True for `en` and `de`.
 */
export function isLanguage(value: unknown): value is Language {
    return typeof value === 'string' && LANGUAGES.includes(value as Language);
}

/**
 * Maps a browser language tag to a supported language.
 *
 * @param languageTag Browser language tag such as `de-DE`.
 * @returns German for German tags, otherwise English.
 */
export function languageFromTag(languageTag: string): Language {
    return languageTag.toLowerCase().startsWith('de') ? 'de' : 'en';
}

/**
 * Resolves the startup language from the URL, storage, and browser.
 *
 * The `lang` query parameter has the highest priority so Moodle links can
 * force a language. A stored preference wins over the browser default.
 *
 * @param search URL search string, including the leading `?`.
 * @returns The initial language.
 */
export function readInitialLanguage(search: string): Language {
    const requested = new URLSearchParams(search).get('lang');

    if (isLanguage(requested)) {
        return requested;
    }

    try {
        const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);

        if (isLanguage(stored)) {
            return stored;
        }
    } catch {
        // Storage can be unavailable; fall back to the browser language.
    }

    return languageFromTag(navigator.language);
}

/**
 * Creates a translator for one language.
 *
 * @param language Active language.
 * @returns A function that resolves and interpolates message keys.
 */
export function createTranslator(language: Language): Translate {
    const table = messages[language];

    return (key, params) => interpolate(table[key], params);
}

/**
 * Returns the active language context.
 *
 * @returns Language, setter, and translator.
 * @throws When called outside an {@link I18nContext} provider.
 */
export function useI18n(): I18nContextValue {
    const context = useContext(I18nContext);

    if (!context) {
        throw new Error('useI18n must be used within LanguageProvider.');
    }

    return context;
}
