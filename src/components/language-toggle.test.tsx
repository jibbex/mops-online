import { LanguageProvider } from '@/i18n/i18n-provider';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LanguageToggle } from './language-toggle';

describe('LanguageToggle', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.lang = 'en';
    });

    afterEach(() => {
        cleanup();
    });

    it('switches the interface language and persists it', async () => {
        const user = userEvent.setup();

        render(
            <LanguageProvider>
                <LanguageToggle />
            </LanguageProvider>,
        );

        await user.click(
            screen.getByRole('button', { name: 'Language settings' }),
        );
        await user.click(
            screen.getByRole('menuitemradio', { name: 'Deutsch' }),
        );

        expect(document.documentElement.lang).toBe('de');
        expect(localStorage.getItem('mops-language')).toBe('de');
        expect(
            screen.getByRole('button', { name: 'Sprache' }),
        ).toBeInTheDocument();
    });
});
