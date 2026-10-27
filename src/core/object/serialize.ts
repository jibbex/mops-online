/**
 * Serialization for MOPS object programs.
 *
 * Object programs are stored as JSON with the symbol table represented as a
 * plain object. Parsing validates the complete structure before returning a
 * normalized program whose symbols are stored in a `Map`.
 *
 * @module core/object/serialize
 */

import {
    ObjectProgramValidationError,
    validateObjectProgram,
    type Address,
    type ObjectProgram,
    type Word,
} from './program';

/** JSON-safe listing entry. */
export interface SerializedListingEntry {
    readonly line: number;
    readonly address: Address;
    readonly words: readonly Word[];
    readonly source: string;
}

/** JSON-safe object-program representation. */
export interface SerializedObjectProgram {
    readonly memory: readonly Word[];
    readonly sourceMap: readonly number[];
    readonly symbols: Readonly<Record<string, Address>>;
    readonly listing: readonly SerializedListingEntry[];
    readonly entry: Address;
    readonly endAddress?: Address;
}

/**
 * Converts an object program to its JSON-safe representation.
 *
 * @param program The object program to convert.
 * @throws {ObjectProgramValidationError} When the program is invalid.
 */
export function toSerializedObjectProgram(
    program: ObjectProgram,
): SerializedObjectProgram {
    const result = validateObjectProgram(program);

    if (!result.ok) {
        throw new ObjectProgramValidationError(result.issues);
    }

    const { memory, sourceMap, symbols, listing, entry, endAddress } =
        result.program;

    return {
        memory: [...memory],
        sourceMap: [...sourceMap],
        symbols: Object.fromEntries(symbols),
        listing: listing.map((item) => ({
            line: item.line,
            address: item.address,
            words: [...item.words],
            source: item.source,
        })),
        entry,
        ...(endAddress === undefined ? {} : { endAddress }),
    };
}

/**
 * Serializes an object program as JSON.
 *
 * @param program The object program to serialize.
 * @throws {ObjectProgramValidationError} When the program is invalid.
 */
export function serializeObjectProgram(program: ObjectProgram): string {
    return `${JSON.stringify(toSerializedObjectProgram(program), null, 2)}\n`;
}

/**
 * Parses and validates a JSON object program.
 *
 * @param source The JSON text.
 * @throws {ObjectProgramValidationError} When the JSON or program is invalid.
 */
export function parseObjectProgram(source: string): ObjectProgram {
    let value: unknown;

    try {
        value = JSON.parse(source);
    } catch {
        throw new ObjectProgramValidationError([
            { path: '$', message: 'Invalid JSON.' },
        ]);
    }

    const result = validateObjectProgram(value);

    if (!result.ok) {
        throw new ObjectProgramValidationError(result.issues);
    }

    return result.program;
}
