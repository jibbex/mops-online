/**
 * Runtime traps raised by the MOPS VM.
 *
 * @module core/vm/traps
 */

/** Stable runtime-failure codes. */
export type TrapCode =
    | 'DIVISION_BY_ZERO'
    | 'OVERFLOW'
    | 'COMPARE_NOT_SET'
    | 'INVALID_OPCODE'
    | 'PC_OUT_OF_RANGE'
    | 'MEMORY_OUT_OF_RANGE'
    | 'INPUT_OUT_OF_RANGE';

/** One controlled runtime failure. */
export interface Trap {
    readonly code: TrapCode;
    readonly message: string;
}

/**
 * Creates a runtime trap.
 *
 * @param code Stable trap code.
 * @param message Human-readable explanation.
 * @returns The trap value.
 */
export function createTrap(code: TrapCode, message: string): Trap {
    return { code, message };
}
