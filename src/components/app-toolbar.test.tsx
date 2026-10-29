import { createCpu, stepCpu, type VmEvent } from '@/core/vm';
import { LanguageProvider } from '@/i18n/i18n-provider';
import { usePlayer } from '@/player/player';
import { createObjectProgramFixture } from '@/test/object-program-fixture';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppToolbar } from './app-toolbar';

const TASK = { id: 'practice', title: '' };
const PROGRAM = createObjectProgramFixture();

function renderToolbar() {
    return render(
        <LanguageProvider>
            <AppToolbar task={TASK} />
        </LanguageProvider>,
    );
}

function firstEvent(): VmEvent {
    const result = stepCpu(createCpu(PROGRAM));

    if (result.kind !== 'step') {
        throw new Error('Expected a VM step.');
    }

    return result.event;
}

const EVENT = firstEvent();

function loadProgram(
    status: 'ready' | 'running' | 'finished' = 'ready',
    history: readonly VmEvent[] = [],
) {
    usePlayer.setState({
        program: PROGRAM,
        cpu: createCpu(PROGRAM),
        status,
        history,
    });
}

describe('AppToolbar', () => {
    beforeEach(() => {
        localStorage.clear();
        usePlayer.setState(usePlayer.getInitialState());
    });

    afterEach(() => {
        cleanup();
        usePlayer.setState(usePlayer.getInitialState());
    });

    it('disables execution controls before assembly', () => {
        renderToolbar();

        expect(screen.getByRole('button', { name: 'Assemble' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Step' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled();
    });

    it('enables start, step, and stop for an assembled program', () => {
        loadProgram('ready');
        renderToolbar();

        expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Step' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    });

    it('disables start and step while running', () => {
        loadProgram('running');
        renderToolbar();

        expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Step' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled();
    });

    it('enables back when history is available', () => {
        loadProgram('ready', [EVENT]);
        renderToolbar();

        expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();
    });

    it('disables back while running even with history', () => {
        loadProgram('running', [EVENT]);
        renderToolbar();

        expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    });

    it('disables back while an output is pending', () => {
        loadProgram('ready', [EVENT]);
        usePlayer.setState({ status: 'waiting-output' });
        renderToolbar();

        expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    });

    it('disables step after the program finished', () => {
        loadProgram('finished');
        renderToolbar();

        expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Step' })).toBeDisabled();
    });

    it('wires the execution commands to the player actions', async () => {
        const user = userEvent.setup();
        const assemble = vi.fn();

        usePlayer.setState({ assemble });
        renderToolbar();

        await user.click(screen.getByRole('button', { name: 'Assemble' }));

        expect(assemble).toHaveBeenCalledTimes(1);
    });

    it('switches execution mode and speed', async () => {
        const user = userEvent.setup();
        loadProgram('ready');
        renderToolbar();

        await user.click(screen.getByRole('radio', { name: 'Commands' }));
        expect(usePlayer.getState().mode).toBe('instruction');

        await user.click(screen.getByRole('radio', { name: '2x' }));
        expect(usePlayer.getState().speed).toBe(2);
    });

    it('keeps the active mode and speed when they are deselected', async () => {
        const user = userEvent.setup();
        loadProgram('ready');
        renderToolbar();

        const commands = screen.getByRole('radio', { name: 'Commands' });
        const normalSpeed = screen.getByRole('radio', { name: '1x' });

        expect(commands).toHaveAttribute('aria-checked', 'true');
        expect(normalSpeed).toHaveAttribute('aria-checked', 'true');

        await user.click(commands);
        expect(usePlayer.getState().mode).toBe('instruction');

        await user.click(screen.getByRole('radio', { name: 'Phases' }));
        expect(usePlayer.getState().mode).toBe('phase');

        await user.click(normalSpeed);

        expect(usePlayer.getState().speed).toBe(1);
    });

    it('offers the settings in the compact menu', async () => {
        const user = userEvent.setup();
        loadProgram('ready');
        renderToolbar();

        await user.click(screen.getByRole('button', { name: 'Run settings' }));
        expect(
            screen.getByRole('menuitemradio', { name: 'Commands' }),
        ).toBeVisible();

        await user.click(screen.getByRole('menuitemradio', { name: 'Phases' }));

        expect(usePlayer.getState().mode).toBe('phase');
    });
});
