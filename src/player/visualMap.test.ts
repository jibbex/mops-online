// @vitest-environment node

import { OPCODES } from '@/core/isa';
import { MEMORY_SIZE, type ObjectProgram, type Word } from '@/core/object';
import { createCpu, type VmEvent } from '@/core/vm';
import { describe, expect, it } from 'vitest';
import { EMPTY_VISUAL, visualStateFor } from './visualMap';

const program: ObjectProgram = {
    memory: Array<Word>(MEMORY_SIZE).fill(0),
    sourceMap: Array<number>(MEMORY_SIZE).fill(0),
    symbols: new Map(),
    listing: [],
    entry: 0,
};

function event(
    microOp: VmEvent['microOp'],
    overrides: Partial<VmEvent['after']> = {},
    eventOverrides: Partial<Pick<VmEvent, 'opcode' | 'phase'>> = {},
): VmEvent {
    const state = { ...createCpu(program), ...overrides };

    return {
        phase: 'EXECUTE',
        address: 0,
        opcode: null,
        operand: null,
        microOp,
        before: state,
        after: state,
        description: 'test',
        ...eventOverrides,
    };
}

describe('visual map', () => {
    it('returns an empty state without an event', () => {
        expect(visualStateFor(null)).toBe(EMPTY_VISUAL);
    });

    it('highlights the instruction counter and routes it to memory', () => {
        const visual = visualStateFor(event({ kind: 'BZ_READ' }));

        expect(visual.active.has('bz')).toBe(true);
        expect(visual.active.has('control')).toBe(true);
        expect(visual.transfer).toEqual({
            id: 'bz-memory',
            path: 'M430 99 H300 V59 H257',
            size: 'signal',
        });
    });

    it('routes a two-cell memory read to the instruction register', () => {
        const visual = visualStateFor(
            event({ kind: 'MEM_READ', width: 2 }, { slAdr: 25 }),
        );

        expect(visual.memoryCells).toEqual([25, 26]);
        expect(visual.memoryBars).toEqual([2, 2]);
        expect(visual.active.has('mem25')).toBe(true);
        expect(visual.active.has('mem26')).toBe(true);
        expect(visual.active.has('mem-bar2')).toBe(true);
        expect(visual.transfer?.id).toBe('memory-br');
    });

    it('routes a load read into the bus', () => {
        const visual = visualStateFor(
            event(
                { kind: 'MEM_READ', width: 1 },
                { slAdr: 64 },
                { opcode: OPCODES.LOAD_ADDRESS },
            ),
        );

        expect(visual.transfer?.id).toBe('memory-ac');
    });

    it('routes an output read toward the output register', () => {
        const visual = visualStateFor(
            event(
                { kind: 'MEM_READ', width: 1 },
                { slAdr: 64 },
                { opcode: OPCODES.OUTPUT_ADDRESS },
            ),
        );

        expect(visual.transfer?.id).toBe('memory-aus');
    });

    it('highlights the destination cell for a write', () => {
        const visual = visualStateFor(
            event({ kind: 'MEM_WRITE' }, { slAdr: 64 }),
        );

        expect(visual.memoryCells).toEqual([64]);
        expect(visual.memoryBars).toEqual([3]);
        expect(visual.active.has('mem64')).toBe(true);
        expect(visual.transfer?.id).toBe('bus-memory');
    });

    it('routes a store write from the accumulator to memory', () => {
        const visual = visualStateFor(
            event(
                { kind: 'MEM_WRITE' },
                { slAdr: 64 },
                { opcode: OPCODES.STORE },
            ),
        );

        expect(visual.transfer?.id).toBe('ac-memory');
    });

    it('routes an input write from the input register to memory', () => {
        const visual = visualStateFor(
            event(
                { kind: 'MEM_WRITE' },
                { slAdr: 64 },
                { opcode: OPCODES.INPUT },
            ),
        );

        expect(visual.transfer?.id).toBe('input-memory');
    });

    it('routes decoding from the instruction register to the decoder', () => {
        const visual = visualStateFor(event({ kind: 'DECODE' }));

        expect(visual.active.has('dek')).toBe(true);
        expect(visual.active.has('br')).toBe(true);
        expect(visual.transfer).toEqual({
            id: 'br-decoder',
            path: 'M449 134 V147 H399',
            size: 'signal',
        });
    });

    it('routes an address operand to memory', () => {
        const visual = visualStateFor(
            event(
                { kind: 'BR_READ_OPERAND' },
                {},
                { opcode: OPCODES.LOAD_ADDRESS },
            ),
        );

        expect(visual.transfer?.id).toBe('br-memory');
    });

    it('routes an immediate load operand to the accumulator', () => {
        const visual = visualStateFor(
            event(
                { kind: 'BR_READ_OPERAND' },
                {},
                { opcode: OPCODES.LOAD_IMMEDIATE },
            ),
        );

        expect(visual.transfer?.id).toBe('br-ac');
    });

    it('routes an immediate output operand to the output register', () => {
        const visual = visualStateFor(
            event(
                { kind: 'BR_READ_OPERAND' },
                {},
                { opcode: OPCODES.OUTPUT_IMMEDIATE },
            ),
        );

        expect(visual.transfer?.id).toBe('br-aus');
    });

    it('routes an arithmetic immediate operand to the ALU operand register', () => {
        const visual = visualStateFor(
            event(
                { kind: 'BR_READ_OPERAND' },
                {},
                { opcode: OPCODES.ADD_IMMEDIATE },
            ),
        );

        expect(visual.transfer?.id).toBe('br-op');
    });

    it('routes a jump target to the instruction counter', () => {
        const visual = visualStateFor(
            event({ kind: 'BR_READ_OPERAND' }, {}, { opcode: OPCODES.JUMP }),
        );

        expect(visual.transfer?.id).toBe('br-bz');
    });

    it('routes the ALU result to the comparison register', () => {
        const visual = visualStateFor(event({ kind: 'ERG_VGL_WRITE' }));

        expect(visual.active.has('erg')).toBe(true);
        expect(visual.active.has('vgl')).toBe(true);
        expect(visual.transfer).toEqual({
            id: 'result-vgl',
            path: 'M398 334 H349',
            size: 'signal',
        });
    });

    it('highlights the output register after the transfer arrives', () => {
        const visual = visualStateFor(event({ kind: 'AUS_WRITE' }));

        expect(visual.active.has('aus')).toBe(true);
        expect(visual.transfer).toBeNull();
    });

    it('highlights the input register without a duplicate transfer', () => {
        const visual = visualStateFor(event({ kind: 'INPUT_READ' }));

        expect(visual.active.has('ein')).toBe(true);
        expect(visual.transfer).toBeNull();
    });

    it('does not draw a second packet for the instruction register latch', () => {
        const visual = visualStateFor(event({ kind: 'BR_WRITE' }));

        expect(visual.active.has('br')).toBe(true);
        expect(visual.transfer).toBeNull();
    });

    it('does not highlight or move anything on halt', () => {
        const visual = visualStateFor(event({ kind: 'HALT' }));

        expect(visual.active.size).toBe(0);
        expect(visual.memoryCells).toEqual([]);
        expect(visual.transfer).toBeNull();
    });
});
