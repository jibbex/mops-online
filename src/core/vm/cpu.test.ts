// @vitest-environment node

import type { Opcode } from '@/core/isa';
import type { Word } from '@/core/object';
import { createObjectProgramFixture } from '@/test/object-program-fixture';
import { describe, expect, it } from 'vitest';
import {
    cloneCpuState,
    createCpu,
    formatDecoded,
    type CpuState,
} from './cpu';
import { createTrap } from './traps';

function stateWithMutableParts(): CpuState {
    return {
        ...createCpu(createObjectProgramFixture()),
        slVal: [1, 2],
        mlVal: [3, 4],
        queue: [{ kind: 'HALT' }],
        trap: createTrap('OVERFLOW', 'Result is out of range.'),
    };
}

describe('createCpu', () => {
    it('loads a program into a fresh machine', () => {
        const program = createObjectProgramFixture();
        const cpu = createCpu(program);

        expect(cpu.memory).toEqual(program.memory);
        expect(cpu.memory).not.toBe(program.memory);
        expect(cpu.bz).toBe(0);
        expect(cpu.instructionAddress).toBe(0);
        expect(cpu.br).toEqual({ opcode: null, operand: 0 });
        expect(cpu.phase).toBe('FETCH');
        expect(cpu.halted).toBe(false);
        expect(cpu.trap).toBeNull();
    });
});

describe('cloneCpuState', () => {
    it('copies every mutable container', () => {
        const cpu = stateWithMutableParts();
        const clone = cloneCpuState(cpu);

        expect(clone).not.toBe(cpu);
        expect(clone.memory).not.toBe(cpu.memory);
        expect(clone.memory).toEqual(cpu.memory);
        expect(clone.br).not.toBe(cpu.br);
        expect(clone.slVal).not.toBe(cpu.slVal);
        expect(clone.slVal).toEqual([1, 2]);
        expect(clone.mlVal).not.toBe(cpu.mlVal);
        expect(clone.mlVal).toEqual([3, 4]);
        expect(clone.queue).not.toBe(cpu.queue);
        expect(clone.queue).toEqual(cpu.queue);
        expect(clone.trap).not.toBe(cpu.trap);
        expect(clone.trap).toEqual(cpu.trap);
    });

    it('does not share memory mutations with the original state', () => {
        const cpu = stateWithMutableParts();
        const clone = cloneCpuState(cpu);
        const cloneMemory = clone.memory as Word[];

        cloneMemory[0] = 99;

        expect(cpu.memory[0]).toBe(11);
    });
});

describe('formatDecoded', () => {
    it('formats each operand mode', () => {
        expect(formatDecoded(10, 64)).toBe('ld $64');
        expect(formatDecoded(11, -5)).toBe('ld -5');
        expect(formatDecoded(50, 4)).toBe('jmp #4');
        expect(formatDecoded(60, 0)).toBe('end');
    });

    it('throws for an unassigned opcode', () => {
        expect(() => formatDecoded(0 as Opcode, 0)).toThrow(
            'No instruction is defined for opcode 0.',
        );
    });
});
