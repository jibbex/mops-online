/**
 * Maps VM events to diagram highlights and real bus transfers.
 *
 * The VM uses internal latches (SL_ADR, SL_VAL, ML_VAL) inside the control
 * unit. Only micro-ops that cross a unit boundary are drawn as bus packets.
 * Active elements carry a read, write, or increment operation so the same
 * visual language applies to every register and memory cell.
 *
 * @module player/visual-map
 */

import { MEMORY_SIZE } from '@/core/object';
import type { VmEvent } from '@/core/vm';

/** Number of memory bars in the diagram. */
const MEMORY_BAR_COUNT = 3;

/** Cells per memory bar; the memory view is split into three equal columns. */
const MEMORY_CELLS_PER_BAR = MEMORY_SIZE / MEMORY_BAR_COUNT;

/** One real bus transfer between two machine units. */
export interface TransferRoute {
    /** Stable route identifier used by tests and diagnostics. */
    readonly id: string;
    /** SVG path between two unit boundaries. */
    readonly path: string;
    /** Wire weight controlling the packet size. */
    readonly size: 'bus' | 'signal';
}

/** Operation represented by an active diagram element. */
export type VisualOperation = 'read' | 'write' | 'increment';

/**
 * Active diagram elements for one VM event.
 */
export interface VisualState {
    /** Element IDs that should receive the active treatment. */
    readonly active: ReadonlySet<string>;
    /**
     * Operation per active register, cell, or bar.
     *
     * Read, write, and increment share one visual language across the whole
     * diagram instead of inventing component-specific highlights.
     */
    readonly operations: ReadonlyMap<string, VisualOperation>;
    /** Memory addresses touched by the event. */
    readonly memoryCells: readonly number[];
    /** Memory bar indices (1-based) touched by the event. */
    readonly memoryBars: readonly number[];
    /** Real bus transfer, or null for an internal micro-op. */
    readonly transfer: TransferRoute | null;
}

/** Neutral visual state used before the first event. */
export const EMPTY_VISUAL: VisualState = {
    active: new Set(),
    operations: new Map(),
    memoryCells: [],
    memoryBars: [],
    transfer: null,
};

/**
 * Returns the visual state for a VM event.
 *
 * @param event The last executed event, or null.
 */
export function visualStateFor(event: VmEvent | null): VisualState {
    if (!event) {
        return EMPTY_VISUAL;
    }

    const active = new Set<string>();
    const operations = new Map<string, VisualOperation>();

    switch (event.microOp.kind) {
        case 'PC_READ':
            add(active, 'control');
            mark(active, operations, 'read', 'pc');
            break;
        case 'MEM_READ':
            add(active, 'control');
            mark(active, operations, 'read', 'memory');
            addMemory(active, operations, event, 'read');
            break;
        case 'BR_WRITE':
            add(active, 'control');
            mark(active, operations, 'write', 'br');
            break;
        case 'DECODE':
            add(active, 'control');
            mark(active, operations, 'read', 'br');
            mark(active, operations, 'write', 'dek');
            break;
        case 'PC_UPDATE':
            add(active, 'control');
            mark(active, operations, 'increment', 'pc');
            break;
        case 'BR_READ_OPERAND':
            add(active, 'control', 'br-op');
            mark(active, operations, 'read', 'br');
            break;
        case 'INPUT_READ':
            add(active, 'io');
            mark(active, operations, 'read', 'ein');
            break;
        case 'MEM_WRITE':
            add(active, 'control');
            mark(active, operations, 'write', 'memory');
            addMemory(active, operations, event, 'write');
            break;
        case 'AC_WRITE':
            add(active, 'control');
            mark(active, operations, 'write', 'ac');
            break;
        case 'AC_READ':
            add(active, 'control');
            mark(active, operations, 'read', 'ac');
            break;
        case 'OP_WRITE':
            add(active, 'control');
            mark(active, operations, 'write', 'op');
            break;
        case 'AR_WRITE':
            add(active, 'control');
            mark(active, operations, 'write', 'ar');
            break;
        case 'ALU_CALC':
            add(active, 'alu');
            mark(active, operations, 'write', 'erg');
            break;
        case 'ERG_AC_WRITE':
            add(active, 'alu', 'control');
            mark(active, operations, 'read', 'erg');
            mark(active, operations, 'write', 'ac');
            break;
        case 'ERG_VGL_WRITE':
            add(active, 'alu', 'control');
            mark(active, operations, 'read', 'erg');
            mark(active, operations, 'write', 'vgl');
            break;
        case 'AUS_WRITE':
            add(active, 'io');
            mark(active, operations, 'write', 'aus');
            break;
        case 'VGL_READ':
            add(active, 'control');
            mark(active, operations, 'read', 'vgl');
            break;
        case 'PC_WRITE':
            add(active, 'control');
            mark(active, operations, 'write', 'pc');
            break;
        case 'HALT':
            add(active, 'control');
            break;
    }

    return {
        active,
        operations,
        memoryCells: memoryCellsFor(event),
        memoryBars: memoryBarsFor(event),
        transfer: transferFor(event),
    };
}

