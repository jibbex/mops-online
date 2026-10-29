import type { AssembleWarning, Diagnostic } from '@/core/assembler';
import { LanguageProvider } from '@/i18n/i18n-provider';
import { usePlayer } from '@/player/player';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Diagnostics } from './diagnostics';

const ERROR: Diagnostic = {
    line: 1,
    column: 0,
    length: 5,
    severity: 'error',
    code: 'missing-operand',
    message: 'Operand is missing.',
};

const WARNING: AssembleWarning = {
    line: 2,
    column: 0,
    length: 4,
    severity: 'warning',
    code: 'unused-label',
    message: 'Label is unused.',
};

beforeEach(() => {
    localStorage.clear();
    usePlayer.setState(usePlayer.getInitialState());
});

afterEach(() => {
    cleanup();
    usePlayer.setState(usePlayer.getInitialState());
});

describe('Diagnostics', () => {
    it('renders an error with its source line', () => {
        usePlayer.setState({ diagnostics: [ERROR] });

        render(
            <LanguageProvider>
                <Diagnostics />
            </LanguageProvider>,
        );

        expect(
            screen.getByText('Line 1: Operand is missing.'),
        ).toBeInTheDocument();
    });

    it('translates a diagnostic by its stable code', () => {
        localStorage.setItem('mops-language', 'de');
        usePlayer.setState({ diagnostics: [ERROR] });

        render(
            <LanguageProvider>
                <Diagnostics />
            </LanguageProvider>,
        );

        expect(screen.getByText('Zeile 1: Operand fehlt.')).toBeInTheDocument();
    });

    it('renders warnings without using the destructive variant', () => {
        usePlayer.setState({ warnings: [WARNING] });

        render(
            <LanguageProvider>
                <Diagnostics />
            </LanguageProvider>,
        );

        expect(
            screen.getByText('Line 2: Label is unused.'),
        ).toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveAttribute('data-slot', 'alert');
    });

    it('renders nothing without messages', () => {
        const { container } = render(
            <LanguageProvider>
                <Diagnostics />
            </LanguageProvider>,
        );

        expect(container).toBeEmptyDOMElement();
    });
});
