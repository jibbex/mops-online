/**
 * ALU arithmetic for the MOPS VM.
 *
 * Division rounds toward negative infinity, and modulo follows the divisor
 * sign, so `(a / b) * b + (a % b) = a` holds for negative operands too. Both
 * rules are part of the documented ISA behavior and must stay in one place.
 *
 * @module core/vm/alu
 */

import type { Operation } from '@/core/isa';
import { MAX_WORD, MIN_WORD, type Word } from '@/core/object';
import type { TrapCode } from './traps';

/** Successful ALU result or the trap that must stop the machine. */
export type AluResult =
    | { readonly ok: true; readonly value: Word }
    | {
          readonly ok: false;
          readonly code: TrapCode;
          readonly message: string;
      };

/**
 * Applies one ALU operation to the accumulator and operand registers.
 *
 * @param operation Selected operation, or null before the ALU is configured.
 * @param ac Accumulator value.
 * @param op Operand value.
 */
export function calculateAlu(
    operation: Operation | null,
    ac: Word,
    op: Word,
): AluResult {
    if (operation === null) {
        return {
            ok: false,
            code: 'INVALID_OPCODE',
            message: 'No operation is selected.',
        };
    }

    if (operation === 'jump' || operation.startsWith('jump-')) {
        return {
            ok: false,
            code: 'INVALID_OPCODE',
            message: 'Jump instruction reached the ALU.',
        };
    }

    let result: number;

    switch (operation) {
        case 'add':
            result = ac + op;
            break;
        case 'subtract':
            result = ac - op;
            break;
        case 'multiply':
            result = ac * op;
            break;
        case 'divide':
            if (op === 0) {
                return {
                    ok: false,
                    code: 'DIVISION_BY_ZERO',
                    message: 'Division by zero.',
                };
            }
            result = Math.floor(ac / op);
            break;
        case 'modulo':
            if (op === 0) {
                return {
                    ok: false,
                    code: 'DIVISION_BY_ZERO',
                    message: 'Modulo by zero.',
                };
            }
            result = ((ac % op) + op) % op;
            break;
        case 'compare':
            result = ac < op ? -1 : ac > op ? 1 : 0;
            break;
        default:
            return {
                ok: false,
                code: 'INVALID_OPCODE',
                message: 'Unsupported ALU operation.',
            };
    }

    if (result < MIN_WORD || result > MAX_WORD) {
        return {
            ok: false,
            code: 'OVERFLOW',
            message: 'Arithmetic result is outside the valid range.',
        };
    }

    return { ok: true, value: result };
}
