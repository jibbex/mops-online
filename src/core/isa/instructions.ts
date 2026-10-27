/**
 * Canonical instruction metadata for the MOPS ISA.
 *
 * An instruction connects a mnemonic to one or more opcodes. The operand mode
 * selects the concrete opcode: address, immediate value, jump target, or no
 * operand.
 *
 * @module core/isa/instructions
 */

import { OPCODES, isOpcode, type Opcode } from './opcodes';

/** Encoding family selected by the operand syntax. */
export type OperandMode = 'address' | 'immediate' | 'target' | 'none';

/** Canonical instruction identifier. */
export type InstructionId =
    | 'ld'
    | 'st'
    | 'in'
    | 'out'
    | 'add'
    | 'sub'
    | 'mul'
    | 'div'
    | 'mod'
    | 'cmp'
    | 'jmp'
    | 'jlt'
    | 'jeq'
    | 'jgt'
    | 'end';

/** Canonical instruction metadata. */
export interface InstructionSpec {
    readonly id: InstructionId;
    /** Default source mnemonic. */
    readonly mnemonic: string;
    /** Concrete opcodes by operand mode. */
    readonly opcodes: Readonly<Partial<Record<OperandMode, Opcode>>>;
}

/**
 * The complete MOPS instruction table.
 *
 * Keep this table declarative. Encoding and decoding behavior must be derived
 * from it rather than repeated in assembler or VM code.
 */
export const ISA = {
    ld: {
        id: 'ld',
        mnemonic: 'ld',
        opcodes: {
            address: OPCODES.LOAD_ADDRESS,
            immediate: OPCODES.LOAD_IMMEDIATE,
        },
    },
    st: {
        id: 'st',
        mnemonic: 'st',
        opcodes: {
            address: OPCODES.STORE,
        },
    },
    in: {
        id: 'in',
        mnemonic: 'in',
        opcodes: {
            address: OPCODES.INPUT,
        },
    },
    out: {
        id: 'out',
        mnemonic: 'out',
        opcodes: {
            address: OPCODES.OUTPUT_ADDRESS,
            immediate: OPCODES.OUTPUT_IMMEDIATE,
        },
    },
    add: {
        id: 'add',
        mnemonic: 'add',
        opcodes: {
            address: OPCODES.ADD_ADDRESS,
            immediate: OPCODES.ADD_IMMEDIATE,
        },
    },
    sub: {
        id: 'sub',
        mnemonic: 'sub',
        opcodes: {
            address: OPCODES.SUBTRACT_ADDRESS,
            immediate: OPCODES.SUBTRACT_IMMEDIATE,
        },
    },
    mul: {
        id: 'mul',
        mnemonic: 'mul',
        opcodes: {
            address: OPCODES.MULTIPLY_ADDRESS,
            immediate: OPCODES.MULTIPLY_IMMEDIATE,
        },
    },
    div: {
        id: 'div',
        mnemonic: 'div',
        opcodes: {
            address: OPCODES.DIVIDE_ADDRESS,
            immediate: OPCODES.DIVIDE_IMMEDIATE,
        },
    },
    mod: {
        id: 'mod',
        mnemonic: 'mod',
        opcodes: {
            address: OPCODES.MODULO_ADDRESS,
            immediate: OPCODES.MODULO_IMMEDIATE,
        },
    },
    cmp: {
        id: 'cmp',
        mnemonic: 'cmp',
        opcodes: {
            address: OPCODES.COMPARE_ADDRESS,
            immediate: OPCODES.COMPARE_IMMEDIATE,
        },
    },
    jmp: {
        id: 'jmp',
        mnemonic: 'jmp',
        opcodes: {
            target: OPCODES.JUMP,
        },
    },
    jlt: {
        id: 'jlt',
        mnemonic: 'jlt',
        opcodes: {
            target: OPCODES.JUMP_IF_LESS,
        },
    },
    jeq: {
        id: 'jeq',
        mnemonic: 'jeq',
        opcodes: {
            target: OPCODES.JUMP_IF_EQUAL,
        },
    },
    jgt: {
        id: 'jgt',
        mnemonic: 'jgt',
        opcodes: {
            target: OPCODES.JUMP_IF_GREATER,
        },
    },
    end: {
        id: 'end',
        mnemonic: 'end',
        opcodes: {
            none: OPCODES.HALT,
        },
    },
} as const satisfies Record<InstructionId, InstructionSpec>;

/**
 * All instructions in declaration order.
 */
export const INSTRUCTIONS: readonly InstructionSpec[] = Object.values(ISA);

/**
 * All canonical instruction identifiers in declaration order.
 */
export const INSTRUCTION_IDS = Object.keys(ISA) as readonly InstructionId[];

const instructionByOpcode = new Map<Opcode, InstructionSpec>();
const operandModeByOpcode = new Map<Opcode, OperandMode>();

for (const instruction of INSTRUCTIONS) {
    for (const [mode, opcode] of Object.entries(instruction.opcodes) as [
        OperandMode,
        Opcode,
    ][]) {
        instructionByOpcode.set(opcode, instruction);
        operandModeByOpcode.set(opcode, mode);
    }
}

/**
 * Opcode-to-instruction lookup derived from {@link ISA}.
 */
export const OPCODE_TO_INSTRUCTION: ReadonlyMap<Opcode, InstructionSpec> =
    instructionByOpcode;

/**
 * Opcode-to-operand-mode lookup derived from {@link ISA}.
 */
export const OPERAND_MODE_BY_OPCODE: ReadonlyMap<Opcode, OperandMode> =
    operandModeByOpcode;

/**
 * Returns the instruction specification for a canonical identifier.
 *
 * @param id Canonical instruction identifier.
 */
export function getInstruction(id: InstructionId): InstructionSpec {
    return ISA[id];
}

/**
 * Returns whether a string is a canonical instruction identifier.
 *
 * Custom mnemonics are an assembler concern and are not part of the ISA.
 *
 * @param value The value to test.
 */
export function isInstructionId(value: string): value is InstructionId {
    return Object.hasOwn(ISA, value);
}

/**
 * Returns the instruction for an opcode, or `undefined` when the value is not a
 * valid opcode.
 *
 * @param opcode A value read from memory.
 */
export function findInstructionByOpcode(
    opcode: number,
): InstructionSpec | undefined {
    if (!isOpcode(opcode)) {
        return undefined;
    }

    return OPCODE_TO_INSTRUCTION.get(opcode);
}

/**
 * Returns the instruction for a valid opcode.
 *
 * @param opcode A valid MOPS opcode.
 * @throws When the ISA table is incomplete.
 */
export function getInstructionByOpcode(opcode: Opcode): InstructionSpec {
    const instruction = OPCODE_TO_INSTRUCTION.get(opcode);

    if (!instruction) {
        throw new Error(`No instruction is defined for opcode ${opcode}.`);
    }

    return instruction;
}

/**
 * Returns the operand mode for a valid opcode.
 *
 * @param opcode A valid MOPS opcode.
 * @throws When the ISA table is incomplete.
 */
export function getOperandModeForOpcode(opcode: Opcode): OperandMode {
    const mode = OPERAND_MODE_BY_OPCODE.get(opcode);

    if (!mode) {
        throw new Error(`No operand mode is defined for opcode ${opcode}.`);
    }

    return mode;
}

/**
 * Returns the opcode for an instruction and operand mode.
 *
 * @param id Canonical instruction identifier.
 * @param mode Operand mode to encode.
 */
export function getOpcode(
    id: InstructionId,
    mode: OperandMode,
): Opcode | undefined {
    return getInstruction(id).opcodes[mode];
}
