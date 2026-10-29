/**
 * Fetch-decode-execute implementation for the MOPS VM.
 *
 * @module core/vm/step
 */

import {
    getExecutionSequence,
    getInstructionByOpcode,
    getOperandLatch,
    getOperandModeForOpcode,
    getOperation,
    isOpcode,
    type Operation,
} from '@/core/isa';
import { MAX_WORD, MIN_WORD, isWord, type Word } from '@/core/object';
import {
    cloneCpuState,
    formatDecoded,
    type BusValue,
    type CpuState,
    type VmEvent,
    type VmStepResult,
} from './cpu';
import type { Compare, MicroOp } from './microops';
import { createTrap, type Trap } from './traps';

type MutableCpuState = {
    -readonly [Key in keyof CpuState]: CpuState[Key];
};

interface ApplyResult {
    readonly state: CpuState;
    readonly needsInput?: boolean;
    readonly trap?: Trap;
    readonly skipRemaining?: boolean;
}

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
        current = {
            ...current,
            queue: createQueue(current),
            queueIndex: 0,
        };
    }

    const microOp = current.queue[current.queueIndex];

    if (!microOp) {
        return { kind: 'halted', state: current };
    }

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
    const nextIndex = applied.skipRemaining
        ? after.queue.length
        : after.queueIndex + 1;

    after = {
        ...after,
        queueIndex: nextIndex,
    };

    if (nextIndex >= after.queue.length) {
        after = advancePhase(after);
    }

    const finalEvent = createEvent(current, after, microOp);

    if (after.halted || after.phase === 'HALTED') {
        return { kind: 'halted', state: after, event: finalEvent };
    }

    return { kind: 'step', state: after, event: finalEvent };
}

function createQueue(state: CpuState): readonly MicroOp[] {
    switch (state.phase) {
        case 'FETCH':
            return [
                { kind: 'PC_READ' },
                { kind: 'MEM_READ', width: 2 },
                { kind: 'BR_WRITE' },
            ];
        case 'DECODE':
            return [{ kind: 'DECODE' }, { kind: 'PC_UPDATE' }];
        case 'EXECUTE':
            return createExecuteQueue(state);
        case 'HALTED':
            return [];
    }
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
): ApplyResult {
    const next = cloneCpuState(state) as MutableCpuState;

    switch (microOp.kind) {
        case 'PC_READ':
            return applyPcRead(next);
        case 'MEM_READ':
            return applyMemRead(next, microOp.width);
        case 'BR_WRITE':
            return applyBrWrite(next);
        case 'DECODE':
            return applyDecode(next);
        case 'PC_UPDATE':
            return applyPcUpdate(next);
        case 'BR_READ_OPERAND':
            return applyBrReadOperand(next);
        case 'INPUT_READ':
            return applyInputRead(next, input);
        case 'MEM_WRITE':
            return applyMemWrite(next);
        case 'AC_WRITE':
            return applyAcWrite(next);
        case 'AC_READ':
            return applyAcRead(next);
        case 'OP_WRITE':
            return applyOpWrite(next);
        case 'AR_WRITE':
            return applyArWrite(next);
        case 'ALU_CALC':
            return calculate(next);
        case 'ERG_AC_WRITE':
            return applyErgAcWrite(next);
        case 'ERG_VGL_WRITE':
            return applyErgVglWrite(next);
        case 'AUS_WRITE':
            return applyAusWrite(next);
        case 'VGL_READ':
            return checkCompare(next);
        case 'PC_WRITE':
            return applyPcWrite(next);
        case 'HALT':
            return applyHalt(next);
    }
}

function applyPcRead(next: MutableCpuState): ApplyResult {
    const address = next.instructionAddresses[next.pc];

    if (address === undefined) {
        return trap(
            next,
            'PC_OUT_OF_RANGE',
            'Program counter is out of range.',
        );
    }

    next.slAdr = address;
    next.instructionAddress = address;
    return { state: next };
}

function applyMemRead(next: MutableCpuState, width: 1 | 2): ApplyResult {
    const address = next.slAdr;

    if (address < 0 || address >= next.memory.length) {
        return trap(
            next,
            'MEMORY_OUT_OF_RANGE',
            'Memory address is out of range.',
        );
    }

    const value =
        width === 1
            ? next.memory[address]
            : [next.memory[address], next.memory[address + 1]];

    if (
        value === undefined ||
        (Array.isArray(value) && value.some((cell) => cell === undefined))
    ) {
        return trap(
            next,
            'MEMORY_OUT_OF_RANGE',
            'Memory read is out of range.',
        );
    }

    next.mlVal = value as BusValue;
    next.slVal = value as BusValue;
    return { state: next };
}

