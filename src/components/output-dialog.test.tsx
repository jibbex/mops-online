import { LanguageProvider } from '@/i18n/i18n-provider';
import { usePlayer } from '@/player/player';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OutputDialog } from './output-dialog';

beforeEach(() => {
    localStorage.clear();
    usePlayer.setState(usePlayer.getInitialState());
});

afterEach(() => {
    cleanup();
    usePlayer.setState(usePlayer.getInitialState());
});

describe('OutputDialog', () => {
    it('shows the formatted output and confirms it', () => {
        const acknowledgeOutput = vi.fn();

        usePlayer.setState({
            status: 'waiting-output',
            lastOutput: 42,
            acknowledgeOutput,
        });

        render(
            <LanguageProvider>
                <OutputDialog />
            </LanguageProvider>,
        );

        expect(
            screen.getByRole('heading', { name: 'Program output' }),
        ).toBeInTheDocument();
        expect(screen.getByTestId('output-value')).toHaveTextContent('00042');

        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

        expect(acknowledgeOutput).toHaveBeenCalledTimes(1);
    });
});
