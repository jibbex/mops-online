import { ThemeProvider } from '@/components/theme-provider';
import { stepCpu, createCpu } from '@/core/vm';
import { LanguageProvider } from '@/i18n/i18n-provider';
import { usePlayer } from '@/player/player';
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
    usePlayer.setState(usePlayer.getInitialState());
});

afterEach(() => {
    cleanup();
    usePlayer.setState(usePlayer.getInitialState());
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
    });
});
