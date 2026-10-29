import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { THEME_STORAGE_KEY, useTheme } from './theme-context';
import { ThemeProvider } from './theme-provider';

function Consumer(): ReactElement {
    const { theme, setTheme } = useTheme();

    return (
        <button type="button" onClick={() => setTheme('dark')}>
            {theme}
        </button>
    );
}

function renderProvider() {
    return render(
        <ThemeProvider>
            <Consumer />
        </ThemeProvider>,
    );
}

beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('ThemeProvider', () => {
    it('persists and applies a selected theme', async () => {
        const user = userEvent.setup();

        renderProvider();

        const toggle = screen.getByRole('button');
        expect(toggle).toHaveTextContent('system');
        expect(document.documentElement.classList.contains('dark')).toBe(false);

        await user.click(toggle);

        expect(toggle).toHaveTextContent('dark');
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('keeps the active theme when storage writes fail', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('Storage is blocked.');
        });

        renderProvider();

        expect(screen.getByRole('button')).toHaveTextContent('system');
    });

    it('reapplies the system theme when the preference changes', () => {
        let change: (() => void) | undefined;
        const media = {
            matches: false,
            addEventListener: vi.fn((_event: string, handler: () => void) => {
                change = handler;
            }),
            removeEventListener: vi.fn(),
        };

        vi.stubGlobal(
            'matchMedia',
            vi.fn(() => media),
        );

        renderProvider();

        expect(document.documentElement.classList.contains('dark')).toBe(false);

        media.matches = true;
        change?.();

        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
});
