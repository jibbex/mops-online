// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { assemble } from '@/core/assembler';
import { MEMORY_SIZE, type ObjectProgram, type Word } from '@/core/object';
import {
    cloneCpuState,
    createCpu,
    formatDecoded,
    stepCpu,
    type CpuState,
    type VmEvent,
} from './index';
import { disassemble } from './disassembler';
import type { Trap } from './traps';

function programFromMemory(memory: Word[]): ObjectProgram {
    const image = Array<Word>(MEMORY_SIZE).fill(0);

    for (const [index, value] of memory.entries()) {
        image[index] = value;
    }

    return {
        memory: image,
        sourceMap: Array<number>(MEMORY_SIZE).fill(0),
        symbols: new Map(),
        listing: [],
        entry: 0,
    };
}

interface RunResult {
    readonly state: CpuState;
    readonly events: readonly VmEvent[];
}

function runProgram(source: string, inputs: readonly Word[] = []): RunResult {
    const assembled = assemble(source);

    if (!assembled.program) {
        throw new Error(
            `Assembly failed: ${assembled.diagnostics
                .map((diagnostic) => diagnostic.message)
                .join('; ')}`,
        );
    }

    return runObject(assembled.program, inputs);
}

function runObject(
    program: ObjectProgram,
    inputs: readonly Word[] = [],
): RunResult {
    let state = createCpu(program);
    let inputIndex = 0;
    const events: VmEvent[] = [];

    for (let step = 0; step < 10000; step++) {
        const result = stepCpu(state, undefined);

        if (result.kind === 'trap') {
            throw new Error(`Unexpected trap: ${result.trap.code}`);
        }

        if (result.kind === 'halted') {
            return { state: result.state, events };
        }

        if (result.kind === 'input-required') {
            const input = inputs[inputIndex];
            inputIndex += 1;

            if (input === undefined) {
                throw new Error('Program requested more input than provided.');
            }

            const withInput = stepCpu(result.state, input);

            if (withInput.kind === 'trap') {
                throw new Error(`Unexpected trap: ${withInput.trap.code}`);
            }

            if (withInput.kind === 'halted') {
                return { state: withInput.state, events };
            }

            if (withInput.kind === 'input-required') {
                throw new Error('Input was not accepted.');
            }

            events.push(withInput.event);
            state = withInput.state;
            continue;
        }

        events.push(result.event);
        state = result.state;
    }

    throw new Error('Program did not halt.');
}

function runExpectTrap(source: string, inputs: readonly Word[] = []): Trap {
    const assembled = assemble(source);

    if (!assembled.program) {
        throw new Error('Assembly failed.');
    }

    let state = createCpu(assembled.program);
    let inputIndex = 0;

    for (let step = 0; step < 10000; step++) {
        const result = stepCpu(state, undefined);

        if (result.kind === 'trap') {
            return result.trap;
        }

        if (result.kind === 'halted') {
            throw new Error('Program halted without a trap.');
        }

        if (result.kind === 'input-required') {
            const input = inputs[inputIndex];
            inputIndex += 1;

            if (input === undefined) {
                throw new Error('Missing input.');
            }

            const withInput = stepCpu(result.state, input);

            if (withInput.kind === 'trap') {
                return withInput.trap;
            }

            if (withInput.kind === 'halted') {
                throw new Error('Program halted without a trap.');
            }

            if (withInput.kind === 'input-required') {
                throw new Error('Input was not accepted.');
            }

            state = withInput.state;
            continue;
        }

        state = result.state;
    }

    throw new Error('Program did not halt.');
}

describe('CPU state', () => {
    it('loads a program into a fresh CPU', () => {
        const program = programFromMemory([60]);
        const cpu = createCpu(program);

        expect(cpu.bz).toBe(0);
        expect(cpu.ac).toBe(0);
        expect(cpu.phase).toBe('FETCH');
        expect(cpu.halted).toBe(false);
        expect(cpu.memory).toEqual(program.memory);
        expect(cpu.memory).not.toBe(program.memory);
    });

    it('clones state without sharing memory', () => {
        const cpu = createCpu(programFromMemory([11, 5, 60]));
        const clone = cloneCpuState(cpu);

        expect(clone.memory).not.toBe(cpu.memory);
        expect(clone.memory[1]).toBe(5);
    });

    it('formats decoded instructions', () => {
        expect(formatDecoded(10, 64)).toBe('ld $64');
        expect(formatDecoded(11, 5)).toBe('ld 5');
        expect(formatDecoded(50, 4)).toBe('jmp #4');
        expect(formatDecoded(60, 0)).toBe('end');
    });
});