/**
 * Returns the real external bus transfer for a micro-op.
 *
 * Only transfers that cross a unit boundary draw a packet. Highlighting an
 * internal latch would suggest a bus transfer that never happened and would
 * violate the one-packet-per-transfer invariant.
 *
 * Internal micro-ops return null. The routes start and end at unit boundaries:
 * memory (x = 265), control/ALU/IO (x = 301), outside the component frames.
 *
 * @param event The current VM event.
 * @returns The bus route, or null for an internal operation.
 */
function transferFor(event: VmEvent): TransferRoute | null {
    switch (event.microOp.kind) {
        case 'MEM_READ':
            return route('memory-control', 'M265 59 H300 V158');
        case 'MEM_WRITE':
            return route('control-memory', 'M300 158 V59 H265');
        case 'INPUT_READ':
            return route('input-control', 'M301 475 H300 V158');
        case 'AC_WRITE':
            return route('control-ac', 'M300 158 V270');
        case 'AC_READ':
            return route('ac-control', 'M300 270 V158');
        case 'OP_WRITE':
            return route('control-op', 'M300 158 V270');
        case 'AR_WRITE':
            return route('control-ar', 'M300 158 V302');
        case 'AUS_WRITE':
            return route('control-aus', 'M300 158 V437');
        case 'VGL_READ':
            return route('vgl-control', 'M300 334 V158');
        case 'PC_READ':
        case 'BR_WRITE':
        case 'DECODE':
        case 'PC_UPDATE':
        case 'BR_READ_OPERAND':
        case 'ALU_CALC':
        case 'ERG_AC_WRITE':
        case 'ERG_VGL_WRITE':
        case 'PC_WRITE':
        case 'HALT':
            return null;
    }
}

function route(id: string, path: string): TransferRoute {
    return { id, path, size: 'bus' };
}

function add(active: Set<string>, ...ids: string[]): void {
    for (const id of ids) {
        active.add(id);
    }
}

function mark(
    active: Set<string>,
    operations: Map<string, VisualOperation>,
    operation: VisualOperation,
    ...ids: string[]
): void {
    for (const id of ids) {
        active.add(id);
        operations.set(id, operation);
    }
}

function addMemory(
    active: Set<string>,
    operations: Map<string, VisualOperation>,
    event: VmEvent,
    operation: 'read' | 'write',
): void {
    for (const address of memoryCellsFor(event)) {
        mark(
            active,
            operations,
            operation,
            `mem${address.toString().padStart(2, '0')}`,
        );
    }

    for (const bar of memoryBarsFor(event)) {
        mark(active, operations, operation, `mem-bar${bar}`);
    }
}

function memoryCellsFor(event: VmEvent): number[] {
    if (
        event.microOp.kind !== 'MEM_READ' &&
        event.microOp.kind !== 'MEM_WRITE'
    ) {
        return [];
    }

    const address = event.after.slAdr;
    const width = event.microOp.kind === 'MEM_READ' ? event.microOp.width : 1;

    return Array.from({ length: width }, (_, offset) => address + offset);
}

function memoryBarsFor(event: VmEvent): number[] {
    return memoryCellsFor(event).map(
        (address) => Math.floor(address / MEMORY_CELLS_PER_BAR) + 1,
    );
}
