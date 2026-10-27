/**
 * Execution player for the MOPS web application.
 *
 * The player owns timing, pause modes, input flow, and history. The VM remains
 * pure and knows nothing about these concerns.
 *
 * @module player/player
 */

import {
    assemble,
    type AssembleWarning,
    type Diagnostic,
} from '@/core/assembler';
import type { ObjectProgram, Word } from '@/core/object';
import {
    createCpu,
    stepCpu,
    type CpuState,
    type Trap,
    type VmEvent,
    type VmStepResult,
} from '@/core/vm';
import { create } from 'zustand';

export type PlayerStatus =
    | 'idle'
    | 'ready'
    | 'running'
    | 'paused'
    | 'waiting-input'
    | 'finished'
    | 'error';

export type ExecutionMode =
    'micro' | 'phase' | 'instruction' | 'output' | 'run';

export type PlayerSpeed = 0 | 0.5 | 1 | 2 | 4;

export interface HistoryEntry {
    readonly event: VmEvent;
    readonly before: CpuState;
    readonly after: CpuState;
}

export interface PlayerState {
    readonly source: string;
    readonly program: ObjectProgram | null;
    readonly cpu: CpuState | null;
    readonly status: PlayerStatus;
    readonly mode: ExecutionMode;
    readonly speed: PlayerSpeed;
    readonly diagnostics: readonly Diagnostic[];
    readonly warnings: readonly AssembleWarning[];
    readonly trap: Trap | null;
    readonly lastEvent: VmEvent | null;
    readonly history: readonly HistoryEntry[];
    readonly setSource: (source: string) => void;
    readonly assemble: () => void;
    readonly start: () => void;
    readonly pause: () => void;
    readonly step: () => void;
    readonly stop: () => void;
    readonly stepBack: () => void;
    readonly setMode: (mode: ExecutionMode) => void;
    readonly setSpeed: (speed: PlayerSpeed) => void;
    readonly provideInput: (value: Word) => void;
}

export const INITIAL_SOURCE = [
    '; Double a number',
    'in a',
    'ld a',
    'mul 2',
    'st a',
    'out a',
    'end',
].join('\n');

let timer: ReturnType<typeof setTimeout> | null = null;

function clearTimer(): void {
    if (timer !== null) {
        clearTimeout(timer);
        timer = null;
    }
}

function shouldPause(event: VmEvent, mode: ExecutionMode): boolean {
    switch (mode) {
        case 'micro':
            return true;
        case 'phase':
            return event.after.phase !== event.phase;
        case 'instruction':
            return event.phase === 'EXECUTE' && event.after.phase !== 'EXECUTE';
        case 'output':
            return event.microOp.kind === 'AUS_WRITE';
        case 'run':
            return false;
    }
}

function withHistory(
    history: readonly HistoryEntry[],
    entry: HistoryEntry,
): readonly HistoryEntry[] {
    return [...history.slice(-4999), entry];
}