function applyBrWrite(next: MutableCpuState): ApplyResult {
    const value = next.slVal;

    if (!isBusTuple(value) || !isOpcode(value[0])) {
        return trap(
            next,
            'INVALID_OPCODE',
            'Fetched value is not a valid opcode.',
        );
    }

    const [opcode, operand] = value;

    next.br = { opcode, operand };
    return { state: next };
}

function applyDecode(next: MutableCpuState): ApplyResult {
    if (next.br.opcode === null || !isOpcode(next.br.opcode)) {
        return trap(next, 'INVALID_OPCODE', 'Cannot decode an invalid opcode.');
    }

    next.decoded = formatDecoded(next.br.opcode, next.br.operand);
    return { state: next };
}

function applyPcUpdate(next: MutableCpuState): ApplyResult {
    if (next.br.opcode === null) {
        return trap(next, 'INVALID_OPCODE', 'No instruction is loaded.');
    }

    // PC counts instructions, never memory cells. The fetch address is looked
    // up from the instruction-address table on the next PC_READ.
    next.pc += 1;
    return { state: next };
}

function applyBrReadOperand(next: MutableCpuState): ApplyResult {
    const opcode = next.br.opcode;

    if (opcode === null) {
        return trap(next, 'INVALID_OPCODE', 'No instruction is loaded.');
    }

    const latch = getOperandLatch(getOperandModeForOpcode(opcode));

    if (latch === undefined) {
        return trap(
            next,
            'INVALID_OPCODE',
            'Instruction does not take an operand.',
        );
    }

    if (latch === 'address') {
        next.slAdr = next.br.operand;
    } else {
        next.slVal = next.br.operand;
    }

    return { state: next };
}

function applyInputRead(
    next: MutableCpuState,
    input: Word | undefined,
): ApplyResult {
    if (input === undefined) {
        return { state: next, needsInput: true };
    }

    if (!isWord(input)) {
        return trap(
            next,
            'INPUT_OUT_OF_RANGE',
            'Input value is outside the valid range.',
        );
    }

    next.ein = input;
    next.slVal = input;
    return { state: next };
}

function applyMemWrite(next: MutableCpuState): ApplyResult {
    const value = asWord(next.slVal);

    if (value === undefined) {
        return trap(
            next,
            'MEMORY_OUT_OF_RANGE',
            'Cannot store a multi-cell value.',
        );
    }

    if (next.slAdr < 0 || next.slAdr >= next.memory.length) {
        return trap(
            next,
            'MEMORY_OUT_OF_RANGE',
            'Memory address is out of range.',
        );
    }

    const memory = [...next.memory];
    memory[next.slAdr] = value;
    next.memory = memory;
    return { state: next };
}

function applyAcWrite(next: MutableCpuState): ApplyResult {
    const value = asWord(next.slVal);

    if (value === undefined) {
        return trap(
            next,
            'OVERFLOW',
            'Cannot load a multi-cell value into AC.',
        );
    }

    next.ac = value;
    return { state: next };
}

function applyAcRead(next: MutableCpuState): ApplyResult {
    next.slVal = next.ac;
    return { state: next };
}

function applyOpWrite(next: MutableCpuState): ApplyResult {
    const value = asWord(next.slVal);

    if (value === undefined) {
        return trap(
            next,
            'OVERFLOW',
            'Cannot load a multi-cell value into OP.',
        );
    }

    next.op = value;
    return { state: next };
}

function applyArWrite(next: MutableCpuState): ApplyResult {
    const operation = next.br.opcode ? getOperation(next.br.opcode) : null;

    next.operation = operation;
    next.ar = operationSymbol(operation);
    return { state: next };
}

function applyErgAcWrite(next: MutableCpuState): ApplyResult {
    next.ac = next.erg;
    return { state: next };
}

function applyErgVglWrite(next: MutableCpuState): ApplyResult {
    next.vgl = compareSymbol(next.erg);
    return { state: next };
}

function applyAusWrite(next: MutableCpuState): ApplyResult {
    const value = asWord(next.slVal);

    if (value === undefined) {
        return trap(
            next,
            'OVERFLOW',
            'Cannot write a multi-cell value to AUS.',
        );
    }

    next.aus = value;
    return { state: next };
}

function applyPcWrite(next: MutableCpuState): ApplyResult {
    const target = next.slAdr;
    const pc = next.addressToPc.get(target);

    if (pc === undefined) {
        return trap(
            next,
            'PC_OUT_OF_RANGE',
            'Jump target is not an instruction boundary.',
        );
    }

    next.pc = pc;
    next.instructionAddress = target;
    return { state: next };
}

function applyHalt(next: MutableCpuState): ApplyResult {
    next.halted = true;
    return { state: next };
}

