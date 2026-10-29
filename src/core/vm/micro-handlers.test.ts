// @vitest-environment node

import { OPCODES, type MicroOp, type Opcode } from '@/core/isa';
import { MEMORY_SIZE, type Word } from '@/core/object';
import { createObjectProgramFixture } from '@/test/object-program-fixture';
import { describe, expect, it } from 'vitest';
import { cloneCpuState, createCpu, type CpuState } from './cpu';
import { MICRO_OPS, type MicroOpResult } from './micro-handlers';
import type { TrapCode } from './traps';

function baseState(): CpuState {
    return createCpu(createObjectProgramFixture());
}

function applyAndCheck(
    state: CpuState,
    kind: MicroOp['kind'],
    input?: Word,
): MicroOpResult {
    const before = cloneCpuState(state);
    const result = MICRO_OPS[kind].apply(state, input);

    expect(state).toEqual(before);
    return result;
}

function expectTrap(result: MicroOpResult, code: TrapCode): void {
    expect(result.trap?.code).toBe(code);
}

describe('micro-handlers', () => {
    it('traps when a valid memory address has no cell', () => {
        const state = {
            ...baseState(),
            memory: Array<Word>(MEMORY_SIZE),
            slAdr: 0,
        };
        const result = applyAndCheck(state, 'MEM_READ');

        expectTrap(result, 'MEMORY_OUT_OF_RANGE');
    });

    it('traps when the operand value is multi-cell', () => {
        const state = {
            ...baseState(),
            br: { opcode: OPCODES.LOAD_ADDRESS, operand: 0 },
            slVal: [1, 2] as const,
        };
        const result = applyAndCheck(state, 'BR_WRITE_OPERAND');

        expectTrap(result, 'INVALID_OPCODE');
    });

    it('traps when the operand opcode is missing', () => {
        const state = {
            ...baseState(),
            br: { opcode: null, operand: 0 },
            slVal: 5,
        };
        const result = applyAndCheck(state, 'BR_WRITE_OPERAND');

        expectTrap(result, 'INVALID_OPCODE');
    });

    it('traps when decoding a missing opcode', () => {
        const state = {
            ...baseState(),
            br: { opcode: null, operand: 0 },
        };
        const result = applyAndCheck(state, 'DECODE');

        expectTrap(result, 'INVALID_OPCODE');
    });

    it('traps when decoding an unknown opcode', () => {
        const state = {
            ...baseState(),
            br: { opcode: 0 as Opcode, operand: 0 },
        };
        const result = applyAndCheck(state, 'DECODE');

        expectTrap(result, 'INVALID_OPCODE');
    });

    it('traps when storing a multi-cell value', () => {
        const state = {
            ...baseState(),
            slVal: [1, 2] as const,
        };
        const result = applyAndCheck(state, 'MEM_WRITE');

        expectTrap(result, 'MEMORY_OUT_OF_RANGE');
    });

    it('traps when storing outside memory', () => {
        const state = {
            ...baseState(),
            slAdr: MEMORY_SIZE,
            slVal: 5,
        };
        const result = applyAndCheck(state, 'MEM_WRITE');

        expectTrap(result, 'MEMORY_OUT_OF_RANGE');
    });

    it('traps when loading a multi-cell value into the accumulator', () => {
        const state = {
            ...baseState(),
            slVal: [1, 2] as const,
        };
        const result = applyAndCheck(state, 'AC_WRITE');

        expectTrap(result, 'OVERFLOW');
    });

    it('traps when loading a multi-cell value into the operand register', () => {
        const state = {
            ...baseState(),
            slVal: [1, 2] as const,
        };
        const result = applyAndCheck(state, 'OP_WRITE');

        expectTrap(result, 'OVERFLOW');
    });

    it('traps when writing a multi-cell value to the output register', () => {
        const state = {
            ...baseState(),
            slVal: [1, 2] as const,
        };
        const result = applyAndCheck(state, 'AUS_WRITE');

        expectTrap(result, 'OVERFLOW');
    });

    it('traps when a jump target is not an instruction boundary', () => {
        const state = {
            ...baseState(),
            slAdr: MEMORY_SIZE - 1,
        };
        const result = applyAndCheck(state, 'PC_WRITE');

        expectTrap(result, 'PC_OUT_OF_RANGE');
    });

    it('traps when checking a comparison without an opcode', () => {
        const state = {
            ...baseState(),
            br: { opcode: null, operand: 0 },
            vgl: '=' as const,
        };
        const result = applyAndCheck(state, 'VGL_READ');

        expectTrap(result, 'INVALID_OPCODE');
    });

    it('traps when checking a comparison on an instruction without a condition', () => {
        const state = {
            ...baseState(),
            br: { opcode: OPCODES.LOAD_ADDRESS, operand: 64 },
            vgl: '=' as const,
        };
        const result = applyAndCheck(state, 'VGL_READ');

        expectTrap(result, 'INVALID_OPCODE');
    });

    it('uses an empty operation symbol when no opcode is loaded', () => {
        const state = {
            ...baseState(),
            br: { opcode: null, operand: 0 },
        };
        const result = applyAndCheck(state, 'AR_WRITE');

        expect(result.trap).toBeUndefined();
        expect(result.state.operation).toBeNull();
        expect(result.state.ar).toBe('');
    });

    it('compares negative results as less', () => {
        const state = {
            ...baseState(),
            erg: -1,
        };
        const result = applyAndCheck(state, 'ERG_VGL_WRITE');

        expect(result.trap).toBeUndefined();
        expect(result.state.vgl).toBe('<');
    });
});