export const usePlayer = create<PlayerState>((set, get) => {
    function scheduleNext(): void {
        clearTimer();

        const { status, speed } = get();

        if (status !== 'running') {
            return;
        }

        const delay = speed === 0 ? 0 : Math.max(20, 260 / speed);
        timer = setTimeout(() => {
            timer = null;
            runNext();
        }, delay);
    }

    function runNext(): void {
        const state = get();

        if (state.status !== 'running' || !state.cpu) {
            return;
        }

        const result = stepCpu(state.cpu, undefined);
        const pause =
            result.kind === 'step'
                ? shouldPause(result.event, state.mode)
                : false;
        record(result, pause);
    }

    function record(result: VmStepResult, pause: boolean): void {
        const event = 'event' in result ? result.event : undefined;

        if (result.kind === 'input-required') {
            set({
                cpu: result.state,
                status: 'waiting-input',
                lastEvent: result.event,
            });
            clearTimer();
            return;
        }

        if (result.kind === 'trap') {
            set({
                cpu: result.state,
                status: 'error',
                trap: result.trap,
                lastEvent: result.event,
                history: withHistory(get().history, {
                    event: result.event,
                    before: result.event.before,
                    after: result.state,
                }),
            });
            clearTimer();
            return;
        }

        if (result.kind === 'halted') {
            set({
                cpu: result.state,
                status: 'finished',
                lastEvent: event ?? get().lastEvent,
                history:
                    event === undefined
                        ? get().history
                        : withHistory(get().history, {
                              event,
                              before: event.before,
                              after: result.state,
                          }),
            });
            clearTimer();
            return;
        }

        set({
            cpu: result.state,
            status: pause ? 'paused' : 'running',
            lastEvent: result.event,
            history: withHistory(get().history, {
                event: result.event,
                before: result.event.before,
                after: result.state,
            }),
            trap: null,
        });

        if (pause) {
            clearTimer();
        } else {
            scheduleNext();
        }
    }

    return {
        source: INITIAL_SOURCE,
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

        setSource: (source) => {
            clearTimer();
            set({
                source,
                program: null,
                cpu: null,
                status: 'idle',
                diagnostics: [],
                warnings: [],
                trap: null,
                lastEvent: null,
                history: [],
            });
        },

        assemble: () => {
            clearTimer();

            const result = assemble(get().source);

            if (!result.program) {
                set({
                    program: null,
                    cpu: null,
                    status: 'error',
                    diagnostics: result.diagnostics,
                    warnings: result.warnings,
                    trap: null,
                    lastEvent: null,
                    history: [],
                });
                return;
            }

            set({
                program: result.program,
                cpu: createCpu(result.program),
                status: 'ready',
                diagnostics: result.diagnostics,
                warnings: result.warnings,
                trap: null,
                lastEvent: null,
                history: [],
            });
        },

        start: () => {
            const initial = get();

            if (initial.status === 'running') {
                return;
            }

            if (initial.status === 'finished' || initial.status === 'error') {
                set({
                    cpu: initial.program ? createCpu(initial.program) : null,
                    status: initial.program ? 'ready' : 'idle',
                    trap: null,
                    lastEvent: null,
                    history: [],
                });
            }

            const state = get();

            if (!state.program || !state.cpu) {
                get().assemble();
            }

            const assembled = get();

            if (!assembled.program || !assembled.cpu) {
                set({ status: 'error' });
                return;
            }

            set({ status: 'running', trap: null });
            runNext();
        },

        pause: () => {
            clearTimer();

            if (get().status === 'running') {
                set({ status: 'paused' });
            }
        },

        step: () => {
            clearTimer();

            const state = get();

            if (state.status === 'finished' || state.status === 'error') {
                return;
            }

            if (!state.program || !state.cpu) {
                get().assemble();
            }

            const assembled = get();

            if (!assembled.cpu) {
                set({ status: 'error' });
                return;
            }

            const result = stepCpu(assembled.cpu, undefined);
            record(result, true);
        },

        stop: () => {
            clearTimer();

            const { program } = get();

            set({
                cpu: program ? createCpu(program) : null,
                status: program ? 'ready' : 'idle',
                trap: null,
                lastEvent: null,
                history: [],
            });
        },

        stepBack: () => {
            const history = get().history;
            const entry = history.at(-1);

            if (!entry) {
                return;
            }

            clearTimer();
            set({
                cpu: entry.before,
                status: 'paused',
                lastEvent: entry.event,
                history: history.slice(0, -1),
                trap: null,
            });
        },

        setMode: (mode) => set({ mode }),

        setSpeed: (speed) => {
            set({ speed });

            if (get().status === 'running') {
                scheduleNext();
            }
        },

        provideInput: (value) => {
            const state = get();

            if (state.status !== 'waiting-input' || !state.cpu) {
                return;
            }

            const result = stepCpu(state.cpu, value);
            const pause =
                result.kind === 'step'
                    ? shouldPause(result.event, state.mode)
                    : false;
            record(result, pause);
        },
    };
});

export function resetPlayerTimerForTests(): void {
    clearTimer();
}
