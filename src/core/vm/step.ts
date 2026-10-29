/**
 * Fetch-decode-execute implementation for the MOPS VM.
 *
 * @module core/vm/step
 */

import {
    getExecutionSequence,
    getOperandModeForOpcode,
    type MicroOp,
    type Phase,
} from '@/core/isa';
import type { Word } from '@/core/object';
import type { CpuState, VmEvent, VmStepResult } from './cpu';
import { MICRO_OPS, type MicroOpResult } from './micro-handlers';

/**
 * Executes one micro-op.
 *
 * @param state Current CPU state.
 * @param input Optional input value for an input instruction.
 */
export function stepCpu(state: CpuState, input?: Word): VmStepResult {
    if (state.halted || state.phase === 'HALTED') {
        return { kind: 'halted', state };
    }

    // INPUT_READ stays pending when no value is supplied. The caller retries
    // the same micro-op with a value, so the transfer happens exactly once.

    let current = state;

    if (current.queueIndex >= current.queue.length) {
        // The halt guard above excludes HALTED; the assertion carries that
        // invariant through the queue rebuild.
        current = {
            ...current,
            queue: createQueue(
                current as CpuState & { readonly phase: RunnablePhase },
            ),
            queueIndex: 0,
        };
    }

    // createQueue returns at least one micro-op for every runnable phase.
    const microOp = current.queue[current.queueIndex] as MicroOp;

    const applied = applyMicroOp(current, microOp, input);
    const event = createEvent(current, applied.state, microOp);

    if (applied.needsInput) {
        return {
            kind: 'input-required',
            state: applied.state,
            event,
        };
    }

    if (applied.trap) {
        const trapped: CpuState = {
            ...applied.state,
            trap: applied.trap,
        };

        return {
            kind: 'trap',
            state: trapped,
            trap: applied.trap,
            event: createEvent(current, trapped, microOp),
        };
    }

    let after: CpuState = applied.state;

    if (microOp.kind === 'BR_WRITE' && after.phase === 'FETCH') {
        after = {
            ...after,
            queue: [...after.queue, ...createFetchTail(after)],
        };
    }

    const nextIndex = applied.skipRemaining
        ? after.queue.length
        : after.queueIndex + 1;

    after = {
        ...after,
        queueIndex: nextIndex,
    };

    if (nextIndex >= after.queue.length) {
        after = advancePhase(
            after as CpuState & { readonly phase: RunnablePhase },
        );
    }

    const finalEvent = createEvent(current, after, microOp);

    if (after.halted || after.phase === 'HALTED') {
        return { kind: 'halted', state: after, event: finalEvent };
    }

    return { kind: 'step', state: after, event: finalEvent };
}

type RunnablePhase = Exclude<Phase, 'HALTED'>;

function createQueue(
    state: CpuState & { readonly phase: RunnablePhase },
): readonly MicroOp[] {
    switch (state.phase) {
        case 'FETCH':
            // BR_WRITE appends the optional operand read and the PC update
            // once the opcode is known. This keeps operand-less instructions
            // from describing a read that can never happen.
            return [
                { kind: 'PC_READ' },
                { kind: 'MEM_READ' },
                { kind: 'BR_WRITE' },
            ];
        case 'DECODE':
            return [{ kind: 'DECODE' }];
        case 'EXECUTE':
            return createExecuteQueue(state);
    }
}

/**
 * Appends the remaining fetch work after the opcode is in the BR.
 *
 * The PC advances once per instruction, after the optional operand read.
 *
 * @param state State immediately after BR_WRITE.
 */
function createFetchTail(state: CpuState): readonly MicroOp[] {
    const opcode = state.br.opcode;

    if (opcode === null || getOperandModeForOpcode(opcode) === 'none') {
        return [{ kind: 'PC_UPDATE' }];
    }

    return [
        { kind: 'MEM_READ' },
        { kind: 'BR_WRITE_OPERAND' },
        { kind: 'PC_UPDATE' },
    ];
}

function createExecuteQueue(state: CpuState): readonly MicroOp[] {
    // A missing opcode is the only VM-local fallback. All real instruction
    // sequences come from the ISA table so the VM cannot drift from it.
    return state.br.opcode === null
        ? [{ kind: 'HALT' }]
        : getExecutionSequence(state.br.opcode);
}

function applyMicroOp(
    state: CpuState,
    microOp: MicroOp,
    input?: Word,
): MicroOpResult {
    return MICRO_OPS[microOp.kind].apply(state, input);
}

function advancePhase(
    state: CpuState & { readonly phase: RunnablePhase },
): CpuState {
    switch (state.phase) {
        case 'FETCH':
            return { ...state, phase: 'DECODE', queue: [], queueIndex: 0 };
        case 'DECODE':
            return { ...state, phase: 'EXECUTE', queue: [], queueIndex: 0 };
        case 'EXECUTE':
            return state.halted
                ? { ...state, phase: 'HALTED', queue: [], queueIndex: 0 }
                : { ...state, phase: 'FETCH', queue: [], queueIndex: 0 };
    }
}

function createEvent(
    before: CpuState,
    after: CpuState,
    microOp: MicroOp,
): VmEvent {
    return {
        phase: before.phase,
        address: before.instructionAddress,
        opcode: before.br.opcode,
        operand: before.br.opcode === null ? null : before.br.operand,
        microOp,
        before,
        after,
        description: MICRO_OPS[microOp.kind].description,
    };
}
