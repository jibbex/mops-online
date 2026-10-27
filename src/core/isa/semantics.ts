/**
 * Operation metadata for every MOPS opcode.
 *
 * The VM executes operations, not mnemonics. This mapping keeps the execution
 * semantics independent from assembler syntax and user-defined mnemonics.
 *
 * @module core/isa/semantics
 */

import { OPCODES, type Opcode } from './opcodes';

export type Operation =
    | 'load'
    | 'store'
    | 'input'
    | 'output'
    | 'add'
    | 'subtract'
    | 'multiply'
    | 'divide'
    | 'modulo'
    | 'compare'
    | 'jump'
    | 'jump-if-less'
    | 'jump-if-equal'
    | 'jump-if-greater'
    | 'halt';

/**
 * Maps each opcode to the operation performed by the VM.
 */
export const OPCODE_OPERATIONS = {
    [OPCODES.LOAD_ADDRESS]: 'load',
    [OPCODES.LOAD_IMMEDIATE]: 'load',
    [OPCODES.STORE]: 'store',
    [OPCODES.INPUT]: 'input',
    [OPCODES.OUTPUT_ADDRESS]: 'output',
    [OPCODES.OUTPUT_IMMEDIATE]: 'output',
    [OPCODES.ADD_ADDRESS]: 'add',
    [OPCODES.ADD_IMMEDIATE]: 'add',
    [OPCODES.SUBTRACT_ADDRESS]: 'subtract',
    [OPCODES.SUBTRACT_IMMEDIATE]: 'subtract',
    [OPCODES.MULTIPLY_ADDRESS]: 'multiply',
    [OPCODES.MULTIPLY_IMMEDIATE]: 'multiply',
    [OPCODES.DIVIDE_ADDRESS]: 'divide',
    [OPCODES.DIVIDE_IMMEDIATE]: 'divide',
    [OPCODES.MODULO_ADDRESS]: 'modulo',
    [OPCODES.MODULO_IMMEDIATE]: 'modulo',
    [OPCODES.COMPARE_ADDRESS]: 'compare',
    [OPCODES.COMPARE_IMMEDIATE]: 'compare',
    [OPCODES.JUMP]: 'jump',
    [OPCODES.JUMP_IF_LESS]: 'jump-if-less',
    [OPCODES.JUMP_IF_EQUAL]: 'jump-if-equal',
    [OPCODES.JUMP_IF_GREATER]: 'jump-if-greater',
    [OPCODES.HALT]: 'halt',
} as const satisfies Record<Opcode, Operation>;

/**
 * Returns the operation for a valid opcode.
 *
 * @param opcode A valid MOPS opcode.
 */
export function getOperation(opcode: Opcode): Operation {
    return OPCODE_OPERATIONS[opcode];
}
