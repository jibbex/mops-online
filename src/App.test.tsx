import { ThemeProvider } from '@/components/theme-provider';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
    it('renders the application heading', () => {
        render(
            <ThemeProvider>
                <App />
            </ThemeProvider>,
        );

        expect(
            screen.getByRole('heading', { name: 'MOPS' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Assemble' }),
        ).toBeInTheDocument();
    });
});
