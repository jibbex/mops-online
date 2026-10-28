import { ThemeProvider } from '@/components/theme-provider';
import { LanguageProvider } from '@/i18n/i18n-provider';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './app';

describe('App', () => {
    it('renders the application heading', () => {
        render(
            <ThemeProvider>
                <LanguageProvider>
                    <App />
                </LanguageProvider>
            </ThemeProvider>,
        );

        expect(
            screen.getByRole('heading', { name: 'MOPS' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Assemble' }),
        ).toBeInTheDocument();
        expect(screen.getByTestId('app-version')).toHaveTextContent(
            /^v\d+\.\d+\.\d+$/,
        );

        const repository = screen.getByRole('link', {
            name: 'GitHub repository',
        });

        expect(repository).toHaveAttribute(
            'href',
            'https://github.com/jibbex/mops-online',
        );
        expect(repository).toHaveAttribute('target', '_blank');
    });
});
