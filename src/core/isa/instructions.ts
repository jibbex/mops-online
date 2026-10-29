/**
 * Canonical instruction metadata for the MOPS ISA.
 *
 * An instruction connects a mnemonic to one or more opcodes. The operand mode
 * selects the concrete opcode: address, immediate value, jump target, or no
 * operand.
 *
 * @module core/isa/instructions
 */

import type { MicroOp } from '@/core/vm/microops';
import { OPCODES, isOpcode, type Opcode } from './opcodes';

/** Encoding family selected by the operand syntax. */
export type OperandMode = 'address' | 'immediate' | 'target' | 'none';

/** Comparison selected by a conditional jump. */
export type Comparison = '<' | '=' | '>';

/**
 * Operand forms the assembler can resolve without knowing the instruction ID.
 *
 * The family is derived from the opcode table so the table remains the single
 * source of truth for which operand forms an instruction accepts.
 */
export type OperandFamily =
    'none' | 'address' | 'address-or-immediate' | 'target';

/**
 * Internal latch that carries an operand into the execute phase.
 *
 * Address and target operands use the address latch; immediate operands use
 * the value latch.
 */
export type OperandLatch = 'address' | 'value';

/**
 * Returns the operand latch selected by an operand mode.
 *
 * @param mode The operand mode encoded by the opcode.
 * @returns The latch name, or `undefined` for instructions without an operand.
 */
export function getOperandLatch(mode: OperandMode): OperandLatch | undefined {
    switch (mode) {
        case 'address':
        case 'target':
            return 'address';
        case 'immediate':
            return 'value';
        case 'none':
            return undefined;
    }
}

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
    /**
     * Execute-phase micro-ops by operand mode.
     *
     * Keeping the sequence next to the opcode table makes a new instruction a
     * single ISA change instead of coordinated edits in the VM. The import is
     * type-only, so the ISA does not acquire a runtime dependency on the VM.
     */
    readonly execution: Readonly<
        Partial<Record<OperandMode, readonly MicroOp[]>>
    >;
    /** Whether this instruction terminates program encoding. */
    readonly terminates?: true;
    /** Whether this instruction writes the comparison register. */
    readonly writesCompare?: true;
    /** Whether this instruction requires a prior comparison. */
    readonly requiresCompare?: true;
    /** Comparison that must match for a conditional jump. */
    readonly compare?: Comparison;
}

/**
 * Execute sequences are data, not VM branches.
 *
 * Sharing the common sequences keeps the table readable; instruction-specific
 * behavior remains visible at the point where an instruction is declared.
 */
const LOAD_ADDRESS_EXECUTION: readonly MicroOp[] = [
    { kind: 'BR_READ_OPERAND' },
    { kind: 'MEM_READ', width: 1 },
    { kind: 'AC_WRITE' },
];

const LOAD_IMMEDIATE_EXECUTION: readonly MicroOp[] = [
    { kind: 'BR_READ_OPERAND' },
    { kind: 'AC_WRITE' },
];

const STORE_EXECUTION: readonly MicroOp[] = [
    { kind: 'AC_READ' },
    { kind: 'BR_READ_OPERAND' },
    { kind: 'MEM_WRITE' },
];

const INPUT_EXECUTION: readonly MicroOp[] = [
    { kind: 'INPUT_READ' },
    { kind: 'BR_READ_OPERAND' },
    { kind: 'MEM_WRITE' },
];

const OUTPUT_ADDRESS_EXECUTION: readonly MicroOp[] = [
    { kind: 'BR_READ_OPERAND' },
    { kind: 'MEM_READ', width: 1 },
    { kind: 'AUS_WRITE' },
];

const OUTPUT_IMMEDIATE_EXECUTION: readonly MicroOp[] = [
    { kind: 'BR_READ_OPERAND' },
    { kind: 'AUS_WRITE' },
];

const ARITHMETIC_ADDRESS_EXECUTION: readonly MicroOp[] = [
    { kind: 'BR_READ_OPERAND' },
    { kind: 'MEM_READ', width: 1 },
    { kind: 'OP_WRITE' },
    { kind: 'AR_WRITE' },
    { kind: 'ALU_CALC' },
    { kind: 'ERG_AC_WRITE' },
];

