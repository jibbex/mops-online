import { LanguageProvider } from '@/i18n/i18n-provider';
import { usePlayer } from '@/player/player';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InputDialog } from './input-dialog';

beforeEach(() => {
    localStorage.clear();
    usePlayer.setState(usePlayer.getInitialState());
});

afterEach(() => {
    cleanup();
    usePlayer.setState(usePlayer.getInitialState());
});

describe('InputDialog', () => {
    it('rejects values outside the word range', () => {
        const provideInput = vi.fn();

        usePlayer.setState({ status: 'waiting-input', provideInput });

        render(
            <LanguageProvider>
                <InputDialog />
            </LanguageProvider>,
        );

        const input = screen.getByLabelText('Input value');
        const form = input.closest('form');

        expect(form).not.toBeNull();

        fireEvent.change(input, { target: { value: '10000' } });
        fireEvent.submit(form as HTMLFormElement);

        expect(
            screen.getByText('Enter an integer from -9999 to 9999.'),
        ).toBeInTheDocument();
        expect(provideInput).not.toHaveBeenCalled();
    });

    it('rejects non-integer numeric input', () => {
        const provideInput = vi.fn();

        usePlayer.setState({ status: 'waiting-input', provideInput });

        render(
            <LanguageProvider>
                <InputDialog />
            </LanguageProvider>,
        );

        const input = screen.getByLabelText('Input value');
        const form = input.closest('form');

        expect(form).not.toBeNull();

        for (const value of ['3.5', '1e3', '12abc', '']) {
            fireEvent.change(input, { target: { value } });
            fireEvent.submit(form as HTMLFormElement);
        }

        expect(
            screen.getByText('Enter an integer from -9999 to 9999.'),
        ).toBeInTheDocument();
        expect(provideInput).not.toHaveBeenCalled();
    });

    it('submits a valid value', () => {
        const provideInput = vi.fn();

        usePlayer.setState({ status: 'waiting-input', provideInput });

        render(
            <LanguageProvider>
                <InputDialog />
            </LanguageProvider>,
        );

        const input = screen.getByLabelText('Input value');
        const form = input.closest('form');

        fireEvent.change(input, { target: { value: '42' } });
        fireEvent.submit(form as HTMLFormElement);

        expect(provideInput).toHaveBeenCalledWith(42);
    });
});
