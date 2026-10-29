/**
 * Micro-op handlers for the MOPS VM.
 *
 * Each handler owns its state transition and its UI description, so a
 * micro-op is defined in exactly one place. Handlers never mutate the state
 * they receive; they return a new state that shares every unchanged field.
 * Queue scheduling and phase advancement remain in `step.ts`.
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

/** The program counter advances one instruction per fetch. */
const PC_INCREMENT = 1;

/** Encoded operands occupy the cell after the opcode. */
const OPERAND_CELL_OFFSET = 1;

/** Result of applying one micro-op. */
export interface MicroOpResult {
    readonly state: CpuState;
    readonly needsInput?: boolean;
    readonly trap?: Trap;
    readonly skipRemaining?: boolean;
}

/** Applies one micro-op to an immutable state and returns the next state. */
export type MicroHandler = (state: CpuState, input?: Word) => MicroOpResult;

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

function applyPcRead(state: CpuState): MicroOpResult {
    const address = state.instructionAddresses[state.pc];

    if (address === undefined) {
        return trap(
            state,
            'PC_OUT_OF_RANGE',
            'Program counter is out of range.',
        );
    }

    return {
        state: {
            ...state,
            slAdr: address,
            instructionAddress: address,
        },
    };
}

function applyMemRead(state: CpuState): MicroOpResult {
    const address = state.slAdr;

    if (address < 0 || address >= state.memory.length) {
        return trap(
            state,
            'MEMORY_OUT_OF_RANGE',
            'Memory address is out of range.',
        );
    }

    const value = state.memory[address];

    if (value === undefined) {
        return trap(
            state,
            'MEMORY_OUT_OF_RANGE',
            'Memory read is out of range.',
        );
    }

    return { state: { ...state, mlVal: value, slVal: value } };
}

function applyBrWrite(state: CpuState): MicroOpResult {
    const opcode = asWord(state.slVal);

    if (opcode === undefined || !isOpcode(opcode)) {
        return trap(
            state,
            'INVALID_OPCODE',
            'Fetched value is not a valid opcode.',
        );
    }

    const br = { opcode, operand: 0 };

    if (getOperandModeForOpcode(opcode) === 'none') {
        return { state: { ...state, br } };
    }

    return {
        state: {
            ...state,
            br,
            slAdr: state.instructionAddress + OPERAND_CELL_OFFSET,
        },
    };
}

function applyBrWriteOperand(state: CpuState): MicroOpResult {
    const value = asWord(state.slVal);
    const opcode = state.br.opcode;

    if (value === undefined || opcode === null) {
        return trap(
            state,
            'INVALID_OPCODE',
            'Fetched operand is not loaded into the instruction register.',
        );
    }

    return { state: { ...state, br: { opcode, operand: value } } };
}

function applyDecode(state: CpuState): MicroOpResult {
    const opcode = state.br.opcode;

    if (opcode === null || !isOpcode(opcode)) {
        return trap(
            state,
            'INVALID_OPCODE',
            'Cannot decode an invalid opcode.',
        );
    }

    return {
        state: {
            ...state,
            decoded: formatDecoded(opcode, state.br.operand),
        },
    };
}

function applyPcUpdate(state: CpuState): MicroOpResult {
    // PC counts instructions, never memory cells. The fetch address is looked
    // up from the instruction-address table on the next PC_READ.
    return { state: { ...state, pc: state.pc + PC_INCREMENT } };
}

function applyBrReadOperand(state: CpuState): MicroOpResult {
    const opcode = state.br.opcode;

    if (opcode === null) {
        return trap(state, 'INVALID_OPCODE', 'No instruction is loaded.');
    }

    const latch = getOperandLatch(getOperandModeForOpcode(opcode));

    if (latch === undefined) {
        return trap(
            state,
            'INVALID_OPCODE',
            'Instruction does not take an operand.',
        );
    }

    return latch === 'address'
        ? { state: { ...state, slAdr: state.br.operand } }
        : { state: { ...state, slVal: state.br.operand } };
}

function applyInputRead(
    state: CpuState,
    input: Word | undefined,
): MicroOpResult {
    if (input === undefined) {
        return { state, needsInput: true };
    }

    if (!isWord(input)) {
        return trap(
            state,
            'INPUT_OUT_OF_RANGE',
            'Input value is outside the valid range.',
        );
    }

    return { state: { ...state, ein: input, slVal: input } };
}

function applyMemWrite(state: CpuState): MicroOpResult {
    const value = asWord(state.slVal);

    if (value === undefined) {
        return trap(
            state,
            'MEMORY_OUT_OF_RANGE',
            'Cannot store a multi-cell value.',
        );
    }

    if (state.slAdr < 0 || state.slAdr >= state.memory.length) {
        return trap(
            state,
            'MEMORY_OUT_OF_RANGE',
            'Memory address is out of range.',
        );
    }

    const memory = [...state.memory];
    memory[state.slAdr] = value;
    return { state: { ...state, memory } };
}

function applyAcWrite(state: CpuState): MicroOpResult {
    const value = asWord(state.slVal);

    if (value === undefined) {
        return trap(
            state,
            'OVERFLOW',
            'Cannot load a multi-cell value into AC.',
        );
    }

    return { state: { ...state, ac: value } };
}

function applyAcRead(state: CpuState): MicroOpResult {
    return { state: { ...state, slVal: state.ac } };
}

function applyOpWrite(state: CpuState): MicroOpResult {
    const value = asWord(state.slVal);

    if (value === undefined) {
        return trap(
            state,
            'OVERFLOW',
            'Cannot load a multi-cell value into OP.',
        );
    }

    return { state: { ...state, op: value } };
}

function applyArWrite(state: CpuState): MicroOpResult {
    const operation = state.br.opcode ? getOperation(state.br.opcode) : null;

    return {
        state: {
            ...state,
            operation,
            ar: operationSymbol(operation),
        },
    };
}

function applyAluCalc(state: CpuState): MicroOpResult {
    const result = calculateAlu(state.operation, state.ac, state.op);

    if (!result.ok) {
        return trap(state, result.code, result.message);
    }

    return { state: { ...state, erg: result.value } };
}

function applyErgAcWrite(state: CpuState): MicroOpResult {
    return { state: { ...state, ac: state.erg } };
}

function applyErgVglWrite(state: CpuState): MicroOpResult {
    return { state: { ...state, vgl: compareSymbol(state.erg) } };
}

function applyAusWrite(state: CpuState): MicroOpResult {
    const value = asWord(state.slVal);

    if (value === undefined) {
        return trap(
            state,
            'OVERFLOW',
            'Cannot write a multi-cell value to AUS.',
        );
    }

    return { state: { ...state, aus: value } };
}

function applyPcWrite(state: CpuState): MicroOpResult {
    const target = state.slAdr;
    const pc = state.addressToPc.get(target);

    if (pc === undefined) {
        return trap(
            state,
            'PC_OUT_OF_RANGE',
            'Jump target is not an instruction boundary.',
        );
    }

    return {
        state: {
            ...state,
            pc,
            instructionAddress: target,
        },
    };
}

function applyHalt(state: CpuState): MicroOpResult {
    return { state: { ...state, halted: true } };
}

function checkCompare(state: CpuState): MicroOpResult {
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
