import { createCpu } from '@/core/vm';
import { createTrap } from '@/core/vm/traps';
import { LanguageProvider } from '@/i18n/i18n-provider';
import { usePlayer } from '@/player/player';
import { createObjectProgramFixture } from '@/test/object-program-fixture';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StatusBar } from './status-bar';

beforeEach(() => {
    localStorage.clear();
    usePlayer.setState(usePlayer.getInitialState());
});

afterEach(() => {
    cleanup();
    usePlayer.setState(usePlayer.getInitialState());
});

describe('StatusBar', () => {
    it('shows the finished state with the final registers', () => {
        const cpu = {
            ...createCpu(createObjectProgramFixture()),
            ac: 8,
            aus: 8,
            pc: 2,
            decoded: 'end',
        };

        usePlayer.setState({ status: 'finished', cpu });

        render(
            <LanguageProvider>
                <StatusBar currentLine={3} />
            </LanguageProvider>,
        );

        expect(screen.getByTestId('status-status')).toHaveTextContent(
            'Finished',
        );
        expect(screen.getByTestId('status-ac')).toHaveTextContent('00008');
        expect(screen.getByTestId('status-aus')).toHaveTextContent('00008');
        expect(screen.getByTestId('status-pc')).toHaveTextContent('02');
        expect(screen.getByTestId('status-line')).toHaveTextContent('3');
        expect(screen.getByTestId('status-decoded')).toHaveTextContent('end');
    });

    it('updates the program counter when the CPU state changes', () => {
        const cpu = createCpu(createObjectProgramFixture());

        usePlayer.setState({ status: 'paused', cpu });

        render(
            <LanguageProvider>
                <StatusBar />
            </LanguageProvider>,
        );

        expect(screen.getByTestId('status-pc')).toHaveTextContent('00');

        act(() => {
            usePlayer.setState({ cpu: { ...cpu, pc: 1 } });
        });

        expect(screen.getByTestId('status-pc')).toHaveTextContent('01');
    });

    it('shows a runtime trap', () => {
        usePlayer.setState({
            status: 'error',
            trap: createTrap('DIVISION_BY_ZERO', 'Division by zero.'),
        });

        render(
            <LanguageProvider>
                <StatusBar />
            </LanguageProvider>,
        );

        expect(screen.getByText(/DIVISION_BY_ZERO/)).toBeInTheDocument();
        expect(screen.getByText(/Division by zero\./)).toBeInTheDocument();
    });
});
