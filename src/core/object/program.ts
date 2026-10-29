/**
 * Object program model for MOPS.
 *
 * An object program is the boundary between the assembler and the VM. It
 * contains the complete 72-cell memory image plus the metadata needed by the
 * editor, listing view, and debugger.
 *
 * @module core/object/program
 */

/** Number of addressable memory cells in the model machine. */
export const MEMORY_SIZE = 72;
/** Smallest valid machine word. */
export const MIN_WORD = -9999;
/** Largest valid machine word. */
export const MAX_WORD = 9999;
/** First data-cell address. */
export const DATA_START = 64;
/** Last data-cell address. */
export const DATA_END = 71;
/** Source-map marker for cells that are not associated with source code. */
export const NO_SOURCE_LINE = 0;

/** Integer in the MOPS word range. */
export type Word = number;
/** Integer in the MOPS address range. */
export type Address = number;

/** One source line and the machine words produced from it. */
export interface ListingEntry {
    /** One-based source line. */
    readonly line: number;
    /** First memory cell of the encoded instruction. */
    readonly address: Address;
    /** One or two encoded cells. */
    readonly words: readonly Word[];
    /** Original source line. */
    readonly source: string;
}

/**
 * Assembler output consumed by the VM and debugger.
 *
 * The object program is the only runtime input: the VM never sees source text.
 */
export interface ObjectProgram {
    /** Complete 72-cell memory image. */
    readonly memory: readonly Word[];
    /** Source line per memory cell, or {@link NO_SOURCE_LINE}. */
    readonly sourceMap: readonly number[];
    /** Resolved label-to-address map. */
    readonly symbols: ReadonlyMap<string, Address>;
    /** Source-to-machine-code listing. */
    readonly listing: readonly ListingEntry[];
    /** First instruction address. */
    readonly entry: Address;
    /** Address of the terminating `end` instruction, when present. */
    readonly endAddress?: Address;
}

/**
 * Returns whether a value is a valid MOPS word.
 *
 * @param value The value to test.
 */
export function isWord(value: unknown): value is Word {
    return (
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= MIN_WORD &&
        value <= MAX_WORD
    );
}

/**
 * Returns whether a value is a valid MOPS memory address.
 *
 * @param value The value to test.
 */
export function isAddress(value: unknown): value is Address {
    return (
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= 0 &&
        value < MEMORY_SIZE
    );
}
