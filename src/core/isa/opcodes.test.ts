// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { OPCODES, OPCODE_VALUES, isOpcode } from './opcodes';

describe('opcodes', () => {
    it('defines every opcode exactly once', () => {
        expect(new Set(OPCODE_VALUES).size).toBe(OPCODE_VALUES.length);
        expect(OPCODE_VALUES).toHaveLength(23);
    });

    it('exposes the expected opcode values', () => {
        expect(OPCODE_VALUES).toEqual([
            10, 11, 12, 20, 22, 23, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
            41, 50, 52, 54, 56, 60,
        ]);
    });

    it('keeps the named constants aligned with the opcode list', () => {
        expect(OPCODE_VALUES).toEqual(Object.values(OPCODES));
    });

    it('accepts every valid opcode', () => {
        for (const opcode of OPCODE_VALUES) {
            expect(isOpcode(opcode)).toBe(true);
        }
    });

    it('rejects invalid opcodes', () => {
        for (const value of [0, 1, 13, 21, 51, 61, 99, -10]) {
            expect(isOpcode(value)).toBe(false);
        }
    });
});
