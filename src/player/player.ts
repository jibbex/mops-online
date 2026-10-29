/**
 * Execution player store.
 *
 * The player owns timing, pause modes, input flow, and history. Machine
 * semantics stay in the pure VM; deterministic player transitions live in
 * `player-state.ts`.
 *
 * @module player/player
 */

import { assemble as assembleSource } from '@/core/assembler';
import type { Word } from '@/core/object';
import { stepCpu } from '@/core/vm';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { microcycleDelay } from './timing';
import {
    acknowledgeOutput as acknowledgeOutputState,
    applyAssembly,
    beginRun,
    changeSource,
    createInitialSnapshot,
    pausePlayback,
    reduceVmStep,
    stepBack as rewindOneStep,
    stopPlayback,
    type ExecutionMode,
    type PlayerSnapshot,
    type PlayerSpeed,
    type PlayerStatus,
} from './player-state';

export type { ExecutionMode, PlayerSpeed, PlayerStatus };
export { INITIAL_SOURCE, NORMAL_SPEED } from './player-state';

/**
 * Public player store.
 *
 * The store owns timers and orchestration state; CPU and assembler modules stay
 * pure and do not import it.
 */
export interface PlayerState extends PlayerSnapshot {
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

/**
 * Creates an isolated player store.
 *
 * The timer lives in this closure instead of module scope. Tests and future
 * embedders can therefore create independent players without a test-only reset
 * hook or cross-store timer interference.
 */
export function createPlayerStore(): UseBoundStore<StoreApi<PlayerState>> {
    let timer: ReturnType<typeof setTimeout> | null = null;

    function clearTimer(): void {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
    }

    return create<PlayerState>((set, get) => {
        function scheduleNext(): void {
            clearTimer();

            const { status, speed } = get();

            if (status !== 'running') {
                return;
            }

            timer = setTimeout(() => {
                timer = null;
                runNext();
            }, microcycleDelay(speed));
        }

        function runNext(): void {
            const state = get();

            if (state.status !== 'running' || !state.cpu) {
                return;
            }

            const result = stepCpu(state.cpu, undefined);
            const transition = reduceVmStep(state, result);

            set(transition.state);

            if (transition.run) {
                scheduleNext();
            } else {
                clearTimer();
            }
        }

        return {
            ...createInitialSnapshot(),

            setSource: (source) => {
                clearTimer();
                set(changeSource(get(), source));
            },

            assemble: () => {
                clearTimer();
                set(applyAssembly(get(), assembleSource(get().source)));
            },

            start: () => {
                clearTimer();

                const transition = beginRun(get());

                set(transition.state);

                if (transition.run) {
                    runNext();
                }
            },

            pause: () => {
                clearTimer();
                set(pausePlayback(get()));
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
                    return;
                }

                const result = stepCpu(state.cpu, undefined);
                const transition = reduceVmStep(state, result, true);

                set(transition.state);
            },

            stop: () => {
                clearTimer();
                set(stopPlayback(get()));
            },

            stepBack: () => {
                clearTimer();
                set(rewindOneStep(get()));
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
                const transition = reduceVmStep(
                    state,
                    result,
                    !state.autoResume,
                );

                set(transition.state);

                if (transition.run) {
                    scheduleNext();
                } else {
                    clearTimer();
                }
            },

            acknowledgeOutput: () => {
                const transition = acknowledgeOutputState(get());

                set(transition.state);

                if (transition.run) {
                    scheduleNext();
                } else {
                    clearTimer();
                }
            },
        };
    });
}

/**
 * Default player instance used by the application shell.
 */
export const usePlayer = createPlayerStore();
