// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { calculateAlu } from './alu';

describe('calculateAlu', () => {
    it('applies every arithmetic operation', () => {
        expect(calculateAlu('add', 5, 3)).toEqual({ ok: true, value: 8 });
        expect(calculateAlu('subtract', 5, 3)).toEqual({ ok: true, value: 2 });
        expect(calculateAlu('multiply', 5, 3)).toEqual({ ok: true, value: 15 });
        expect(calculateAlu('divide', 7, 2)).toEqual({ ok: true, value: 3 });
        expect(calculateAlu('modulo', 7, 2)).toEqual({ ok: true, value: 1 });
    });

    it('compares without writing the accumulator', () => {
        expect(calculateAlu('compare', 1, 2)).toEqual({ ok: true, value: -1 });
        expect(calculateAlu('compare', 2, 1)).toEqual({ ok: true, value: 1 });
        expect(calculateAlu('compare', 2, 2)).toEqual({ ok: true, value: 0 });
    });

    it('rounds division toward negative infinity', () => {
        expect(calculateAlu('divide', -7, 2)).toEqual({ ok: true, value: -4 });
        expect(calculateAlu('divide', 7, -2)).toEqual({ ok: true, value: -4 });
        expect(calculateAlu('divide', -7, -2)).toEqual({ ok: true, value: 3 });
        expect(calculateAlu('divide', 7, 2)).toEqual({ ok: true, value: 3 });
    });

    it('uses the divisor sign for modulo', () => {
        expect(calculateAlu('modulo', -7, 2)).toEqual({ ok: true, value: 1 });
        expect(calculateAlu('modulo', 7, -2)).toEqual({ ok: true, value: -1 });
        expect(calculateAlu('modulo', -7, -2)).toEqual({ ok: true, value: -1 });
        expect(calculateAlu('modulo', 7, 2)).toEqual({ ok: true, value: 1 });
    });

    it('rejects division and modulo by zero', () => {
        expect(calculateAlu('divide', 1, 0)).toEqual({
            ok: false,
            code: 'DIVISION_BY_ZERO',
            message: 'Division by zero.',
        });
        expect(calculateAlu('modulo', 1, 0)).toEqual({
            ok: false,
            code: 'DIVISION_BY_ZERO',
            message: 'Modulo by zero.',
        });
    });

    it('accepts both word boundaries', () => {
        expect(calculateAlu('add', 9998, 1)).toEqual({ ok: true, value: 9999 });
        expect(calculateAlu('subtract', -9998, 1)).toEqual({
            ok: true,
            value: -9999,
        });
    });

    it('rejects results outside the word range', () => {
        expect(calculateAlu('add', 9999, 1)).toEqual({
            ok: false,
            code: 'OVERFLOW',
            message: 'Arithmetic result is outside the valid range.',
        });
        expect(calculateAlu('subtract', -9999, 1)).toEqual({
            ok: false,
            code: 'OVERFLOW',
            message: 'Arithmetic result is outside the valid range.',
        });
        expect(calculateAlu('multiply', 9999, 2)).toEqual({
            ok: false,
            code: 'OVERFLOW',
            message: 'Arithmetic result is outside the valid range.',
        });
    });

    it('rejects a missing or jump operation', () => {
        expect(calculateAlu(null, 1, 1)).toEqual({
            ok: false,
            code: 'INVALID_OPCODE',
            message: 'No operation is selected.',
        });
        expect(calculateAlu('jump', 1, 1)).toEqual({
            ok: false,
            code: 'INVALID_OPCODE',
            message: 'Jump instruction reached the ALU.',
        });
    });
});
