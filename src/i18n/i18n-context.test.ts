// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
    createTranslator,
    isLanguage,
    languageFromTag,
    LANGUAGE_STORAGE_KEY,
    readInitialLanguage,
    useI18n,
} from './i18n-context';

describe('i18n context', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('recognizes supported language codes', () => {
        expect(isLanguage('en')).toBe(true);
        expect(isLanguage('de')).toBe(true);
        expect(isLanguage('fr')).toBe(false);
        expect(isLanguage(null)).toBe(false);
    });

    it('maps browser tags to supported languages', () => {
        expect(languageFromTag('de-DE')).toBe('de');
        expect(languageFromTag('de')).toBe('de');
        expect(languageFromTag('en-US')).toBe('en');
        expect(languageFromTag('fr-FR')).toBe('en');
    });

    it('prefers the URL language over stored preferences', () => {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, 'de');

        expect(readInitialLanguage('?lang=en')).toBe('en');
    });

    it('falls back to the stored language', () => {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, 'de');

        expect(readInitialLanguage('')).toBe('de');
    });

    it('falls back to English for an English browser', () => {
        expect(readInitialLanguage('')).toBe('en');
    });

    it('creates a translator with interpolation', () => {
        const t = createTranslator('de');

        expect(t('editor.lines', { count: 3 })).toBe('3 Zeilen');
        expect(t('toolbar.start')).toBe('Start');
    });

    it('rejects use outside the provider', () => {
        expect(() => renderHook(() => useI18n())).toThrow(
            'useI18n must be used within LanguageProvider.',
        );
    });
});
