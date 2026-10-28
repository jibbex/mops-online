/**
 * Canonical opcode values for the MOPS instruction set.
 *
 * This module is the single source of truth for numeric opcode values. The
 * assembler, VM, and disassembler must refer to these constants rather than
 * duplicating numbers.
 *
 * @module core/isa/opcodes
 */

export const OPCODES = {
    LOAD_ADDRESS: 10,
    LOAD_IMMEDIATE: 11,
    STORE: 12,
    INPUT: 20,
    OUTPUT_ADDRESS: 22,
    OUTPUT_IMMEDIATE: 23,
    ADD_ADDRESS: 30,
    ADD_IMMEDIATE: 31,
    SUBTRACT_ADDRESS: 32,
    SUBTRACT_IMMEDIATE: 33,
    MULTIPLY_ADDRESS: 34,
    MULTIPLY_IMMEDIATE: 35,
    DIVIDE_ADDRESS: 36,
    DIVIDE_IMMEDIATE: 37,
    MODULO_ADDRESS: 38,
    MODULO_IMMEDIATE: 39,
    COMPARE_ADDRESS: 40,
    COMPARE_IMMEDIATE: 41,
    JUMP: 50,
    JUMP_IF_LESS: 52,
    JUMP_IF_EQUAL: 54,
    JUMP_IF_GREATER: 56,
    HALT: 60,
} as const;

/** Numeric opcode accepted by the machine. */
export type Opcode = (typeof OPCODES)[keyof typeof OPCODES];

/**
 * Every valid opcode in instruction order.
 *
 * The tuple is intentionally explicit so that tests can verify the full set and
 * consumers can iterate over it without relying on object key order.
 */
export const OPCODE_VALUES = [
    OPCODES.LOAD_ADDRESS,
    OPCODES.LOAD_IMMEDIATE,
    OPCODES.STORE,
    OPCODES.INPUT,
    OPCODES.OUTPUT_ADDRESS,
    OPCODES.OUTPUT_IMMEDIATE,
    OPCODES.ADD_ADDRESS,
    OPCODES.ADD_IMMEDIATE,
    OPCODES.SUBTRACT_ADDRESS,
    OPCODES.SUBTRACT_IMMEDIATE,
    OPCODES.MULTIPLY_ADDRESS,
    OPCODES.MULTIPLY_IMMEDIATE,
    OPCODES.DIVIDE_ADDRESS,
    OPCODES.DIVIDE_IMMEDIATE,
    OPCODES.MODULO_ADDRESS,
    OPCODES.MODULO_IMMEDIATE,
    OPCODES.COMPARE_ADDRESS,
    OPCODES.COMPARE_IMMEDIATE,
    OPCODES.JUMP,
    OPCODES.JUMP_IF_LESS,
    OPCODES.JUMP_IF_EQUAL,
    OPCODES.JUMP_IF_GREATER,
    OPCODES.HALT,
] as const satisfies readonly Opcode[];

const OPCODE_SET: ReadonlySet<number> = new Set(OPCODE_VALUES);

/**
 * Returns whether a value is a valid MOPS opcode.
 *
 * @param value The value read from memory or supplied by a caller.
 */
export function isOpcode(value: unknown): value is Opcode {
    return typeof value === 'number' && OPCODE_SET.has(value);
}
