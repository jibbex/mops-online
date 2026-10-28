// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { disassemble } from './disassembler';

describe('disassemble', () => {
    it('decodes every operand mode and stops at halt', () => {
        const result = disassemble([10, 64, 11, 5, 50, 4, 60, 11, 9]);

        expect(result).toEqual([
            { address: 0, opcode: 10, operand: 64, text: 'ld $64' },
            { address: 2, opcode: 11, operand: 5, text: 'ld 5' },
            { address: 4, opcode: 50, operand: 4, text: 'jmp #4' },
            { address: 6, opcode: 60, operand: null, text: 'end' },
        ]);
    });

    it('falls back to .word for invalid opcodes and continues', () => {
        const result = disassemble([1, 11, 5, 60]);

        expect(result).toEqual([
            { address: 0, opcode: null, operand: 1, text: '.word 1' },
            { address: 1, opcode: 11, operand: 5, text: 'ld 5' },
            { address: 3, opcode: 60, operand: null, text: 'end' },
        ]);
    });

    it('supports a custom start address', () => {
        const result = disassemble([60, 60, 11, 5, 60], 2);

        expect(result).toEqual([
            { address: 2, opcode: 11, operand: 5, text: 'ld 5' },
            { address: 4, opcode: 60, operand: null, text: 'end' },
        ]);
    });

    it('uses zero for a missing operand cell', () => {
        const result = disassemble([10]);

        expect(result).toEqual([
            { address: 0, opcode: 10, operand: 0, text: 'ld $0' },
        ]);
    });
});
