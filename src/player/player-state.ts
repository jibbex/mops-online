/**
 * Pure player state transitions.
 *
 * The player separates machine execution from playback concerns. This module
 * contains only deterministic state changes; timers and other effects belong to
 * the store in `player.ts`.
 *
 * @module player/player-state
 */

import type {
    AssembleResult,
    AssembleWarning,
    Diagnostic,
} from '@/core/assembler';
import type { ObjectProgram, Word } from '@/core/object';
import {
    createCpu,
    type CpuState,
    type Trap,
    type VmEvent,
    type VmStepResult,
} from '@/core/vm';

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

/** State owned by the player before actions are attached. */
export interface PlayerSnapshot {
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
    /**
     * Whether a run should continue after the pending input or output step.
     *
     * One flag is enough because the two wait states are mutually exclusive.
     */
    readonly autoResume: boolean;
    /** Completed microcycles in execution order; each event owns its snapshots. */
    readonly history: readonly VmEvent[];
}

/** State transition plus the only side effect the store must schedule. */
export interface PlayerTransition {
    readonly state: PlayerSnapshot;
    /** Whether the store should schedule the next microcycle. */
    readonly run: boolean;
}

/**
 * Hard cap for backward-stepping history.
 *
 * Deep history is useful for debugging, but every entry retains two CPU
 * snapshots. The cap bounds memory and rewind cost during long runs.
 */
export const MAX_HISTORY_ENTRIES = 5000;

/** Playback multiplier that represents normal speed. */
export const NORMAL_SPEED: PlayerSpeed = 1;

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

const DEFAULT_MODE: ExecutionMode = 'instruction';
const DEFAULT_SPEED: PlayerSpeed = NORMAL_SPEED;

const RESET_OUTPUT = {
    lastOutput: null,
    autoResume: false,
} as const;

const RESET_EXECUTION = {
    trap: null,
    lastEvent: null,
    history: [] as readonly VmEvent[],
    ...RESET_OUTPUT,
} as const;

/**
 * Creates the initial player snapshot.
 *
 * @param source Initial assembly source.
 */
export function createInitialSnapshot(source = INITIAL_SOURCE): PlayerSnapshot {
    return {
        source,
        program: null,
        cpu: null,
        status: 'idle',
        mode: DEFAULT_MODE,
        speed: DEFAULT_SPEED,
        diagnostics: [],
        warnings: [],
        ...RESET_EXECUTION,
    };
}

/**
 * Resets execution data after the source changes.
 */
export function changeSource(
    state: PlayerSnapshot,
    source: string,
): PlayerSnapshot {
    return {
        ...state,
        source,
        program: null,
        cpu: null,
        status: 'idle',
        diagnostics: [],
        warnings: [],
        ...RESET_EXECUTION,
    };
}

/**
 * Applies an assembly result.
 */
export function applyAssembly(
    state: PlayerSnapshot,
    result: AssembleResult,
): PlayerSnapshot {
    if (!result.program) {
        return {
            ...state,
            program: null,
            cpu: null,
            status: 'error',
            diagnostics: result.diagnostics,
            warnings: result.warnings,
            ...RESET_EXECUTION,
        };
    }

    return {
        ...state,
        program: result.program,
        cpu: createCpu(result.program),
        status: 'ready',
        diagnostics: result.diagnostics,
        warnings: result.warnings,
        ...RESET_EXECUTION,
    };
}

/**
 * Starts or resumes execution.
 */
export function beginRun(state: PlayerSnapshot): PlayerTransition {
    if (
        state.status === 'running' ||
        state.status === 'waiting-input' ||
        state.status === 'waiting-output'
    ) {
        return { state, run: false };
    }

    let next = state;

    if (state.status === 'finished' || state.status === 'error') {
        next = {
            ...state,
            cpu: state.program ? createCpu(state.program) : null,
            status: state.program ? 'ready' : 'idle',
            ...RESET_EXECUTION,
        };
    }

    if (!next.program || !next.cpu) {
        return { state: next, run: false };
    }

    return {
        state: {
            ...next,
            status: 'running',
            trap: null,
            autoResume: false,
        },
        run: true,
    };
}

