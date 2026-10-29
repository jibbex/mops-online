import { LanguageProvider } from '@/i18n/i18n-provider';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeProvider } from './theme-provider';
import { ThemeToggle } from './theme-toggle';

function renderToggle() {
    render(
        <ThemeProvider>
            <LanguageProvider>
                <ThemeToggle />
            </LanguageProvider>
        </ThemeProvider>,
    );
}

describe('ThemeToggle', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('dark');
    });

    afterEach(() => {
        cleanup();
    });

    it('applies and persists the dark theme', async () => {
        const user = userEvent.setup();

        renderToggle();

        await user.click(
            screen.getByRole('button', { name: 'Theme settings' }),
        );
        await user.click(screen.getByRole('menuitemradio', { name: 'Dark' }));

        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(localStorage.getItem('mops-theme')).toBe('dark');
    });

    it('returns to the system theme', async () => {
        const user = userEvent.setup();

        localStorage.setItem('mops-theme', 'dark');
        renderToggle();

        await user.click(
            screen.getByRole('button', { name: 'Theme settings' }),
        );
        await user.click(screen.getByRole('menuitemradio', { name: 'System' }));

        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(localStorage.getItem('mops-theme')).toBe('system');
    });
});