const ARITHMETIC_IMMEDIATE_EXECUTION: readonly MicroOp[] = [
    { kind: 'BR_READ_OPERAND' },
    { kind: 'OP_WRITE' },
    { kind: 'AR_WRITE' },
    { kind: 'ALU_CALC' },
    { kind: 'ERG_AC_WRITE' },
];

const COMPARE_ADDRESS_EXECUTION: readonly MicroOp[] = [
    { kind: 'BR_READ_OPERAND' },
    { kind: 'MEM_READ', width: 1 },
    { kind: 'OP_WRITE' },
    { kind: 'AR_WRITE' },
    { kind: 'ALU_CALC' },
    { kind: 'ERG_VGL_WRITE' },
];

const COMPARE_IMMEDIATE_EXECUTION: readonly MicroOp[] = [
    { kind: 'BR_READ_OPERAND' },
    { kind: 'OP_WRITE' },
    { kind: 'AR_WRITE' },
    { kind: 'ALU_CALC' },
    { kind: 'ERG_VGL_WRITE' },
];

const JUMP_EXECUTION: readonly MicroOp[] = [
    { kind: 'BR_READ_OPERAND' },
    { kind: 'BZ_WRITE' },
];

const CONDITIONAL_JUMP_EXECUTION: readonly MicroOp[] = [
    { kind: 'VGL_READ' },
    { kind: 'BR_READ_OPERAND' },
    { kind: 'BZ_WRITE' },
];

