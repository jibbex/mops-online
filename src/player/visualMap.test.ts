// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { MEMORY_SIZE, type ObjectProgram, type Word } from '@/core/object';
import { createCpu, type VmEvent } from '@/core/vm';
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
    };
}

describe('visual map', () => {
    it('returns an empty state without an event', () => {
        expect(visualStateFor(null)).toBe(EMPTY_VISUAL);
    });

    it('highlights the instruction counter for BZ_READ', () => {
        const visual = visualStateFor(event({ kind: 'BZ_READ' }));

        expect(visual.active.has('bz')).toBe(true);
        expect(visual.active.has('sl-bz')).toBe(true);
        expect(visual.active.has('control')).toBe(true);
    });

    it('highlights two memory cells and the bar for a wide read', () => {
        const visual = visualStateFor(
            event({ kind: 'MEM_READ', width: 2 }, { slAdr: 25 }),
        );

        expect(visual.memoryCells).toEqual([25, 26]);
        expect(visual.memoryBars).toEqual([2, 2]);
        expect(visual.active.has('mem25')).toBe(true);
        expect(visual.active.has('mem26')).toBe(true);
        expect(visual.active.has('mem-bar2')).toBe(true);
    });

    it('highlights the destination cell for a write', () => {
        const visual = visualStateFor(
            event({ kind: 'MEM_WRITE' }, { slAdr: 64 }),
        );

        expect(visual.memoryCells).toEqual([64]);
        expect(visual.memoryBars).toEqual([3]);
        expect(visual.active.has('mem64')).toBe(true);
    });

    it('highlights the decoder and instruction register', () => {
        const visual = visualStateFor(event({ kind: 'DECODE' }));

        expect(visual.active.has('dek')).toBe(true);
        expect(visual.active.has('br')).toBe(true);
        expect(visual.active.has('br-dek')).toBe(true);
    });

    it('highlights the ALU result path', () => {
        const visual = visualStateFor(event({ kind: 'ERG_VGL_WRITE' }));

        expect(visual.active.has('erg')).toBe(true);
        expect(visual.active.has('erg-vgl')).toBe(true);
        expect(visual.active.has('vgl')).toBe(true);
    });

    it('highlights the output register', () => {
        const visual = visualStateFor(event({ kind: 'AUS_WRITE' }));

        expect(visual.active.has('aus')).toBe(true);
        expect(visual.active.has('sl-aus')).toBe(true);
    });

    it('does not highlight anything on halt', () => {
        const visual = visualStateFor(event({ kind: 'HALT' }));

        expect(visual.active.size).toBe(0);
        expect(visual.memoryCells).toEqual([]);
    });
});
