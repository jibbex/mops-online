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
import { microcycleDelay } from './timing';

/** Lifecycle states of the execution player. */
export type PlayerStatus =
    | 'idle'
    | 'ready'
    | 'running'
    | 'paused'
    | 'waiting-input'
    | 'waiting-output'
    | 'finished'
    | 'error';

/** Pause boundary used while running the machine. */
export type ExecutionMode =
    'micro' | 'phase' | 'instruction' | 'output' | 'run';

/** Playback multiplier; zero disables the delay between microcycles. */
export type PlayerSpeed = 0 | 0.5 | 1 | 2 | 4;

/** One completed microcycle captured for backward stepping. */
export interface HistoryEntry {
    /** Event emitted by the VM. */
    readonly event: VmEvent;
    /** State before the event was applied. */
    readonly before: CpuState;
    /** State after the event was applied. */
    readonly after: CpuState;
}

/**
 * Public player store.
 *
 * The store owns timers and orchestration state; CPU and assembler modules stay
 * pure and do not import it.
 */
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
    readonly lastOutput: Word | null;
    readonly resumeAfterOutput: boolean;
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
    readonly acknowledgeOutput: () => void;
}

/** Source shown when the application starts. */
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

/**
 * Player store and command surface used by the UI.
 */
export const usePlayer = create<PlayerState>((set, get) => {
    function scheduleNext(): void {
        clearTimer();

        const { status, speed } = get();

        if (status !== 'running') {
            return;
        }

        const delay = microcycleDelay(speed);
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
                lastOutput: null,
                resumeAfterOutput: false,
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
                lastOutput: null,
                resumeAfterOutput: false,
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
                lastOutput: null,
                resumeAfterOutput: false,
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

        if (
            result.kind === 'step' &&
            result.event.microOp.kind === 'AUS_WRITE'
        ) {
            set({
                cpu: result.state,
                status: 'waiting-output',
                lastEvent: result.event,
                lastOutput: result.event.after.aus,
                resumeAfterOutput: get().status === 'running',
                history: withHistory(get().history, {
                    event: result.event,
                    before: result.event.before,
                    after: result.state,
                }),
                trap: null,
            });
            clearTimer();
            return;
        }

        set({
            cpu: result.state,
            status: pause ? 'paused' : 'running',
            lastEvent: result.event,
            lastOutput: null,
            resumeAfterOutput: false,
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
        lastOutput: null,
        resumeAfterOutput: false,
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
                lastOutput: null,
                resumeAfterOutput: false,
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
                    lastOutput: null,
                    resumeAfterOutput: false,
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
                lastOutput: null,
                resumeAfterOutput: false,
                history: [],
            });
        },

        start: () => {
            const initial = get();

            if (
                initial.status === 'running' ||
                initial.status === 'waiting-input' ||
                initial.status === 'waiting-output'
            ) {
                return;
            }

            if (initial.status === 'finished' || initial.status === 'error') {
                set({
                    cpu: initial.program ? createCpu(initial.program) : null,
                    status: initial.program ? 'ready' : 'idle',
                    trap: null,
                    lastEvent: null,
                    lastOutput: null,
                    resumeAfterOutput: false,
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

            if (
                state.status === 'finished' ||
                state.status === 'error' ||
                state.status === 'waiting-input' ||
                state.status === 'waiting-output'
            ) {
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
                lastOutput: null,
                resumeAfterOutput: false,
                history: [],
            });
        },

        stepBack: () => {
            if (get().status === 'waiting-output') {
                return;
            }

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
                lastOutput: null,
                resumeAfterOutput: false,
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

        acknowledgeOutput: () => {
            const state = get();

            if (state.status !== 'waiting-output') {
                return;
            }

            if (state.resumeAfterOutput) {
                set({
                    status: 'running',
                    lastOutput: null,
                    resumeAfterOutput: false,
                });
                scheduleNext();
                return;
            }

            set({
                status: 'paused',
                lastOutput: null,
                resumeAfterOutput: false,
            });
        },
    };
});

/**
 * Stops the module-level playback timer.
 *
 * Intended for test cleanup and for callers that must guarantee no pending
 * timer survives a test boundary.
 */
export function resetPlayerTimerForTests(): void {
    clearTimer();
}
