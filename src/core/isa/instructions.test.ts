// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { OPCODES, type Opcode } from './opcodes';
import {
    INSTRUCTIONS,
    INSTRUCTION_IDS,
    ISA,
    OPCODE_TO_INSTRUCTION,
    OPERAND_MODE_BY_OPCODE,
    findInstructionByOpcode,
    getInstruction,
    getInstructionByOpcode,
    getOpcode,
    getOperandLatch,
    getOperandModeForOpcode,
    isInstructionId,
    type InstructionId,
    type OperandMode,
} from './instructions';

const DEFINED_OPCODES = INSTRUCTIONS.flatMap((instruction) =>
    Object.values(instruction.opcodes).filter(
        (opcode): opcode is Opcode => opcode !== undefined,
    ),
);

describe('instruction table', () => {
    it('contains every canonical instruction', () => {
        expect(INSTRUCTIONS).toHaveLength(15);
        expect(INSTRUCTION_IDS).toHaveLength(15);
        expect(INSTRUCTION_IDS).toEqual([
            'ld',
            'st',
            'in',
            'out',
            'add',
            'sub',
            'mul',
            'div',
            'mod',
            'cmp',
            'jmp',
            'jlt',
            'jeq',
            'jgt',
            'end',
        ]);
    });

    it('defines the expected opcode families', () => {
        const expected: Record<
            InstructionId,
            Partial<Record<OperandMode, Opcode>>
        > = {
            ld: { address: 10, immediate: 11 },
            st: { address: 12 },
            in: { address: 20 },
            out: { address: 22, immediate: 23 },
            add: { address: 30, immediate: 31 },
            sub: { address: 32, immediate: 33 },
            mul: { address: 34, immediate: 35 },
            div: { address: 36, immediate: 37 },
            mod: { address: 38, immediate: 39 },
            cmp: { address: 40, immediate: 41 },
            jmp: { target: 50 },
            jlt: { target: 52 },
            jeq: { target: 54 },
            jgt: { target: 56 },
            end: { none: 60 },
        };

        for (const [id, opcodes] of Object.entries(expected)) {
            expect(ISA[id as InstructionId].opcodes).toEqual(opcodes);
        }
    });

    it('maps every opcode to exactly one instruction', () => {
        expect(DEFINED_OPCODES).toHaveLength(23);
        expect(new Set(DEFINED_OPCODES).size).toBe(23);
        expect(OPCODE_TO_INSTRUCTION.size).toBe(23);
    });

    it('maps every opcode back to its instruction and operand mode', () => {
        for (const instruction of INSTRUCTIONS) {
            for (const [mode, opcode] of Object.entries(instruction.opcodes)) {
                if (opcode === undefined) {
                    continue;
                }

                expect(getInstructionByOpcode(opcode)).toBe(instruction);
                expect(getOperandModeForOpcode(opcode)).toBe(mode);
                expect(OPCODE_TO_INSTRUCTION.get(opcode)).toBe(instruction);
                expect(OPERAND_MODE_BY_OPCODE.get(opcode)).toBe(mode);
            }
        }
    });

    it('selects the operand latch from the operand mode', () => {
        expect(getOperandLatch('address')).toBe('address');
        expect(getOperandLatch('target')).toBe('address');
        expect(getOperandLatch('immediate')).toBe('value');
        expect(getOperandLatch('none')).toBeUndefined();
    });

    it('returns the requested instruction', () => {
        expect(getInstruction('ld')).toBe(ISA.ld);
        expect(getInstruction('end')).toBe(ISA.end);
    });

    it('recognizes canonical instruction identifiers', () => {
        for (const id of INSTRUCTION_IDS) {
            expect(isInstructionId(id)).toBe(true);
        }

        expect(isInstructionId('xyz')).toBe(false);
        expect(isInstructionId('toString')).toBe(false);
    });

    it('returns opcodes for a valid instruction and mode', () => {
        expect(getOpcode('ld', 'address')).toBe(OPCODES.LOAD_ADDRESS);
        expect(getOpcode('ld', 'immediate')).toBe(OPCODES.LOAD_IMMEDIATE);
        expect(getOpcode('jmp', 'target')).toBe(OPCODES.JUMP);
        expect(getOpcode('end', 'none')).toBe(OPCODES.HALT);
        expect(getOpcode('ld', 'target')).toBeUndefined();
        expect(getOpcode('st', 'immediate')).toBeUndefined();
    });

    it('returns undefined for invalid opcodes', () => {
        expect(findInstructionByOpcode(0)).toBeUndefined();
        expect(findInstructionByOpcode(61)).toBeUndefined();
        expect(findInstructionByOpcode(Number.NaN)).toBeUndefined();
    });
});
