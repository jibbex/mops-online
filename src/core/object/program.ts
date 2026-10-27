/**
 * Object program model for MOPS.
 *
 * An object program is the boundary between the assembler and the VM. It
 * contains the complete 72-cell memory image plus the metadata needed by the
 * editor, listing view, and debugger.
 *
 * @module core/object/program
 */

export const MEMORY_SIZE = 72;
export const MIN_WORD = -9999;
export const MAX_WORD = 9999;
export const DATA_START = 64;
export const DATA_END = 71;
export const NO_SOURCE_LINE = 0;

export type Word = number;
export type Address = number;

export interface ListingEntry {
    readonly line: number;
    readonly address: Address;
    readonly words: readonly Word[];
    readonly source: string;
}

export interface ObjectProgram {
    readonly memory: readonly Word[];
    readonly sourceMap: readonly number[];
    readonly symbols: ReadonlyMap<string, Address>;
    readonly listing: readonly ListingEntry[];
    readonly entry: Address;
    readonly endAddress?: Address;
}

export interface ObjectProgramIssue {
    readonly path: string;
    readonly message: string;
}

export type ObjectProgramValidationResult =
    | { readonly ok: true; readonly program: ObjectProgram }
    | { readonly ok: false; readonly issues: readonly ObjectProgramIssue[] };

/**
 * Error raised when an object program cannot be validated or parsed.
 */
export class ObjectProgramValidationError extends Error {
    readonly issues: readonly ObjectProgramIssue[];

