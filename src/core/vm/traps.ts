/**
 * Runtime traps raised by the MOPS VM.
 *
 * @module core/vm/traps
 */

export type TrapCode =
    | 'DIVISION_BY_ZERO'
    | 'OVERFLOW'
    | 'COMPARE_NOT_SET'
    | 'INVALID_OPCODE'
    | 'PC_OUT_OF_RANGE'
    | 'MEMORY_OUT_OF_RANGE'
    | 'INPUT_OUT_OF_RANGE';

export interface Trap {
    readonly code: TrapCode;
    readonly message: string;
}

export function createTrap(code: TrapCode, message: string): Trap {
    return { code, message };
}
