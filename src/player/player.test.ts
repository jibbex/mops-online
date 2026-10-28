// @vitest-environment node

import { DATA_START } from '@/core/object';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_SOURCE, resetPlayerTimerForTests, usePlayer } from './player';

const SIMPLE_SOURCE = ['ld 5', 'add 3', 'st a', 'out a', 'end'].join('\n');
const INPUT_SOURCE = ['in a', 'out a', 'end'].join('\n');

function resetPlayer(source = SIMPLE_SOURCE): void {
    resetPlayerTimerForTests();
    usePlayer.setState({
        source,
        program: null,
        cpu: null,
        status: 'idle',
        mode: 'instruction',
        speed: 1,
        diagnostics: [],
        warnings: [],
        trap: null,
        lastEvent: null,
        lastOutput: null,
        resumeAfterOutput: false,
        resumeAfterInput: false,
        history: [],
    });
}

describe('player', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        resetPlayer();
    });

    afterEach(() => {
        resetPlayerTimerForTests();
        vi.useRealTimers();
    });

    it('assembles a valid source', () => {
        usePlayer.getState().assemble();

        expect(usePlayer.getState().status).toBe('ready');
        expect(usePlayer.getState().program).not.toBeNull();
        expect(usePlayer.getState().diagnostics).toHaveLength(0);
    });

    it('requires manual assembly after editing the source', () => {
        usePlayer.getState().assemble();
        usePlayer.getState().setSource(SIMPLE_SOURCE);

        vi.advanceTimersByTime(1000);

        expect(usePlayer.getState().program).toBeNull();
        expect(usePlayer.getState().cpu).toBeNull();
        expect(usePlayer.getState().status).toBe('idle');
    });

    it('does not assemble implicitly when starting or stepping', () => {
        usePlayer.getState().setSource(SIMPLE_SOURCE);
        usePlayer.getState().start();
        usePlayer.getState().step();

        expect(usePlayer.getState().program).toBeNull();
        expect(usePlayer.getState().cpu).toBeNull();
        expect(usePlayer.getState().status).toBe('idle');
    });

    it('reports assembly errors', () => {
        resetPlayer('ld');
        usePlayer.getState().assemble();

        expect(usePlayer.getState().status).toBe('error');
        expect(usePlayer.getState().program).toBeNull();
        expect(usePlayer.getState().diagnostics.length).toBeGreaterThan(0);
    });

    it('finishes with the final machine state after the program ends', () => {
        usePlayer.getState().assemble();
        usePlayer.getState().setMode('run');
        usePlayer.getState().setSpeed(0);
        usePlayer.getState().start();
        vi.runAllTimers();

        expect(usePlayer.getState().status).toBe('waiting-output');
        expect(usePlayer.getState().lastOutput).toBe(8);
        expect(usePlayer.getState().resumeAfterOutput).toBe(true);

        usePlayer.getState().acknowledgeOutput();
        vi.runAllTimers();

        const state = usePlayer.getState();

        expect(state.status).toBe('finished');
        expect(state.cpu?.ac).toBe(8);
        expect(state.cpu?.aus).toBe(8);
        expect(state.cpu?.memory[DATA_START]).toBe(8);
        expect(state.lastOutput).toBeNull();
        expect(state.lastEvent?.microOp.kind).toBe('HALT');
        expect(state.history.length).toBeGreaterThan(0);
    });

    it('pauses after an instruction in instruction mode', () => {
        usePlayer.getState().assemble();
        usePlayer.getState().setMode('instruction');
        usePlayer.getState().setSpeed(0);
        usePlayer.getState().start();
        vi.runAllTimers();

        expect(usePlayer.getState().status).toBe('paused');
        expect(usePlayer.getState().cpu?.ac).toBe(5);

        usePlayer.getState().start();
        vi.runAllTimers();

        expect(usePlayer.getState().cpu?.ac).toBe(8);
    });

    it('pauses after every microcycle in micro mode', () => {
        usePlayer.getState().assemble();
        usePlayer.getState().setMode('micro');
        usePlayer.getState().setSpeed(0);
        usePlayer.getState().start();
        vi.runAllTimers();

        expect(usePlayer.getState().status).toBe('paused');
        expect(usePlayer.getState().history).toHaveLength(1);
    });

    it('waits for input and finishes with the final machine state', () => {
        resetPlayer(INPUT_SOURCE);
        usePlayer.getState().assemble();
        usePlayer.getState().setMode('run');
        usePlayer.getState().setSpeed(0);
        usePlayer.getState().start();
        vi.runAllTimers();

        expect(usePlayer.getState().status).toBe('waiting-input');
        expect(usePlayer.getState().resumeAfterInput).toBe(true);

        usePlayer.getState().provideInput(42);
        vi.runAllTimers();

        expect(usePlayer.getState().status).toBe('waiting-output');
        expect(usePlayer.getState().lastOutput).toBe(42);

        usePlayer.getState().acknowledgeOutput();
        vi.runAllTimers();

        expect(usePlayer.getState().status).toBe('finished');
        expect(usePlayer.getState().cpu?.memory[DATA_START]).toBe(42);
        expect(usePlayer.getState().cpu?.aus).toBe(42);
        expect(usePlayer.getState().history.length).toBeGreaterThan(0);
    });

    it('pauses after input during manual stepping', () => {
        resetPlayer(INPUT_SOURCE);
        usePlayer.getState().assemble();

        for (let step = 0; step < 10; step += 1) {
            usePlayer.getState().step();

            if (usePlayer.getState().status === 'waiting-input') {
                break;
            }
        }

        expect(usePlayer.getState().status).toBe('waiting-input');
        expect(usePlayer.getState().resumeAfterInput).toBe(false);

        usePlayer.getState().provideInput(42);

        expect(usePlayer.getState().status).toBe('paused');
        expect(usePlayer.getState().resumeAfterInput).toBe(false);
    });

    it('pauses on output in manual stepping and finishes after end', () => {
        resetPlayer(['out 5', 'end'].join('\n'));
        usePlayer.getState().assemble();

        for (let step = 0; step < 10; step += 1) {
            usePlayer.getState().step();

            if (usePlayer.getState().status === 'waiting-output') {
                break;
            }
        }

        expect(usePlayer.getState().status).toBe('waiting-output');
        expect(usePlayer.getState().lastOutput).toBe(5);
        expect(usePlayer.getState().resumeAfterOutput).toBe(false);

        usePlayer.getState().acknowledgeOutput();

        expect(usePlayer.getState().status).toBe('paused');
        expect(usePlayer.getState().lastOutput).toBeNull();

        for (let step = 0; step < 10; step += 1) {
            usePlayer.getState().step();

            if (usePlayer.getState().status === 'finished') {
                break;
            }
        }

        expect(usePlayer.getState().status).toBe('finished');
        expect(usePlayer.getState().cpu?.aus).toBe(5);
        expect(usePlayer.getState().history.length).toBeGreaterThan(0);
    });

    it('steps back from the finished state', () => {
        resetPlayer(['ld 5', 'end'].join('\n'));
        usePlayer.getState().assemble();

        for (let step = 0; step < 20; step += 1) {
            usePlayer.getState().step();

            if (usePlayer.getState().status === 'finished') {
                break;
            }
        }

        const finished = usePlayer.getState();

        expect(finished.status).toBe('finished');
        expect(finished.lastEvent?.microOp.kind).toBe('HALT');

        usePlayer.getState().stepBack();

        const rewound = usePlayer.getState();

        expect(rewound.status).toBe('paused');
        expect(rewound.cpu).not.toBe(finished.cpu);
        expect(rewound.history).toHaveLength(finished.history.length - 1);
    });

    it('restarts from the finished state', () => {
        resetPlayer(['ld 5', 'end'].join('\n'));
        usePlayer.getState().assemble();
        usePlayer.getState().setMode('run');
        usePlayer.getState().setSpeed(0);
        usePlayer.getState().start();
        vi.runAllTimers();

        expect(usePlayer.getState().status).toBe('finished');

        usePlayer.getState().start();
        vi.runAllTimers();

        expect(usePlayer.getState().status).toBe('finished');
        expect(usePlayer.getState().history.length).toBeGreaterThan(0);
    });

    it('steps one microcycle at a time', () => {
        usePlayer.getState().assemble();
        usePlayer.getState().step();

        expect(usePlayer.getState().status).toBe('paused');
        expect(usePlayer.getState().history).toHaveLength(1);

        usePlayer.getState().step();

        expect(usePlayer.getState().history).toHaveLength(2);
    });

    it('steps backward through history', () => {
        usePlayer.getState().assemble();
        usePlayer.getState().step();
        usePlayer.getState().step();

        const beforeBack = usePlayer.getState().cpu;

        usePlayer.getState().stepBack();

        expect(usePlayer.getState().history).toHaveLength(1);
        expect(usePlayer.getState().cpu).not.toBe(beforeBack);
        expect(usePlayer.getState().status).toBe('paused');
    });

    it('pauses and stops a running program', () => {
        usePlayer.getState().assemble();
        usePlayer.getState().setMode('run');
        usePlayer.getState().setSpeed(4);
        usePlayer.getState().start();

        expect(usePlayer.getState().status).toBe('running');

        usePlayer.getState().pause();

        expect(usePlayer.getState().status).toBe('paused');

        usePlayer.getState().stop();

        expect(usePlayer.getState().status).toBe('ready');
        expect(usePlayer.getState().history).toHaveLength(0);
    });

    it('starts with the documented example source', () => {
        resetPlayer(INITIAL_SOURCE);

        expect(usePlayer.getState().source).toContain('in a');
    });
});
