// @vitest-environment node

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

    it('routes a memory read from the memory edge to the control edge', () => {
        const visual = visualStateFor(
            event({ kind: 'MEM_READ', width: 2 }, { slAdr: 25 }),
        );

        expect(visual.memoryCells).toEqual([25, 26]);
        expect(visual.memoryBars).toEqual([2, 2]);
        expect(visual.active.has('mem25')).toBe(true);
        expect(visual.active.has('control')).toBe(true);
        expect(visual.transfer).toEqual({
            id: 'memory-control',
            path: 'M265 59 H300 V158',
            size: 'bus',
        });
    });

    it('routes a memory write from the control edge to the memory edge', () => {
        const visual = visualStateFor(
            event({ kind: 'MEM_WRITE' }, { slAdr: 64 }),
        );

        expect(visual.memoryCells).toEqual([64]);
        expect(visual.active.has('mem64')).toBe(true);
        expect(visual.transfer).toEqual({
            id: 'control-memory',
            path: 'M300 158 V59 H265',
            size: 'bus',
        });
    });

    it('routes input from the I/O edge to the control edge', () => {
        const visual = visualStateFor(event({ kind: 'INPUT_READ' }));

        expect(visual.active.has('ein')).toBe(true);
        expect(visual.transfer).toEqual({
            id: 'input-control',
            path: 'M301 475 H300 V158',
            size: 'bus',
        });
    });

    it('routes the accumulator write from control to the ALU edge', () => {
        const visual = visualStateFor(event({ kind: 'AC_WRITE' }));

        expect(visual.active.has('ac')).toBe(true);
        expect(visual.transfer).toEqual({
            id: 'control-ac',
            path: 'M300 158 V270',
            size: 'bus',
        });
    });

    it('routes the accumulator read from the ALU edge to control', () => {
        const visual = visualStateFor(event({ kind: 'AC_READ' }));

        expect(visual.active.has('ac')).toBe(true);
        expect(visual.transfer).toEqual({
            id: 'ac-control',
            path: 'M300 270 V158',
            size: 'bus',
        });
    });

    it('routes the operand write from control to the ALU edge', () => {
        const visual = visualStateFor(event({ kind: 'OP_WRITE' }));

        expect(visual.active.has('op')).toBe(true);
        expect(visual.transfer).toEqual({
            id: 'control-op',
            path: 'M300 158 V270',
            size: 'bus',
        });
    });

    it('routes the operation selection from control to the ALU edge', () => {
        const visual = visualStateFor(event({ kind: 'AR_WRITE' }));

        expect(visual.active.has('ar')).toBe(true);
        expect(visual.transfer).toEqual({
            id: 'control-ar',
            path: 'M300 158 V302',
            size: 'bus',
        });
    });

    it('routes output from control to the I/O edge', () => {
        const visual = visualStateFor(event({ kind: 'AUS_WRITE' }));

        expect(visual.active.has('aus')).toBe(true);
        expect(visual.transfer).toEqual({
            id: 'control-aus',
            path: 'M300 158 V437',
            size: 'bus',
        });
    });

    it('routes the comparison result from the ALU edge to control', () => {
        const visual = visualStateFor(event({ kind: 'VGL_READ' }));

        expect(visual.active.has('vgl')).toBe(true);
        expect(visual.transfer).toEqual({
            id: 'vgl-control',
            path: 'M300 334 V158',
            size: 'bus',
        });
    });

    it('does not draw a packet for internal control reads and writes', () => {
        const internal: VmEvent['microOp'][] = [
            { kind: 'BZ_READ' },
            { kind: 'BR_WRITE' },
            { kind: 'DECODE' },
            { kind: 'BZ_UPDATE' },
            { kind: 'BR_READ_OPERAND' },
            { kind: 'BZ_WRITE' },
        ];

        for (const microOp of internal) {
            const visual = visualStateFor(event(microOp));

            expect(visual.transfer, microOp.kind).toBeNull();
            expect(visual.active.size, microOp.kind).toBeGreaterThan(0);
        }
    });

    it('does not draw a packet for internal ALU operations', () => {
        for (const microOp of [
            { kind: 'ALU_CALC' },
            { kind: 'ERG_AC_WRITE' },
            { kind: 'ERG_VGL_WRITE' },
        ] satisfies VmEvent['microOp'][]) {
            const visual = visualStateFor(event(microOp));

            expect(visual.transfer, microOp.kind).toBeNull();
            expect(visual.active.has('alu'), microOp.kind).toBe(true);
        }
    });

    it('does not draw a packet for halt', () => {
        const visual = visualStateFor(event({ kind: 'HALT' }));

        expect(visual.active.has('control')).toBe(true);
        expect(visual.transfer).toBeNull();
    });

    it('keeps every bus packet outside the component frames', () => {
        const external: VmEvent['microOp'][] = [
            { kind: 'MEM_READ', width: 1 },
            { kind: 'MEM_READ', width: 2 },
            { kind: 'MEM_WRITE' },
            { kind: 'INPUT_READ' },
            { kind: 'AC_WRITE' },
            { kind: 'AC_READ' },
            { kind: 'OP_WRITE' },
            { kind: 'AR_WRITE' },
            { kind: 'AUS_WRITE' },
            { kind: 'VGL_READ' },
        ];

        for (const microOp of external) {
            const visual = visualStateFor(event(microOp, { slAdr: 64 }));
            const path = visual.transfer?.path;

            expect(path, microOp.kind).toBeDefined();
            expect(path).not.toMatch(/H(?:257|309)\b/);
            expect(path).not.toMatch(/H(?:417|421|343|325|392|356)\b/);
        }
    });
});
