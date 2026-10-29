/**
 * Micro-op handlers for the MOPS VM.
 *
 * Each handler owns its state transition and its UI description, so a
 * micro-op is defined in exactly one place. Queue scheduling and phase
 * advancement remain in `step.ts`; the handler only applies one step.
 *
 * @module core/vm/micro-handlers
 */

import {
    getInstructionByOpcode,
    getOperandLatch,
    getOperandModeForOpcode,
    getOperation,
    isOpcode,
    type Compare,
    type MicroOp,
    type Operation,
} from '@/core/isa';
import { isWord, type Word } from '@/core/object';
import { calculateAlu } from './alu';
import { formatDecoded, type BusValue, type CpuState } from './cpu';
import { createTrap, type Trap } from './traps';

/** CPU state with readonly modifiers removed for in-place handler writes. */
export type MutableCpuState = {
    -readonly [Key in keyof CpuState]: CpuState[Key];
};

/** Result of applying one micro-op. */
export interface MicroOpResult {
    readonly state: CpuState;
    readonly needsInput?: boolean;
    readonly trap?: Trap;
    readonly skipRemaining?: boolean;
}

/** Applies one micro-op to a mutable state clone. */
export type MicroHandler = (
    state: MutableCpuState,
    input?: Word,
) => MicroOpResult;

/** One micro-op transition and the text shown for it in the UI. */
export interface MicroOpDefinition {
    readonly apply: MicroHandler;
    readonly description: string;
}

/**
 * Complete micro-op table.
 *
 * The mapped record makes the compiler reject a missing handler when the
 * `MicroOp` union grows.
 */
export const MICRO_OPS: Record<MicroOp['kind'], MicroOpDefinition> = {
    PC_READ: {
        apply: applyPcRead,
        description: 'Read the program counter.',
    },
    MEM_READ: {
        apply: applyMemRead,
        description: 'Read one memory cell.',
    },
    BR_WRITE: {
        apply: applyBrWrite,
        description: 'Write the instruction opcode.',
    },
    DECODE: {
        apply: applyDecode,
        description: 'Decode the instruction.',
    },
    PC_UPDATE: {
        apply: applyPcUpdate,
        description: 'Update the program counter.',
    },
    BR_WRITE_OPERAND: {
        apply: applyBrWriteOperand,
        description: 'Write the instruction operand.',
    },
    BR_READ_OPERAND: {
        apply: applyBrReadOperand,
        description: 'Read the instruction operand.',
    },
    INPUT_READ: {
        apply: applyInputRead,
        description: 'Read the input register.',
    },
    MEM_WRITE: {
        apply: applyMemWrite,
        description: 'Write to memory.',
    },
    AC_WRITE: {
        apply: applyAcWrite,
        description: 'Write the accumulator.',
    },
    AC_READ: {
        apply: applyAcRead,
        description: 'Read the accumulator.',
    },
    OP_WRITE: {
        apply: applyOpWrite,
        description: 'Write the operand register.',
    },
    AR_WRITE: {
        apply: applyArWrite,
        description: 'Select the ALU operation.',
    },
    ALU_CALC: {
        apply: applyAluCalc,
        description: 'Calculate the ALU result.',
    },
    ERG_AC_WRITE: {
        apply: applyErgAcWrite,
        description: 'Write the result to the accumulator.',
    },
    ERG_VGL_WRITE: {
        apply: applyErgVglWrite,
        description: 'Write the result to the comparison register.',
    },
    AUS_WRITE: {
        apply: applyAusWrite,
        description: 'Write the output register.',
    },
    VGL_READ: {
        apply: checkCompare,
        description: 'Check the comparison register.',
    },
    PC_WRITE: {
        apply: applyPcWrite,
        description: 'Write the program counter.',
    },
    HALT: {
        apply: applyHalt,
        description: 'Halt the machine.',
    },
};

function applyPcRead(next: MutableCpuState): MicroOpResult {
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

function applyMemRead(next: MutableCpuState): MicroOpResult {
    const address = next.slAdr;

    if (address < 0 || address >= next.memory.length) {
        return trap(
            next,
            'MEMORY_OUT_OF_RANGE',
            'Memory address is out of range.',
        );
    }

    const value = next.memory[address];

    if (value === undefined) {
        return trap(
            next,
            'MEMORY_OUT_OF_RANGE',
            'Memory read is out of range.',
        );
    }

    next.mlVal = value;
    next.slVal = value;
    return { state: next };
}

function applyBrWrite(next: MutableCpuState): MicroOpResult {
    const opcode = asWord(next.slVal);

    if (opcode === undefined || !isOpcode(opcode)) {
        return trap(
            next,
            'INVALID_OPCODE',
            'Fetched value is not a valid opcode.',
        );
    }

    next.br = { opcode, operand: 0 };

    if (getOperandModeForOpcode(opcode) !== 'none') {
        next.slAdr = next.instructionAddress + 1;
    }

    return { state: next };
}

function applyBrWriteOperand(next: MutableCpuState): MicroOpResult {
    const value = asWord(next.slVal);

    if (value === undefined || next.br.opcode === null) {
        return trap(
            next,
            'INVALID_OPCODE',
            'Fetched operand is not loaded into the instruction register.',
        );
    }

    next.br = { opcode: next.br.opcode, operand: value };
    return { state: next };
}

function applyDecode(next: MutableCpuState): MicroOpResult {
    if (next.br.opcode === null || !isOpcode(next.br.opcode)) {
        return trap(next, 'INVALID_OPCODE', 'Cannot decode an invalid opcode.');
    }

    next.decoded = formatDecoded(next.br.opcode, next.br.operand);
    return { state: next };
}

function applyPcUpdate(next: MutableCpuState): MicroOpResult {
    // PC counts instructions, never memory cells. The fetch address is looked
    // up from the instruction-address table on the next PC_READ.
    next.pc += 1;
    return { state: next };
}

function applyBrReadOperand(next: MutableCpuState): MicroOpResult {
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
): MicroOpResult {
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

function applyMemWrite(next: MutableCpuState): MicroOpResult {
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

function applyAcWrite(next: MutableCpuState): MicroOpResult {
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

function applyAcRead(next: MutableCpuState): MicroOpResult {
    next.slVal = next.ac;
    return { state: next };
}

function applyOpWrite(next: MutableCpuState): MicroOpResult {
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

function applyArWrite(next: MutableCpuState): MicroOpResult {
    const operation = next.br.opcode ? getOperation(next.br.opcode) : null;

    next.operation = operation;
    next.ar = operationSymbol(operation);
    return { state: next };
}

function applyAluCalc(next: MutableCpuState): MicroOpResult {
    const result = calculateAlu(next.operation, next.ac, next.op);

    if (!result.ok) {
        return trap(next, result.code, result.message);
    }

    next.erg = result.value;
    return { state: next };
}

function applyErgAcWrite(next: MutableCpuState): MicroOpResult {
    next.ac = next.erg;
    return { state: next };
}

function applyErgVglWrite(next: MutableCpuState): MicroOpResult {
    next.vgl = compareSymbol(next.erg);
    return { state: next };
}

function applyAusWrite(next: MutableCpuState): MicroOpResult {
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

function applyPcWrite(next: MutableCpuState): MicroOpResult {
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

function applyHalt(next: MutableCpuState): MicroOpResult {
    next.halted = true;
    return { state: next };
}

function checkCompare(state: MutableCpuState): MicroOpResult {
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
): MicroOpResult {
    return {
        state,
        trap: createTrap(code, message),
    };
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

function asWord(value: BusValue): Word | undefined {
    return typeof value === 'number' ? value : undefined;
}
