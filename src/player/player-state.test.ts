// @vitest-environment node

import { assemble } from '@/core/assembler';
import {
    createCpu,
    stepCpu,
    type CpuState,
    type VmEvent,
    type VmStepResult,
} from '@/core/vm';
import { createObjectProgramFixture } from '@/test/object-program-fixture';
import { describe, expect, it } from 'vitest';
import {
    acknowledgeOutput,
    applyAssembly,
    beginRun,
    changeSource,
    createInitialSnapshot,
    pausePlayback,
    reduceVmStep,
    shouldPause,
    stepBack,
    stopPlayback,
    type PlayerSnapshot,
} from './player-state';

interface Fixture {
    readonly snapshot: PlayerSnapshot;
    readonly event: VmEvent;
    readonly state: CpuState;
}

function fixture(): Fixture {
    const program = createObjectProgramFixture();
    const cpu = createCpu(program);
    const result = stepCpu(cpu);

    if (result.kind !== 'step') {
        throw new Error('Expected a VM step.');
    }

    return {
        snapshot: {
            ...createInitialSnapshot(),
            program,
            cpu: result.state,
            status: 'ready',
        },
        event: result.event,
        state: result.state,
    };
}

function stepResult(event: VmEvent): VmStepResult {
    return { kind: 'step', state: event.after, event };
}