describe('execute programs', () => {
    it('loads, adds, stores, and outputs', () => {
        const result = runProgram(
            ['ld 5', 'add 3', 'st a', 'out a', 'end'].join('\n'),
        );

        expect(result.state.ac).toBe(8);
        expect(result.state.memory[64]).toBe(8);
        expect(result.state.aus).toBe(8);
        expect(result.state.halted).toBe(true);
        expect(result.events.length).toBeGreaterThan(0);
    });

    it('supports subtraction, multiplication, division, and modulo', () => {
        const result = runProgram(
            [
                'ld 10',
                'sub 3',
                'st a',
                'ld 4',
                'mul 3',
                'st b',
                'ld 7',
                'div 2',
                'st c',
                'ld 7',
                'mod 3',
                'st d',
                'end',
            ].join('\n'),
        );

        expect(result.state.memory[64]).toBe(7);
        expect(result.state.memory[65]).toBe(12);
        expect(result.state.memory[66]).toBe(3);
        expect(result.state.memory[67]).toBe(1);
    });

    it('uses floor division and Python-style modulo for negative values', () => {
        const result = runProgram(
            ['ld -7', 'div 2', 'st a', 'ld -7', 'mod 2', 'st b', 'end'].join(
                '\n',
            ),
        );

        expect(result.state.memory[64]).toBe(-4);
        expect(result.state.memory[65]).toBe(1);
    });

    it('runs a counting loop with cmp and jgt', () => {
        const result = runProgram(
            [
                'ld 3',
                'st a',
                'ld a :loop',
                'out a',
                'sub 1',
                'st a',
                'cmp 0',
                'jgt loop',
                'end',
            ].join('\n'),
        );

        expect(result.state.memory[64]).toBe(0);
        expect(result.state.aus).toBe(1);
    });

    it('reads input and writes it to memory', () => {
        const result = runProgram(
            ['in a', 'ld a', 'out a', 'end'].join('\n'),
            [42],
        );

        expect(result.state.ein).toBe(42);
        expect(result.state.memory[64]).toBe(42);
        expect(result.state.ac).toBe(42);
        expect(result.state.aus).toBe(42);
    });

    it('stops on end', () => {
        const result = runProgram('end');

        expect(result.state.halted).toBe(true);
        expect(result.state.phase).toBe('HALTED');
    });

    it('reports fetch, decode, and execute phases', () => {
        const result = runProgram('ld 5\nend');
        const phases = new Set(result.events.map((event) => event.phase));

        expect(phases).toEqual(new Set(['FETCH', 'DECODE', 'EXECUTE']));
    });
});

describe('runtime traps', () => {
    it('traps on division by zero', () => {
        expect(runExpectTrap('ld 1\ndiv 0\nend').code).toBe('DIVISION_BY_ZERO');
    });

    it('traps on modulo by zero', () => {
        expect(runExpectTrap('ld 1\nmod 0\nend').code).toBe('DIVISION_BY_ZERO');
    });

    it('traps on overflow', () => {
        expect(runExpectTrap('ld 9999\nadd 1\nend').code).toBe('OVERFLOW');
    });

    it('traps when the comparison register is not set', () => {
        const cpu = createCpu(programFromMemory([52, 4, 60]));
        let state = cpu;
        let trap: Trap | undefined;

        for (let step = 0; step < 100; step++) {
            const result = stepCpu(state, undefined);

            if (result.kind === 'trap') {
                trap = result.trap;
                break;
            }

            if (result.kind === 'halted') {
                break;
            }

            state = result.state;
        }

        expect(trap?.code).toBe('COMPARE_NOT_SET');
    });

    it('traps on an invalid opcode', () => {
        const cpu = createCpu(programFromMemory([1, 0]));
        let state = cpu;
        let trap: Trap | undefined;

        for (let step = 0; step < 20; step++) {
            const result = stepCpu(state, undefined);

            if (result.kind === 'trap') {
                trap = result.trap;
                break;
            }

            if (result.kind === 'halted') {
                break;
            }

            state = result.state;
        }

        expect(trap?.code).toBe('INVALID_OPCODE');
    });

    it('traps on an out-of-range instruction counter', () => {
        const cpu = {
            ...createCpu(programFromMemory([60])),
            bz: 72,
        };
        const result = stepCpu(cpu, undefined);

        expect(result.kind).toBe('trap');

        if (result.kind === 'trap') {
            expect(result.trap.code).toBe('PC_OUT_OF_RANGE');
        }
    });

    it('rejects out-of-range input', () => {
        const assembled = assemble('in a\nend');

        if (!assembled.program) {
            throw new Error('Assembly failed.');
        }

        let state = createCpu(assembled.program);
        let result = stepCpu(state, undefined);

        while (result.kind !== 'input-required' && result.kind !== 'trap') {
            if (result.kind === 'halted') {
                throw new Error('Program halted before input.');
            }

            state = result.state;
            result = stepCpu(state, undefined);
        }

        expect(result.kind).toBe('input-required');

        if (result.kind !== 'input-required') {
            return;
        }

        const trapped = stepCpu(result.state, 10000);

        expect(trapped.kind).toBe('trap');

        if (trapped.kind === 'trap') {
            expect(trapped.trap.code).toBe('INPUT_OUT_OF_RANGE');
        }
    });
});

describe('disassembler', () => {
    it('reconstructs instructions from memory', () => {
        const result = disassemble([11, 5, 30, 64, 60]);

        expect(result.map((instruction) => instruction.text)).toEqual([
            'ld 5',
            'add $64',
            'end',
        ]);
    });
});
