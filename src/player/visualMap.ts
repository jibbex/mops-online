/**
 * Maps VM events to diagram element identifiers.
 *
 * @module player/visualMap
 */

import type { VmEvent } from '@/core/vm';

export interface VisualState {
    readonly active: ReadonlySet<string>;
    readonly memoryCells: readonly number[];
    readonly memoryBars: readonly number[];
}

export const EMPTY_VISUAL: VisualState = {
    active: new Set(),
    memoryCells: [],
    memoryBars: [],
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

    switch (event.microOp.kind) {
        case 'BZ_READ':
            add(active, 'control', 'sl', 'sl-bz', 'bz');
            break;
        case 'MEM_READ':
            add(active, 'control', 'sl', 'sl-mem', 'memory');
            addMemory(active, event);
            break;
        case 'BR_WRITE':
            add(active, 'control', 'sl', 'sl-br', 'br');
            break;
        case 'DECODE':
            add(active, 'control', 'sl', 'sl-dek', 'dek', 'br', 'br-dek');
            break;
        case 'BZ_UPDATE':
            add(active, 'control', 'sl', 'sl-bz', 'bz');
            break;
        case 'BR_READ_OPERAND':
            add(active, 'control', 'sl', 'sl-br', 'br', 'br-op');
            break;
        case 'INPUT_READ':
            add(active, 'io', 'sl', 'sl-ein', 'ein');
            break;
        case 'MEM_WRITE':
            add(active, 'control', 'sl', 'sl-mem', 'memory');
            addMemory(active, event);
            break;
        case 'AC_WRITE':
        case 'AC_READ':
            add(active, 'control', 'sl', 'sl-ac', 'ac');
            break;
        case 'OP_WRITE':
            add(active, 'control', 'sl', 'sl-op', 'op');
            break;
        case 'AR_WRITE':
            add(active, 'control', 'sl', 'sl-ar', 'ar');
            break;
        case 'ALU_CALC':
            add(active, 'alu', 'erg');
            break;
        case 'ERG_AC_WRITE':
            add(active, 'alu', 'erg', 'erg-ac', 'ac');
            break;
        case 'ERG_VGL_WRITE':
            add(active, 'alu', 'erg', 'erg-vgl', 'vgl');
            break;
        case 'AUS_WRITE':
            add(active, 'io', 'sl', 'sl-aus', 'aus');
            break;
        case 'VGL_READ':
            add(active, 'control', 'sl', 'sl-vgl', 'vgl');
            break;
        case 'BZ_WRITE':
            add(active, 'control', 'sl', 'sl-bz', 'bz');
            break;
        case 'HALT':
            break;
    }

    return {
        active,
        memoryCells: memoryCellsFor(event),
        memoryBars: memoryBarsFor(event),
    };
}

function add(active: Set<string>, ...ids: string[]): void {
    for (const id of ids) {
        active.add(id);
    }
}

function addMemory(active: Set<string>, event: VmEvent): void {
    for (const address of memoryCellsFor(event)) {
        active.add(`mem${address.toString().padStart(2, '0')}`);
    }

    for (const bar of memoryBarsFor(event)) {
        active.add(`mem-bar${bar}`);
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
    return memoryCellsFor(event).map((address) => Math.floor(address / 24) + 1);
}