describe('player-state', () => {
    it('resets the machine when the source changes', () => {
        const { snapshot } = fixture();
        const next = changeSource(snapshot, 'end');

        expect(next.source).toBe('end');
        expect(next.program).toBeNull();
        expect(next.cpu).toBeNull();
        expect(next.status).toBe('idle');
        expect(next.history).toEqual([]);
    });

    it('applies successful and failed assembly results', () => {
        const { snapshot } = fixture();
        const success = applyAssembly(snapshot, assemble('end'));
        const failure = applyAssembly(snapshot, assemble('ld'));

        expect(success.status).toBe('ready');
        expect(success.program).not.toBeNull();
        expect(failure.status).toBe('error');
        expect(failure.program).toBeNull();
    });

    it('starts a ready program and rejects active wait states', () => {
        const { snapshot } = fixture();
        const ready = beginRun(snapshot);
        const running = beginRun({ ...snapshot, status: 'running' });
        const waiting = beginRun({ ...snapshot, status: 'waiting-input' });

        expect(ready.run).toBe(true);
        expect(ready.state.status).toBe('running');
        expect(running.run).toBe(false);
        expect(waiting.run).toBe(false);
    });

    it('restarts finished and error snapshots when a program is available', () => {
        const { snapshot } = fixture();
        const finished = beginRun({ ...snapshot, status: 'finished' });
        const error = beginRun({ ...snapshot, status: 'error' });

        expect(finished.state.status).toBe('running');
        expect(finished.run).toBe(true);
        expect(error.state.status).toBe('running');
        expect(error.run).toBe(true);
    });

    it('does not start without a program', () => {
        const { snapshot } = fixture();
        const result = beginRun({ ...snapshot, program: null, cpu: null });

        expect(result.run).toBe(false);
    });

    it('pauses only a running machine', () => {
        const { snapshot } = fixture();

        expect(pausePlayback({ ...snapshot, status: 'running' }).status).toBe(
            'paused',
        );
        expect(pausePlayback(snapshot)).toBe(snapshot);
    });

    it('stops with or without a loaded program', () => {
        const { snapshot } = fixture();
        const stopped = stopPlayback(snapshot);
        const empty = stopPlayback({ ...snapshot, program: null, cpu: null });

        expect(stopped.status).toBe('ready');
        expect(stopped.cpu).not.toBeNull();
        expect(empty.status).toBe('idle');
        expect(empty.cpu).toBeNull();
    });

    it('rewinds one event and refuses pending or empty history', () => {
        const { snapshot, event } = fixture();
        const history = [event];
        const rewound = stepBack({ ...snapshot, history });
        const pending = stepBack({ ...snapshot, status: 'waiting-output' });
        const empty = stepBack(snapshot);

        expect(rewound.status).toBe('paused');
        expect(rewound.cpu).toBe(event.before);
        expect(rewound.history).toEqual([]);
        expect(rewound.lastEvent).toBe(event);
        expect(pending).toEqual({ ...snapshot, status: 'waiting-output' });
        expect(empty).toBe(snapshot);
    });

    it('acknowledges output only in the waiting state', () => {
        const { snapshot } = fixture();
        const ignored = acknowledgeOutput(snapshot);
        const resumed = acknowledgeOutput({
            ...snapshot,
            status: 'waiting-output',
            autoResume: true,
        });
        const paused = acknowledgeOutput({
            ...snapshot,
            status: 'waiting-output',
            autoResume: false,
        });

        expect(ignored.run).toBe(false);
        expect(resumed.state.status).toBe('running');
        expect(resumed.run).toBe(true);
        expect(paused.state.status).toBe('paused');
        expect(paused.run).toBe(false);
    });

    it('reduces input-required and trap results', () => {
        const { snapshot, event, state } = fixture();
        const input = reduceVmStep(
            { ...snapshot, status: 'running' },
            { kind: 'input-required', state, event },
        );
        const trap = reduceVmStep(snapshot, {
            kind: 'trap',
            state,
            trap: { code: 'DIVISION_BY_ZERO', message: 'Division by zero.' },
            event,
        });

        expect(input.state.status).toBe('waiting-input');
        expect(input.state.autoResume).toBe(true);
        expect(input.run).toBe(false);
        expect(trap.state.status).toBe('error');
        expect(trap.state.history).toHaveLength(1);
        expect(trap.run).toBe(false);
    });

    it('reduces halted results with and without an event', () => {
        const { snapshot, event, state } = fixture();
        const withEvent = reduceVmStep(snapshot, {
            kind: 'halted',
            state,
            event,
        });
        const withoutEvent = reduceVmStep(snapshot, {
            kind: 'halted',
            state,
        });

        expect(withEvent.state.status).toBe('finished');
        expect(withEvent.state.history).toHaveLength(1);
        expect(withEvent.state.lastEvent).toBe(event);
        expect(withoutEvent.state.status).toBe('finished');
        expect(withoutEvent.state.history).toHaveLength(0);
    });

    it('pauses on an output write and resumes based on the run state', () => {
        const { snapshot, event } = fixture();
        const outputEvent = {
            ...event,
            microOp: { kind: 'AUS_WRITE' as const },
            after: { ...event.after, aus: 42 },
        };
        const running = reduceVmStep(
            { ...snapshot, status: 'running' },
            stepResult(outputEvent),
        );
        const manual = reduceVmStep(snapshot, stepResult(outputEvent));

        expect(running.state.status).toBe('waiting-output');
        expect(running.state.lastOutput).toBe(42);
        expect(running.state.autoResume).toBe(true);
        expect(manual.state.autoResume).toBe(false);
    });

    it('pauses ordinary steps according to the mode and force flag', () => {
        const { snapshot, event } = fixture();
        const forced = reduceVmStep(snapshot, stepResult(event), true);
        const running = reduceVmStep(
            { ...snapshot, mode: 'run' },
            stepResult(event),
        );

        expect(forced.state.status).toBe('paused');
        expect(forced.run).toBe(false);
        expect(running.state.status).toBe('running');
        expect(running.run).toBe(true);
    });

    it('describes pause boundaries for every mode', () => {
        const { event } = fixture();
        const phaseBoundary = {
            ...event,
            phase: 'EXECUTE' as const,
            after: { ...event.after, phase: 'FETCH' as const },
        };
        const output = {
            ...event,
            microOp: { kind: 'AUS_WRITE' as const },
        };

        expect(shouldPause(event, 'micro')).toBe(true);
        expect(shouldPause(event, 'phase')).toBe(false);
        expect(shouldPause(phaseBoundary, 'phase')).toBe(true);
        expect(shouldPause(phaseBoundary, 'instruction')).toBe(true);
        expect(shouldPause(output, 'output')).toBe(true);
        expect(shouldPause(event, 'run')).toBe(false);
    });
});