function calculate(state: MutableCpuState): ApplyResult {
    const operation = state.operation;

    if (operation === null) {
        return trap(state, 'INVALID_OPCODE', 'No operation is selected.');
    }

    if (operation === 'jump' || operation.startsWith('jump-')) {
        return trap(
            state,
            'INVALID_OPCODE',
            'Jump instruction reached the ALU.',
        );
    }

    let result: number;

    switch (operation) {
        case 'add':
            result = state.ac + state.op;
            break;
        case 'subtract':
            result = state.ac - state.op;
            break;
        case 'multiply':
            result = state.ac * state.op;
            break;
        case 'divide':
            if (state.op === 0) {
                return trap(state, 'DIVISION_BY_ZERO', 'Division by zero.');
            }
            result = Math.floor(state.ac / state.op);
            break;
        case 'modulo':
            if (state.op === 0) {
                return trap(state, 'DIVISION_BY_ZERO', 'Modulo by zero.');
            }
            result = ((state.ac % state.op) + state.op) % state.op;
            break;
        case 'compare':
            result = state.ac < state.op ? -1 : state.ac > state.op ? 1 : 0;
            break;
        default:
            return trap(state, 'INVALID_OPCODE', 'Unsupported ALU operation.');
    }

    if (result < MIN_WORD || result > MAX_WORD) {
        return trap(
            state,
            'OVERFLOW',
            'Arithmetic result is outside the valid range.',
        );
    }

    state.erg = result;
    return { state };
}

function checkCompare(state: MutableCpuState): ApplyResult {
    if (state.vgl === '') {
        return trap(
            state,
            'COMPARE_NOT_SET',
            'Comparison register is not set.',
        );
    }

    const opcode = state.br.opcode;

    if (opcode === null) {
        return trap(state, 'INVALID_OPCODE', 'No instruction is loaded.');
    }

    const instruction = getInstructionByOpcode(opcode);

    if (!instruction.compare) {
        return trap(
            state,
            'INVALID_OPCODE',
            'Instruction has no comparison condition.',
        );
    }

    return state.vgl === instruction.compare
        ? { state }
        : { state, skipRemaining: true };
}

function trap(
    state: CpuState,
    code: Parameters<typeof createTrap>[0],
    message: string,
): ApplyResult {
    return {
        state,
        trap: createTrap(code, message),
    };
}

function advancePhase(state: CpuState): CpuState {
    switch (state.phase) {
        case 'FETCH':
            return { ...state, phase: 'DECODE', queue: [], queueIndex: 0 };
        case 'DECODE':
            return { ...state, phase: 'EXECUTE', queue: [], queueIndex: 0 };
        case 'EXECUTE':
            return state.halted
                ? { ...state, phase: 'HALTED', queue: [], queueIndex: 0 }
                : { ...state, phase: 'FETCH', queue: [], queueIndex: 0 };
        case 'HALTED':
            return state;
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
        description: describe(microOp),
    };
}

function describe(microOp: MicroOp): string {
    switch (microOp.kind) {
        case 'PC_READ':
            return 'Read the program counter.';
        case 'MEM_READ':
            return `Read ${microOp.width} memory cell${microOp.width === 1 ? '' : 's'}.`;
        case 'BR_WRITE':
            return 'Write the instruction register.';
        case 'DECODE':
            return 'Decode the instruction.';
        case 'PC_UPDATE':
            return 'Update the program counter.';
        case 'BR_READ_OPERAND':
            return 'Read the instruction operand.';
        case 'INPUT_READ':
            return 'Read the input register.';
        case 'MEM_WRITE':
            return 'Write to memory.';
        case 'AC_WRITE':
            return 'Write the accumulator.';
        case 'AC_READ':
            return 'Read the accumulator.';
        case 'OP_WRITE':
            return 'Write the operand register.';
        case 'AR_WRITE':
            return 'Select the ALU operation.';
        case 'ALU_CALC':
            return 'Calculate the ALU result.';
        case 'ERG_AC_WRITE':
            return 'Write the result to the accumulator.';
        case 'ERG_VGL_WRITE':
            return 'Write the result to the comparison register.';
        case 'AUS_WRITE':
            return 'Write the output register.';
        case 'VGL_READ':
            return 'Check the comparison register.';
        case 'PC_WRITE':
            return 'Write the program counter.';
        case 'HALT':
            return 'Halt the machine.';
    }
}

function operationSymbol(operation: Operation | null): string {
    switch (operation) {
        case 'add':
            return '+';
        case 'subtract':
            return '-';
        case 'multiply':
            return '*';
        case 'divide':
            return '/';
        case 'modulo':
            return '%';
        case 'compare':
            return '?';
        default:
            return '';
    }
}

function compareSymbol(value: Word): Compare {
    if (value < 0) {
        return '<';
    }

    if (value > 0) {
        return '>';
    }

    return '=';
}

function isBusTuple(value: BusValue): value is readonly [Word, Word] {
    return Array.isArray(value);
}

function asWord(value: BusValue): Word | undefined {
    return typeof value === 'number' ? value : undefined;
}
