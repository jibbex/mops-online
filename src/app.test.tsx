import { ThemeProvider } from '@/components/theme-provider';
import { stepCpu, createCpu } from '@/core/vm';
import { LanguageProvider } from '@/i18n/i18n-provider';
import { usePlayer } from '@/player/player';
import { TOUR_STORAGE_KEY } from '@/tour/tour-storage';
import { useTour } from '@/tour/tour-store';
import { createObjectProgramFixture } from '@/test/object-program-fixture';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './app';

function renderApp() {
    return render(
        <ThemeProvider>
            <LanguageProvider>
                <App />
            </LanguageProvider>
        </ThemeProvider>,
    );
}

beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(TOUR_STORAGE_KEY, '1');
    usePlayer.setState(usePlayer.getInitialState());
    useTour.setState({ stepId: null, started: false });
});

afterEach(() => {
    cleanup();
    usePlayer.setState(usePlayer.getInitialState());
    useTour.setState({ stepId: null, started: false });
});

describe('App', () => {
    it('renders the application heading', () => {
        renderApp();

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

    it('renders the running machine state with the current source line', () => {
        const program = createObjectProgramFixture();
        const cpu = createCpu(program);
        const result = stepCpu(cpu);

        if (result.kind !== 'step') {
            throw new Error('Expected a VM step.');
        }

        usePlayer.setState({
            program,
            cpu: result.state,
            lastEvent: result.event,
            status: 'running',
            speed: 0,
        });

        renderApp();

        expect(screen.getByTestId('status-line')).toHaveTextContent('1');
        expect(screen.getByTestId('status-status')).toHaveTextContent(
            'Running',
        );
    });

    it('switches between the editor and machine views', async () => {
        const user = userEvent.setup();

        renderApp();

        const editor = screen.getByRole('radio', { name: 'Editor' });
        const machine = screen.getByRole('radio', { name: 'Machine' });

        await user.click(editor);
        expect(editor).toHaveAttribute('aria-checked', 'true');

        await user.click(machine);
        expect(machine).toHaveAttribute('aria-checked', 'true');

        await user.click(machine);
        expect(machine).toHaveAttribute('aria-checked', 'true');
    });

    it('opens the tour on the first step and pauses the player', async () => {
        const user = userEvent.setup();
        localStorage.removeItem(TOUR_STORAGE_KEY);
        renderApp();

        await user.click(screen.getByRole('button', { name: 'Assemble' }));
        await user.click(screen.getByRole('button', { name: 'Step' }));

        expect(
            await screen.findByRole('dialog', { name: 'The machine' }),
        ).toBeInTheDocument();
        expect(screen.getByTestId('status-status')).toHaveTextContent('Paused');
    });

    it('marks the shell inert while the tour is open', async () => {
        const user = userEvent.setup();
        localStorage.removeItem(TOUR_STORAGE_KEY);
        renderApp();

        await user.click(screen.getByRole('button', { name: 'Assemble' }));
        await user.click(screen.getByRole('button', { name: 'Step' }));

        const shell = document.querySelector('.app-shell');

        if (!shell) {
            throw new Error('App shell is missing.');
        }

        expect(shell).toHaveAttribute('inert');

        await user.click(screen.getByRole('button', { name: 'Skip tour' }));

        expect(shell).not.toHaveAttribute('inert');
    });

    it('uses the real read style on the read step', async () => {
        const user = userEvent.setup();
        localStorage.removeItem(TOUR_STORAGE_KEY);
        renderApp();

        await user.click(screen.getByRole('button', { name: 'Assemble' }));
        await user.click(screen.getByRole('button', { name: 'Step' }));
        await user.click(screen.getByRole('button', { name: 'Next' }));
        await user.click(screen.getByRole('button', { name: 'Next' }));

        const pc = document.querySelector('#pc');

        if (!pc) {
            throw new Error('Program counter is missing.');
        }

        expect(pc).toHaveAttribute('data-operation', 'read');
        expect(pc).toHaveClass('is-active');
    });

    it('restores the real visual state after closing the tour', async () => {
        const user = userEvent.setup();
        localStorage.removeItem(TOUR_STORAGE_KEY);
        renderApp();

        await user.click(screen.getByRole('button', { name: 'Assemble' }));
        await user.click(screen.getByRole('button', { name: 'Step' }));

        for (let index = 0; index < 4; index += 1) {
            await user.click(screen.getByRole('button', { name: 'Next' }));
        }

        const pc = document.querySelector('#pc');

        if (!pc) {
            throw new Error('Program counter is missing.');
        }

        expect(pc).toHaveAttribute('data-operation', 'increment');

        await user.click(screen.getByRole('button', { name: 'Skip tour' }));

        expect(pc).toHaveAttribute('data-operation', 'read');
    });

    it('shows the machine pane while the tour is open', async () => {
        const user = userEvent.setup();
        localStorage.removeItem(TOUR_STORAGE_KEY);
        renderApp();

        await user.click(screen.getByRole('radio', { name: 'Editor' }));
        await user.click(screen.getByRole('button', { name: 'Assemble' }));
        await user.click(screen.getByRole('button', { name: 'Step' }));

        const machine = screen
            .getByRole('img', { name: 'MOPS von Neumann machine' })
            .closest('section');

        if (!machine) {
            throw new Error('Machine pane is missing.');
        }

        expect(machine).not.toHaveClass('hidden');
    });
});
