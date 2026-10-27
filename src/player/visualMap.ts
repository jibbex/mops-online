/**
 * Maps VM events to diagram element identifiers and transfer routes.
 *
 * Register and unit identifiers select the active highlight. A transfer route
 * is a complete SVG path from the source to the destination so the packet
 * layer can animate one coherent data flow over the bus.
 *
 * @module player/visualMap
 */

import { getOperandModeForOpcode, getOperation } from '@/core/isa';
import type { VmEvent } from '@/core/vm';

/** One complete data transfer shown by the packet layer. */
export interface TransferRoute {
    /** Stable route identifier used by tests and diagnostics. */
    readonly id: string;
    /** SVG path from source to destination. */
    readonly path: string;
    /** Wire weight controlling the packet size. */
    readonly size: 'bus' | 'signal';
}

/**
 * Active diagram elements for one VM event.
 */
export interface VisualState {
    /** Element IDs that should receive the active treatment. */
    readonly active: ReadonlySet<string>;
    /** Memory addresses touched by the event. */
    readonly memoryCells: readonly number[];
    /** Memory bar indices (1-based) touched by the event. */
    readonly memoryBars: readonly number[];
    /** Complete data-flow route, or null when nothing moves. */
    readonly transfer: TransferRoute | null;
}

/** Neutral visual state used before the first event. */
export const EMPTY_VISUAL: VisualState = {
    active: new Set(),
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

    switch (event.microOp.kind) {
        case 'BZ_READ':
            add(active, 'control', 'bz');
            break;
        case 'MEM_READ':
            add(active, 'control', 'memory');
            addMemory(active, event);
            break;
        case 'BR_WRITE':
            add(active, 'control', 'br');
            break;
        case 'DECODE':
            add(active, 'control', 'dek', 'br');
            break;
        case 'BZ_UPDATE':
            add(active, 'control', 'bz');
            break;
        case 'BR_READ_OPERAND':
            add(active, 'control', 'br', 'br-op');
            break;
        case 'INPUT_READ':
            add(active, 'io', 'ein');
            break;
        case 'MEM_WRITE':
            add(active, 'control', 'memory');
            addMemory(active, event);
            break;
        case 'AC_WRITE':
        case 'AC_READ':
            add(active, 'control', 'ac');
            break;
        case 'OP_WRITE':
            add(active, 'control', 'op');
            break;
        case 'AR_WRITE':
            add(active, 'control', 'ar');
            break;
        case 'ALU_CALC':
            add(active, 'alu', 'erg');
            break;
        case 'ERG_AC_WRITE':
            add(active, 'alu', 'erg', 'ac');
            break;
        case 'ERG_VGL_WRITE':
            add(active, 'alu', 'erg', 'vgl');
            break;
        case 'AUS_WRITE':
            add(active, 'io', 'aus');
            break;
        case 'VGL_READ':
            add(active, 'control', 'vgl');
            break;
        case 'BZ_WRITE':
            add(active, 'control', 'bz');
            break;
        case 'HALT':
            break;
    }

    return {
        active,
        memoryCells: memoryCellsFor(event),
        memoryBars: memoryBarsFor(event),
        transfer: transferFor(event),
    };
}

function transferFor(event: VmEvent): TransferRoute | null {
    switch (event.microOp.kind) {
        case 'BZ_READ':
            return route('bz-memory', 'M430 99 H300 V59 H257', 'signal');
        case 'MEM_READ':
            if (event.microOp.width === 2) {
                return route('memory-br', 'M257 59 H300 V135 H421 V126', 'bus');
            }

            switch (operationOf(event)) {
                case 'load':
                    return route('memory-ac', 'M257 59 H300 V270 H435', 'bus');
                case 'output':
                    return route('memory-aus', 'M257 59 H300 V437 H343', 'bus');
                default:
                    return route('memory-op', 'M257 59 H300 V270 H361', 'bus');
            }
        case 'DECODE':
            return route('br-decoder', 'M449 134 V147 H399', 'signal');
        case 'BR_READ_OPERAND':
            return operandRoute(event);
        case 'MEM_WRITE':
            if (operationOf(event) === 'store') {
                return route('ac-memory', 'M435 270 H300 V59 H257', 'bus');
            }

            if (operationOf(event) === 'input') {
                return route('input-memory', 'M343 475 H300 V59 H257', 'bus');
            }

            return route('bus-memory', 'M300 270 V59 H257', 'bus');
        case 'AR_WRITE':
            return route('bus-ar', 'M300 302 H392', 'signal');
        case 'ALU_CALC':
            return route('operand-alu', 'M361 270 L398 302 L398 334', 'signal');
        case 'ERG_AC_WRITE':
            return route('result-ac', 'M398 334 H469 V270 H435', 'signal');
        case 'ERG_VGL_WRITE':
            return route('result-vgl', 'M398 334 H349', 'signal');
        case 'VGL_READ':
            return route('vgl-control', 'M349 334 H300 V158', 'signal');
        case 'BR_WRITE':
        case 'BZ_UPDATE':
        case 'INPUT_READ':
        case 'AC_WRITE':
        case 'AC_READ':
        case 'OP_WRITE':
        case 'AUS_WRITE':
        case 'BZ_WRITE':
        case 'HALT':
            return null;
    }
}

function operandRoute(event: VmEvent): TransferRoute {
    if (event.opcode === null) {
        return route('bus-br', 'M300 135 H421 V126', 'signal');
    }

    const mode = getOperandModeForOpcode(event.opcode);

    if (mode === 'target') {
        return route('br-bz', 'M449 126 V135 H300 V99 H421', 'signal');
    }

    if (mode === 'immediate') {
        switch (getOperation(event.opcode)) {
            case 'load':
                return route('br-ac', 'M449 126 V135 H300 V270 H435', 'signal');
            case 'output':
                return route(
                    'br-aus',
                    'M449 126 V135 H300 V437 H343',
                    'signal',
                );
            default:
                return route('br-op', 'M449 126 V135 H300 V270 H361', 'signal');
        }
    }

    return route('br-memory', 'M449 126 V135 H300 V59 H257', 'signal');
}

function operationOf(event: VmEvent): ReturnType<typeof getOperation> | null {
    if (event.opcode === null) {
        return null;
    }

    return getOperation(event.opcode);
}

function route(
    id: string,
    path: string,
    size: TransferRoute['size'],
): TransferRoute {
    return { id, path, size };
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
