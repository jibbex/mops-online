// @vitest-environment node

import { DATA_START } from '@/core/object';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlayerStore, INITIAL_SOURCE } from './player';

const SIMPLE_SOURCE = ['ld 5', 'add 3', 'st a', 'out a', 'end'].join('\n');
const INPUT_SOURCE = ['in a', 'out a', 'end'].join('\n');

function createStore(source = SIMPLE_SOURCE) {
    const store = createPlayerStore();

    store.getState().setSource(source);
    return store;
}

describe('player', () => {
    beforeEach(() => {
        // Scheduling is part of the player contract; fake timers make pauses
        // and cancellations observable without real delays.
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    it('assembles a valid source', () => {
        const store = createStore();
        store.getState().assemble();

        expect(store.getState().status).toBe('ready');
        expect(store.getState().program).not.toBeNull();
        expect(store.getState().diagnostics).toHaveLength(0);
    });

    it('requires manual assembly after editing the source', () => {
        const store = createStore();
        store.getState().assemble();
        store.getState().setSource(SIMPLE_SOURCE);

        vi.advanceTimersByTime(1000);

        expect(store.getState().program).toBeNull();
        expect(store.getState().cpu).toBeNull();
        expect(store.getState().status).toBe('idle');
    });

    it('does not assemble implicitly when starting or stepping', () => {
        const store = createStore();
        store.getState().start();
        store.getState().step();

        expect(store.getState().program).toBeNull();
        expect(store.getState().cpu).toBeNull();
        expect(store.getState().status).toBe('idle');
    });

    it('reports assembly errors', () => {
        const store = createStore('ld');
        store.getState().assemble();

        expect(store.getState().status).toBe('error');
        expect(store.getState().program).toBeNull();
        expect(store.getState().diagnostics.length).toBeGreaterThan(0);
    });

    it('finishes with the final machine state after the program ends', () => {
        const store = createStore();
        store.getState().assemble();
        store.getState().setMode('run');
        store.getState().setSpeed(0);
        store.getState().start();
        vi.runAllTimers();

        expect(store.getState().status).toBe('waiting-output');
        expect(store.getState().lastOutput).toBe(8);
        expect(store.getState().autoResume).toBe(true);

        store.getState().acknowledgeOutput();
        vi.runAllTimers();

        const state = store.getState();

        expect(state.status).toBe('finished');
        expect(state.cpu?.ac).toBe(8);
        expect(state.cpu?.aus).toBe(8);
        expect(state.cpu?.memory[DATA_START]).toBe(8);
        expect(state.lastOutput).toBeNull();
        expect(state.lastEvent?.microOp.kind).toBe('HALT');
        expect(state.history.length).toBeGreaterThan(0);
    });

    it('pauses after an instruction in instruction mode', () => {
        const store = createStore();
        store.getState().assemble();
        store.getState().setMode('instruction');
        store.getState().setSpeed(0);
        store.getState().start();
        vi.runAllTimers();

        expect(store.getState().status).toBe('paused');
        expect(store.getState().cpu?.ac).toBe(5);

        store.getState().start();
        vi.runAllTimers();

        expect(store.getState().cpu?.ac).toBe(8);
    });

    it('pauses after every microcycle in micro mode', () => {
        const store = createStore();
        store.getState().assemble();
        store.getState().setMode('micro');
        store.getState().setSpeed(0);
        store.getState().start();
        vi.runAllTimers();

        expect(store.getState().status).toBe('paused');
        expect(store.getState().history).toHaveLength(1);
    });

    it('waits for input and finishes with the final machine state', () => {
        const store = createStore(INPUT_SOURCE);
        store.getState().assemble();
        store.getState().setMode('run');
        store.getState().setSpeed(0);
        store.getState().start();
        vi.runAllTimers();

        expect(store.getState().status).toBe('waiting-input');
        expect(store.getState().autoResume).toBe(true);

        store.getState().provideInput(42);
        vi.runAllTimers();

        expect(store.getState().status).toBe('waiting-output');
        expect(store.getState().lastOutput).toBe(42);

        store.getState().acknowledgeOutput();
        vi.runAllTimers();

        expect(store.getState().status).toBe('finished');
        expect(store.getState().cpu?.memory[DATA_START]).toBe(42);
        expect(store.getState().cpu?.aus).toBe(42);
        expect(store.getState().history.length).toBeGreaterThan(0);
    });

    it('pauses after input during manual stepping', () => {
        const store = createStore(INPUT_SOURCE);
        store.getState().assemble();

        for (let step = 0; step < 10; step += 1) {
            store.getState().step();

            if (store.getState().status === 'waiting-input') {
                break;
            }
        }

        expect(store.getState().status).toBe('waiting-input');
        expect(store.getState().autoResume).toBe(false);

        store.getState().provideInput(42);

        expect(store.getState().status).toBe('paused');
        expect(store.getState().autoResume).toBe(false);
    });

    it('pauses on output in manual stepping and finishes after end', () => {
        const store = createStore(['out 5', 'end'].join('\n'));
        store.getState().assemble();

        for (let step = 0; step < 10; step += 1) {
            store.getState().step();

            if (store.getState().status === 'waiting-output') {
                break;
            }
        }

        expect(store.getState().status).toBe('waiting-output');
        expect(store.getState().lastOutput).toBe(5);
        expect(store.getState().autoResume).toBe(false);

        store.getState().acknowledgeOutput();

        expect(store.getState().status).toBe('paused');
        expect(store.getState().lastOutput).toBeNull();

        for (let step = 0; step < 10; step += 1) {
            store.getState().step();

            if (store.getState().status === 'finished') {
                break;
            }
        }

        expect(store.getState().status).toBe('finished');
        expect(store.getState().cpu?.aus).toBe(5);
        expect(store.getState().history.length).toBeGreaterThan(0);
    });

    it('steps back from the finished state', () => {
        const store = createStore(['ld 5', 'end'].join('\n'));
        store.getState().assemble();

        for (let step = 0; step < 20; step += 1) {
            store.getState().step();

            if (store.getState().status === 'finished') {
                break;
            }
        }

        const finished = store.getState();

        expect(finished.status).toBe('finished');
        expect(finished.lastEvent?.microOp.kind).toBe('HALT');

        store.getState().stepBack();

        const rewound = store.getState();

        expect(rewound.status).toBe('paused');
        expect(rewound.cpu).not.toBe(finished.cpu);
        expect(rewound.history).toHaveLength(finished.history.length - 1);
    });

    it('restarts from the finished state', () => {
        const store = createStore(['ld 5', 'end'].join('\n'));
        store.getState().assemble();
        store.getState().setMode('run');
        store.getState().setSpeed(0);
        store.getState().start();
        vi.runAllTimers();

        expect(store.getState().status).toBe('finished');

        store.getState().start();
        vi.runAllTimers();

        expect(store.getState().status).toBe('finished');
        expect(store.getState().history.length).toBeGreaterThan(0);
    });

    it('steps one microcycle at a time', () => {
        const store = createStore();
        store.getState().assemble();
        store.getState().step();

        expect(store.getState().status).toBe('paused');
        expect(store.getState().history).toHaveLength(1);

        store.getState().step();

        expect(store.getState().history).toHaveLength(2);
    });

    it('steps backward through history', () => {
        const store = createStore();
        store.getState().assemble();
        store.getState().step();
        store.getState().step();

        const beforeBack = store.getState().cpu;

        store.getState().stepBack();

        expect(store.getState().history).toHaveLength(1);
        expect(store.getState().cpu).not.toBe(beforeBack);
        expect(store.getState().status).toBe('paused');
    });

    it('pauses and stops a running program', () => {
        const store = createStore();
        store.getState().assemble();
        store.getState().setMode('run');
        store.getState().setSpeed(4);
        store.getState().start();

        expect(store.getState().status).toBe('running');
        expect(vi.getTimerCount()).toBeGreaterThan(0);

        store.getState().pause();

        expect(store.getState().status).toBe('paused');
        expect(vi.getTimerCount()).toBe(0);

        store.getState().start();
        store.getState().stop();

        expect(store.getState().status).toBe('ready');
        expect(store.getState().history).toHaveLength(0);
        expect(vi.getTimerCount()).toBe(0);
    });

    it('ignores actions that do not apply in the current state', () => {
        const store = createStore();

        store.getState().pause();
        store.getState().provideInput(1);
        store.getState().acknowledgeOutput();
        store.getState().step();
        store.getState().stop();

        expect(store.getState().status).toBe('idle');
        expect(store.getState().history).toHaveLength(0);
    });

    it('ignores step after the program has finished', () => {
        const store = createStore(['ld 5', 'end'].join('\n'));
        store.getState().assemble();

        for (let step = 0; step < 20; step += 1) {
            store.getState().step();

            if (store.getState().status === 'finished') {
                break;
            }
        }

        const historyLength = store.getState().history.length;

        store.getState().step();

        expect(store.getState().status).toBe('finished');
        expect(store.getState().history).toHaveLength(historyLength);
    });

    it('ignores step while waiting for output', () => {
        const store = createStore(['out 5', 'end'].join('\n'));
        store.getState().assemble();

        for (let step = 0; step < 10; step += 1) {
            store.getState().step();

            if (store.getState().status === 'waiting-output') {
                break;
            }
        }

        const historyLength = store.getState().history.length;

        store.getState().step();

        expect(store.getState().status).toBe('waiting-output');
        expect(store.getState().history).toHaveLength(historyLength);
    });

    it('reschedules when the speed changes while running', () => {
        const store = createStore();
        store.getState().assemble();
        store.getState().setMode('run');
        store.getState().setSpeed(4);
        store.getState().start();

        expect(vi.getTimerCount()).toBeGreaterThan(0);

        store.getState().setSpeed(2);

        expect(vi.getTimerCount()).toBeGreaterThan(0);

        store.getState().pause();
    });

    it('returns to idle when starting an empty error state', () => {
        const store = createStore('ld');
        store.getState().assemble();

        expect(store.getState().status).toBe('error');

        store.getState().start();

        expect(store.getState().status).toBe('idle');
    });

    it('drops a queued run when a subscriber pauses first', () => {
        const store = createStore(['ld 5', 'end'].join('\n'));
        store.getState().assemble();
        store.getState().setMode('run');

        const unsubscribe = store.subscribe((state, previous) => {
            if (state.status === 'running' && previous.status !== 'running') {
                store.getState().pause();
            }
        });

        store.getState().start();
        unsubscribe();

        expect(store.getState().status).toBe('paused');
        expect(vi.getTimerCount()).toBe(0);
    });

    it('does not schedule after a subscriber pauses during input', () => {
        const store = createStore(INPUT_SOURCE);
        store.getState().assemble();
        store.getState().setMode('run');
        store.getState().setSpeed(0);
        store.getState().start();
        vi.runAllTimers();

        expect(store.getState().status).toBe('waiting-input');

        const unsubscribe = store.subscribe((state, previous) => {
            if (state.status === 'running' && previous.status !== 'running') {
                store.getState().pause();
            }
        });

        store.getState().provideInput(42);
        unsubscribe();

        expect(store.getState().status).toBe('paused');
        expect(vi.getTimerCount()).toBe(0);
    });

    it('cancels a pending timer when the source changes', () => {
        const store = createStore();
        store.getState().assemble();
        store.getState().setMode('run');
        store.getState().setSpeed(4);
        store.getState().start();

        expect(vi.getTimerCount()).toBe(1);

        store.getState().setSource(SIMPLE_SOURCE);

        expect(vi.getTimerCount()).toBe(0);
        expect(store.getState().status).toBe('idle');
    });

    it('keeps two player stores independent', () => {
        const first = createStore();
        const second = createPlayerStore();

        first.getState().assemble();

        expect(first.getState().status).toBe('ready');
        expect(second.getState().status).toBe('idle');
        expect(second.getState().source).toBe(INITIAL_SOURCE);

        second.getState().setSource('end');
        second.getState().assemble();

        expect(second.getState().status).toBe('ready');
        expect(first.getState().source).toBe(SIMPLE_SOURCE);
    });

    it('reports a runtime trap and stops scheduling', () => {
        const store = createStore(['ld 1', 'div 0', 'end'].join('\n'));
        store.getState().assemble();
        store.getState().setMode('run');
        store.getState().setSpeed(0);
        store.getState().start();
        vi.runAllTimers();

        expect(store.getState().status).toBe('error');
        expect(store.getState().trap?.code).toBe('DIVISION_BY_ZERO');
        expect(store.getState().autoResume).toBe(false);
        expect(vi.getTimerCount()).toBe(0);
    });

    it('starts with the documented example source', () => {
        const store = createPlayerStore();

        expect(store.getState().source).toBe(INITIAL_SOURCE);
        expect(store.getState().source).toContain('in a');
    });
});
