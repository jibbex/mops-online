// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { OPCODE_VALUES, type Opcode } from './opcodes';
import { OPCODE_OPERATIONS, getOperation, type Operation } from './semantics';

const EXPECTED_OPERATIONS: Record<Opcode, Operation> = {
    10: 'load',
    11: 'load',
    12: 'store',
    20: 'input',
    22: 'output',
    23: 'output',
    30: 'add',
    31: 'add',
    32: 'subtract',
    33: 'subtract',
    34: 'multiply',
    35: 'multiply',
    36: 'divide',
    37: 'divide',
    38: 'modulo',
    39: 'modulo',
    40: 'compare',
    41: 'compare',
    50: 'jump',
    52: 'jump-if-less',
    54: 'jump-if-equal',
    56: 'jump-if-greater',
    60: 'halt',
};

describe('opcode semantics', () => {
    it('defines an operation for every opcode', () => {
        expect(Object.keys(OPCODE_OPERATIONS)).toHaveLength(
            OPCODE_VALUES.length,
        );

        for (const opcode of OPCODE_VALUES) {
            expect(getOperation(opcode)).toBeDefined();
        }
    });

    it('contains no operations for unknown opcodes', () => {
        const defined = new Set(
            Object.keys(OPCODE_OPERATIONS).map((key) => Number(key)),
        );

        for (const opcode of OPCODE_VALUES) {
            expect(defined.has(opcode)).toBe(true);
        }

        expect(defined.size).toBe(OPCODE_VALUES.length);
    });

    it('maps opcodes to the expected operations', () => {
        for (const [opcode, operation] of Object.entries(EXPECTED_OPERATIONS)) {
            expect(getOperation(Number(opcode) as Opcode)).toBe(operation);
        }
    });
});
