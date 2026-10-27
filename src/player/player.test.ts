// @vitest-environment node

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

    it('reports assembly errors', () => {
        resetPlayer('ld');
        usePlayer.getState().assemble();

        expect(usePlayer.getState().status).toBe('error');
        expect(usePlayer.getState().program).toBeNull();
        expect(usePlayer.getState().diagnostics.length).toBeGreaterThan(0);
    });

    it('runs to completion in complete mode', () => {
        usePlayer.getState().assemble();
        usePlayer.getState().setMode('run');
        usePlayer.getState().setSpeed(0);
        usePlayer.getState().start();
        vi.runAllTimers();

        const state = usePlayer.getState();

        expect(state.status).toBe('finished');
        expect(state.cpu?.ac).toBe(8);
        expect(state.cpu?.aus).toBe(8);
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

    it('waits for input and continues after a value is provided', () => {
        resetPlayer(INPUT_SOURCE);
        usePlayer.getState().assemble();
        usePlayer.getState().setMode('run');
        usePlayer.getState().setSpeed(0);
        usePlayer.getState().start();
        vi.runAllTimers();

        expect(usePlayer.getState().status).toBe('waiting-input');

        usePlayer.getState().provideInput(42);
        vi.runAllTimers();

        expect(usePlayer.getState().status).toBe('finished');
        expect(usePlayer.getState().cpu?.memory[64]).toBe(42);
        expect(usePlayer.getState().cpu?.aus).toBe(42);
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