/**
 * Applies one VM step result.
 *
 * @param state Current snapshot.
 * @param result VM result.
 * @param forcePause Whether a manual step must pause even when the selected
 * mode would otherwise continue.
 */
export function reduceVmStep(
    state: PlayerSnapshot,
    result: VmStepResult,
    forcePause = false,
): PlayerTransition {
    switch (result.kind) {
        case 'input-required':
            return {
                state: {
                    ...state,
                    cpu: result.state,
                    status: 'waiting-input',
                    ...RESET_OUTPUT,
                    lastEvent: result.event,
                    autoResume: state.status === 'running',
                },
                run: false,
            };

        case 'trap':
            return {
                state: {
                    ...state,
                    cpu: result.state,
                    status: 'error',
                    ...RESET_OUTPUT,
                    trap: result.trap,
                    lastEvent: result.event,
                    history: appendHistory(state.history, result.event),
                },
                run: false,
            };

        case 'halted': {
            const event = result.event;

            return {
                state: {
                    ...state,
                    cpu: result.state,
                    status: 'finished',
                    ...RESET_EXECUTION,
                    lastEvent: event ?? state.lastEvent,
                    history: event
                        ? appendHistory(state.history, event)
                        : state.history,
                },
                run: false,
            };
        }

        case 'step':
            if (result.event.microOp.kind === 'AUS_WRITE') {
                return {
                    state: {
                        ...state,
                        cpu: result.state,
                        status: 'waiting-output',
                        ...RESET_OUTPUT,
                        lastEvent: result.event,
                        lastOutput: result.event.after.aus,
                        autoResume: state.status === 'running',
                        history: appendHistory(state.history, result.event),
                    },
                    run: false,
                };
            }

            {
                const pause =
                    forcePause || shouldPause(result.event, state.mode);

                return {
                    state: {
                        ...state,
                        cpu: result.state,
                        status: pause ? 'paused' : 'running',
                        ...RESET_EXECUTION,
                        lastEvent: result.event,
                        history: appendHistory(state.history, result.event),
                    },
                    run: !pause,
                };
            }
    }
}

/**
 * Pauses a running machine.
 */
export function pausePlayback(state: PlayerSnapshot): PlayerSnapshot {
    return state.status === 'running'
        ? { ...state, status: 'paused', autoResume: false }
        : state;
}

/**
 * Stops the machine and restores the assembled program.
 */
export function stopPlayback(state: PlayerSnapshot): PlayerSnapshot {
    return {
        ...state,
        cpu: state.program ? createCpu(state.program) : null,
        status: state.program ? 'ready' : 'idle',
        ...RESET_EXECUTION,
    };
}

/**
 * Rewinds one completed microcycle.
 */
export function stepBack(state: PlayerSnapshot): PlayerSnapshot {
    if (state.status === 'waiting-output') {
        return state;
    }

    const entry = state.history.at(-1);

    if (!entry) {
        return state;
    }

    return {
        ...state,
        cpu: entry.before,
        status: 'paused',
        ...RESET_EXECUTION,
        lastEvent: entry,
        history: state.history.slice(0, -1),
    };
}

/**
 * Continues or pauses after an output acknowledgement.
 */
export function acknowledgeOutput(state: PlayerSnapshot): PlayerTransition {
    if (state.status !== 'waiting-output') {
        return { state, run: false };
    }

    if (state.autoResume) {
        return {
            state: {
                ...state,
                status: 'running',
                lastOutput: null,
                autoResume: false,
            },
            run: true,
        };
    }

    return {
        state: {
            ...state,
            status: 'paused',
            lastOutput: null,
            autoResume: false,
        },
        run: false,
    };
}

/**
 * Returns whether the current mode pauses after an event.
 */
export function shouldPause(event: VmEvent, mode: ExecutionMode): boolean {
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

function appendHistory(
    history: readonly VmEvent[],
    event: VmEvent,
): readonly VmEvent[] {
    const next = [...history, event];

    return next.length > MAX_HISTORY_ENTRIES
        ? next.slice(next.length - MAX_HISTORY_ENTRIES)
        : next;
}