    constructor(issues: readonly ObjectProgramIssue[]) {
        super(`Invalid object program: ${formatIssues(issues)}`);
        this.name = 'ObjectProgramValidationError';
        this.issues = issues;
    }
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

/**
 * Validates an unknown value and normalizes its symbol table to a `Map`.
 *
 * @param value The candidate object program.
 */
export function validateObjectProgram(
    value: unknown,
): ObjectProgramValidationResult {
    if (!isRecord(value)) {
        return fail('$', 'Object program must be an object.');
    }

    const issues: ObjectProgramIssue[] = [];
    const memory = readMemory(value.memory, '$.memory', issues);
    const sourceMap = readSourceMap(value.sourceMap, '$.sourceMap', issues);
    const symbols = readSymbols(value.symbols, '$.symbols', issues);
    const listing = readListing(value.listing, '$.listing', issues);
    const entry = readAddress(value.entry, '$.entry', issues);
    const endAddress =
        value.endAddress === undefined
            ? undefined
            : readAddress(value.endAddress, '$.endAddress', issues);

    if (
        issues.length > 0 ||
        memory === undefined ||
        sourceMap === undefined ||
        symbols === undefined ||
        listing === undefined ||
        entry === undefined
    ) {
        return {
            ok: false,
            issues:
                issues.length > 0
                    ? issues
                    : [
                          {
                              path: '$',
                              message: 'Object program is incomplete.',
                          },
                      ],
        };
    }

    return {
        ok: true,
        program: {
            memory,
            sourceMap,
            symbols,
            listing,
            entry,
            ...(endAddress === undefined ? {} : { endAddress }),
        },
    };
}

/**
 * Asserts that a value is a valid object program.
 *
 * @param value The candidate object program.
 * @throws {ObjectProgramValidationError} When validation fails.
 */
export function assertObjectProgram(
    value: unknown,
): asserts value is ObjectProgram {
    const result = validateObjectProgram(value);

    if (!result.ok) {
        throw new ObjectProgramValidationError(result.issues);
    }
}

function readMemory(
    value: unknown,
    path: string,
    issues: ObjectProgramIssue[],
): readonly Word[] | undefined {
    if (!Array.isArray(value)) {
        issues.push({ path, message: 'Memory must be an array.' });
        return undefined;
    }

    if (value.length !== MEMORY_SIZE) {
        issues.push({
            path,
            message: `Memory must contain exactly ${MEMORY_SIZE} cells.`,
        });
    }

    let valid = value.length === MEMORY_SIZE;

    for (const [index, cell] of value.entries()) {
        if (!isWord(cell)) {
            issues.push({
                path: `${path}[${index}]`,
                message: `Memory cell must be an integer from ${MIN_WORD} to ${MAX_WORD}.`,
            });
            valid = false;
        }
    }

    return valid ? (value as Word[]) : undefined;
}

function readSourceMap(
    value: unknown,
    path: string,
    issues: ObjectProgramIssue[],
): readonly number[] | undefined {
    if (!Array.isArray(value)) {
        issues.push({ path, message: 'Source map must be an array.' });
        return undefined;
    }

    if (value.length !== MEMORY_SIZE) {
        issues.push({
            path,
            message: `Source map must contain exactly ${MEMORY_SIZE} entries.`,
        });
    }

    let valid = value.length === MEMORY_SIZE;

    for (const [index, line] of value.entries()) {
        if (
            typeof line !== 'number' ||
            !Number.isInteger(line) ||
            line < NO_SOURCE_LINE
        ) {
            issues.push({
                path: `${path}[${index}]`,
                message: `Source line must be an integer greater than or equal to ${NO_SOURCE_LINE}.`,
            });
            valid = false;
        }
    }

    return valid ? (value as number[]) : undefined;
}

function readSymbols(
    value: unknown,
    path: string,
    issues: ObjectProgramIssue[],
): ReadonlyMap<string, Address> | undefined {
    const entries: [string, unknown][] = [];

    if (value instanceof Map) {
        for (const [name, address] of value) {
            entries.push([String(name), address]);
        }
    } else if (isRecord(value)) {
        entries.push(...Object.entries(value));
    } else {
        issues.push({
            path,
            message: 'Symbols must be a Map or an object.',
        });
        return undefined;
    }

    let valid = true;
    const symbols = new Map<string, Address>();

    for (const [name, address] of entries) {
        if (name.length === 0) {
            issues.push({
                path: `${path}.${name}`,
                message: 'Symbol name must not be empty.',
            });
            valid = false;
            continue;
        }

        if (!isAddress(address)) {
            issues.push({
                path: `${path}.${name}`,
                message: `Symbol address must be an integer from 0 to ${MEMORY_SIZE - 1}.`,
            });
            valid = false;
            continue;
        }

        if (symbols.has(name)) {
            issues.push({
                path: `${path}.${name}`,
                message: 'Symbol names must be unique.',
            });
            valid = false;
            continue;
        }

        symbols.set(name, address);
    }

    return valid ? symbols : undefined;
}

function readListing(
    value: unknown,
    path: string,
    issues: ObjectProgramIssue[],
): readonly ListingEntry[] | undefined {
    if (!Array.isArray(value)) {
        issues.push({ path, message: 'Listing must be an array.' });
        return undefined;
    }

    let valid = true;
    let previousEnd = 0;
    const listing: ListingEntry[] = [];

    for (const [index, candidate] of value.entries()) {
        const entryPath = `${path}[${index}]`;

        if (!isRecord(candidate)) {
            issues.push({
                path: entryPath,
                message: 'Listing entry must be an object.',
            });
            valid = false;
            continue;
        }

        const line = candidate.line;
        const address = candidate.address;
        const words = candidate.words;
        const source = candidate.source;

        if (typeof line !== 'number' || !Number.isInteger(line) || line < 1) {
            issues.push({
                path: `${entryPath}.line`,
                message: 'Listing line must be a positive integer.',
            });
            valid = false;
        }

        if (!isAddress(address)) {
            issues.push({
                path: `${entryPath}.address`,
                message: `Listing address must be an integer from 0 to ${MEMORY_SIZE - 1}.`,
            });
            valid = false;
        }

        if (typeof source !== 'string') {
            issues.push({
                path: `${entryPath}.source`,
                message: 'Listing source must be a string.',
            });
            valid = false;
        }

        if (!Array.isArray(words) || words.length < 1 || words.length > 2) {
            issues.push({
                path: `${entryPath}.words`,
                message: 'Listing words must contain one or two cells.',
            });
            valid = false;
        } else {
            for (const [wordIndex, word] of words.entries()) {
                if (!isWord(word)) {
                    issues.push({
                        path: `${entryPath}.words[${wordIndex}]`,
                        message: `Listing word must be an integer from ${MIN_WORD} to ${MAX_WORD}.`,
                    });
                    valid = false;
                }
            }
        }

        if (!isAddress(address) || !Array.isArray(words)) {
            continue;
        }

        const end = address + words.length;

        if (end > MEMORY_SIZE) {
            issues.push({
                path: `${entryPath}.words`,
                message: 'Listing entry exceeds the memory limit.',
            });
            valid = false;
            continue;
        }

        if (address < previousEnd) {
            issues.push({
                path: `${entryPath}.address`,
                message: 'Listing entries must not overlap.',
            });
            valid = false;
            continue;
        }

        previousEnd = end;

        if (
            typeof line === 'number' &&
            Number.isInteger(line) &&
            line >= 1 &&
            typeof source === 'string'
        ) {
            listing.push({
                line,
                address,
                words: words as Word[],
                source,
            });
        }
    }

    return valid ? listing : undefined;
}

function readAddress(
    value: unknown,
    path: string,
    issues: ObjectProgramIssue[],
): Address | undefined {
    if (!isAddress(value)) {
        issues.push({
            path,
            message: `Address must be an integer from 0 to ${MEMORY_SIZE - 1}.`,
        });
        return undefined;
    }

    return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(path: string, message: string): ObjectProgramValidationResult {
    return { ok: false, issues: [{ path, message }] };
}

function formatIssues(issues: readonly ObjectProgramIssue[]): string {
    return issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
}