const HALT_EXECUTION: readonly MicroOp[] = [{ kind: 'HALT' }];

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
        execution: {
            address: LOAD_ADDRESS_EXECUTION,
            immediate: LOAD_IMMEDIATE_EXECUTION,
        },
    },
    st: {
        id: 'st',
        mnemonic: 'st',
        opcodes: {
            address: OPCODES.STORE,
        },
        execution: {
            address: STORE_EXECUTION,
        },
    },
    in: {
        id: 'in',
        mnemonic: 'in',
        opcodes: {
            address: OPCODES.INPUT,
        },
        execution: {
            address: INPUT_EXECUTION,
        },
    },
    out: {
        id: 'out',
        mnemonic: 'out',
        opcodes: {
            address: OPCODES.OUTPUT_ADDRESS,
            immediate: OPCODES.OUTPUT_IMMEDIATE,
        },
        execution: {
            address: OUTPUT_ADDRESS_EXECUTION,
            immediate: OUTPUT_IMMEDIATE_EXECUTION,
        },
    },
    add: {
        id: 'add',
        mnemonic: 'add',
        opcodes: {
            address: OPCODES.ADD_ADDRESS,
            immediate: OPCODES.ADD_IMMEDIATE,
        },
        execution: {
            address: ARITHMETIC_ADDRESS_EXECUTION,
            immediate: ARITHMETIC_IMMEDIATE_EXECUTION,
        },
    },
    sub: {
        id: 'sub',
        mnemonic: 'sub',
        opcodes: {
            address: OPCODES.SUBTRACT_ADDRESS,
            immediate: OPCODES.SUBTRACT_IMMEDIATE,
        },
        execution: {
            address: ARITHMETIC_ADDRESS_EXECUTION,
            immediate: ARITHMETIC_IMMEDIATE_EXECUTION,
        },
    },
    mul: {
        id: 'mul',
        mnemonic: 'mul',
        opcodes: {
            address: OPCODES.MULTIPLY_ADDRESS,
            immediate: OPCODES.MULTIPLY_IMMEDIATE,
        },
        execution: {
            address: ARITHMETIC_ADDRESS_EXECUTION,
            immediate: ARITHMETIC_IMMEDIATE_EXECUTION,
        },
    },
    div: {
        id: 'div',
        mnemonic: 'div',
        opcodes: {
            address: OPCODES.DIVIDE_ADDRESS,
            immediate: OPCODES.DIVIDE_IMMEDIATE,
        },
        execution: {
            address: ARITHMETIC_ADDRESS_EXECUTION,
            immediate: ARITHMETIC_IMMEDIATE_EXECUTION,
        },
    },
    mod: {
        id: 'mod',
        mnemonic: 'mod',
        opcodes: {
            address: OPCODES.MODULO_ADDRESS,
            immediate: OPCODES.MODULO_IMMEDIATE,
        },
        execution: {
            address: ARITHMETIC_ADDRESS_EXECUTION,
            immediate: ARITHMETIC_IMMEDIATE_EXECUTION,
        },
    },
    cmp: {
        id: 'cmp',
        mnemonic: 'cmp',
        opcodes: {
            address: OPCODES.COMPARE_ADDRESS,
            immediate: OPCODES.COMPARE_IMMEDIATE,
        },
        execution: {
            address: COMPARE_ADDRESS_EXECUTION,
            immediate: COMPARE_IMMEDIATE_EXECUTION,
        },
        writesCompare: true,
    },
    jmp: {
        id: 'jmp',
        mnemonic: 'jmp',
        opcodes: {
            target: OPCODES.JUMP,
        },
        execution: {
            target: JUMP_EXECUTION,
        },
    },
    jlt: {
        id: 'jlt',
        mnemonic: 'jlt',
        opcodes: {
            target: OPCODES.JUMP_IF_LESS,
        },
        execution: {
            target: CONDITIONAL_JUMP_EXECUTION,
        },
        requiresCompare: true,
        compare: '<',
    },
    jeq: {
        id: 'jeq',
        mnemonic: 'jeq',
        opcodes: {
            target: OPCODES.JUMP_IF_EQUAL,
        },
        execution: {
            target: CONDITIONAL_JUMP_EXECUTION,
        },
        requiresCompare: true,
        compare: '=',
    },
    jgt: {
        id: 'jgt',
        mnemonic: 'jgt',
        opcodes: {
            target: OPCODES.JUMP_IF_GREATER,
        },
        execution: {
            target: CONDITIONAL_JUMP_EXECUTION,
        },
        requiresCompare: true,
        compare: '>',
    },
    end: {
        id: 'end',
        mnemonic: 'end',
        opcodes: {
            none: OPCODES.HALT,
        },
        execution: {
            none: HALT_EXECUTION,
        },
        terminates: true,
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

/**
 * Returns the operand modes encoded by an instruction.
 *
 * @param instruction Instruction specification.
 */
export function getOperandModes(
    instruction: InstructionSpec,
): readonly OperandMode[] {
    return Object.keys(instruction.opcodes) as readonly OperandMode[];
}

/**
 * Returns the operand family for source-level operand resolution.
 *
 * The family is derived from the opcode table instead of duplicating the
 * instruction semantics in the parser or encoder.
 *
 * @param instruction Instruction specification.
 */
export function getOperandFamily(instruction: InstructionSpec): OperandFamily {
    const modes = getOperandModes(instruction);

    if (modes.length === 1 && modes[0] === 'none') {
        return 'none';
    }

    if (modes.includes('target')) {
        return 'target';
    }

    if (modes.length === 1 && modes[0] === 'address') {
        return 'address';
    }

    return 'address-or-immediate';
}

/**
 * Returns whether an instruction takes an operand.
 *
 * @param instruction Instruction specification.
 */
export function hasOperand(instruction: InstructionSpec): boolean {
    return getOperandFamily(instruction) !== 'none';
}

/**
 * Returns the execute-phase micro-op sequence for an opcode.
 *
 * @param opcode A valid MOPS opcode.
 * @throws When the ISA table is incomplete.
 */
export function getExecutionSequence(opcode: Opcode): readonly MicroOp[] {
    const instruction = getInstructionByOpcode(opcode);
    const mode = getOperandModeForOpcode(opcode);
    const sequence = instruction.execution[mode];

    if (!sequence) {
        throw new Error(
            `No execution sequence is defined for opcode ${opcode} (${mode}).`,
        );
    }

    return sequence;
}

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
