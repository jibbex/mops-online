/**
 * Assembler encoder.
 *
 * Encodes parsed lines into a 72-cell memory image, resolves symbols and jump
 * targets, and produces a listing and source map.
 *
 * @module core/assembler/encoder
 */

import { getOpcode, type InstructionId, type OperandMode } from '@/core/isa';
import {
    MEMORY_SIZE,
    type Address,
    type ListingEntry,
    type Word,
} from '@/core/object';
import {
    createDiagnostic,
    createWarning,
    type AssembleWarning,
    type Diagnostic,
} from './diagnostics';
import type { ParsedLine } from './lineParser';

/** Last memory address available to encoded instructions. */
const PROGRAM_LAST_CELL = 63;
/** Encoded value of the `end` instruction. */
const END_OPCODE = 60;

/**
 * Complete encoder output before the assembler wraps it in an object program.
 */
export interface EncoderResult {
    readonly memory: readonly Word[];
    readonly sourceMap: readonly number[];
    readonly symbols: ReadonlyMap<string, Address>;
    readonly listing: readonly ListingEntry[];
    readonly entry: Address;
    readonly endAddress?: Address;
    readonly diagnostics: readonly Diagnostic[];
    readonly warnings: readonly AssembleWarning[];
}

interface JumpFixup {
    readonly address: Address;
    readonly line: number;
    readonly label?: string;
    readonly targetLine?: number;
}

interface ResolvedOperand {
    readonly mode: OperandMode;
    readonly value?: Word;
    readonly fixup?: Omit<JumpFixup, 'address' | 'line'>;
}

type OperandResolution =
    | { readonly ok: true; readonly operand: ResolvedOperand }
    | { readonly ok: false; readonly diagnostic: Diagnostic };

/**
 * Encodes parsed lines.
 *
 * @param lines Parsed source lines in source order.
 * @param labels Label-to-source-line map.
 */
export function encodeProgram(
    lines: readonly ParsedLine[],
    labels: ReadonlyMap<string, number>,
): EncoderResult {
    const memory: Word[] = Array<Word>(MEMORY_SIZE).fill(0);
    const sourceMap: number[] = Array<number>(MEMORY_SIZE).fill(0);
    const listing: ListingEntry[] = [];
    const diagnostics: Diagnostic[] = [];
    const warnings: AssembleWarning[] = [];
    const lineToAddress = new Map<number, Address>();
    const fixups: JumpFixup[] = [];
    const usedLabels = new Set<string>();

    let pointer = 0;
    let endAddress: Address | undefined;
    let hasCompare = false;

    for (const [index, line] of lines.entries()) {
        if (line.instruction.id === 'end') {
            if (pointer > PROGRAM_LAST_CELL) {
                diagnostics.push(
                    createDiagnostic(
                        line.number,
                        0,
                        line.raw.length,
                        'program-overflow',
                        'Program is too large for the available memory.',
                    ),
                );
                break;
            }

            memory[pointer] = END_OPCODE;
            sourceMap[pointer] = line.number;
            lineToAddress.set(line.number, pointer);
            listing.push({
                line: line.number,
                address: pointer,
                words: [END_OPCODE],
                source: line.raw,
            });
            endAddress = pointer;

            for (const remaining of lines.slice(index + 1)) {
                warnings.push(
                    createWarning(
                        remaining.number,
                        0,
                        remaining.raw.length,
                        'code-after-end',
                        `Instructions after "end" are not executed.`,
                    ),
                );
            }

            break;
        }

        const resolution = resolveOperand(line, line.instruction.id);

        if (!resolution.ok) {
            diagnostics.push(resolution.diagnostic);
            continue;
        }

        const { mode, value, fixup } = resolution.operand;
        const opcode = getOpcode(line.instruction.id, mode);

        if (opcode === undefined) {
            diagnostics.push(
                createDiagnostic(
                    line.number,
                    0,
                    line.raw.length,
                    'invalid-operand-mode',
                    `Instruction "${line.instruction.id}" does not support this operand.`,
                ),
            );
            continue;
        }

        const hasOperand = mode !== 'none';
        const wordCount = hasOperand ? 2 : 1;

        if (pointer + wordCount > PROGRAM_LAST_CELL + 1) {
            diagnostics.push(
                createDiagnostic(
                    line.number,
                    0,
                    line.raw.length,
                    'program-overflow',
                    'Program is too large for the available memory.',
                ),
            );
            break;
        }

        const address = pointer;
        memory[pointer] = opcode;
        sourceMap[pointer] = line.number;
        pointer += 1;

        const words: Word[] = [opcode];

        if (hasOperand) {
            const operandValue = value ?? 0;
            memory[pointer] = operandValue;
            sourceMap[pointer] = line.number;
            words.push(operandValue);
            pointer += 1;
        }

        lineToAddress.set(line.number, address);
        listing.push({
            line: line.number,
            address,
            words,
            source: line.raw,
        });

        if (line.instruction.id === 'cmp') {
            hasCompare = true;
        }

        if (
            line.instruction.id === 'jlt' ||
            line.instruction.id === 'jeq' ||
            line.instruction.id === 'jgt'
        ) {
            if (!hasCompare) {
                diagnostics.push(
                    createDiagnostic(
                        line.number,
                        0,
                        line.raw.length,
                        'conditional-without-compare',
                        'Conditional jump requires a preceding cmp instruction.',
                    ),
                );
            }
        }

        if (fixup !== undefined) {
            fixups.push({
                address: pointer - 1,
                line: line.number,
                ...fixup,
            });
        }
    }

    if (endAddress === undefined) {
        const lastLine = lines.at(-1)?.number ?? 1;

        diagnostics.push(
            createDiagnostic(
                lastLine,
                0,
                lines.at(-1)?.raw.length ?? 0,
                'missing-end',
                'Program must end with the end instruction.',
            ),
        );
    }

    for (const fixup of fixups) {
        const targetLine = fixup.targetLine ?? labels.get(fixup.label ?? '');

        if (targetLine === undefined) {
            diagnostics.push(
                createDiagnostic(
                    fixup.line,
                    0,
                    0,
                    'undefined-jump-target',
                    `Jump target "${fixup.label ?? ''}" is not defined.`,
                ),
            );
            continue;
        }

        const targetAddress = lineToAddress.get(targetLine);

        if (targetAddress === undefined) {
            diagnostics.push(
                createDiagnostic(
                    fixup.line,
                    0,
                    0,
                    'invalid-jump-target',
                    'Jump target does not refer to an instruction.',
                ),
            );
            continue;
        }

        memory[fixup.address] = targetAddress;

        if (fixup.label !== undefined) {
            usedLabels.add(fixup.label);
        }
    }

    const symbols = new Map<string, Address>();

    for (const [label, lineNumber] of labels) {
        const address = lineToAddress.get(lineNumber);

        if (address === undefined) {
            continue;
        }

        symbols.set(label, address);

        if (!usedLabels.has(label)) {
            warnings.push(
                createWarning(
                    lineNumber,
                    0,
                    0,
                    'unused-label',
                    `Label "${label}" is never used.`,
                ),
            );
        }
    }

    const resolvedListing = listing.map((item) => ({
        ...item,
        words: item.words.map(
            (_, offset) => memory[item.address + offset] ?? 0,
        ),
    }));

    return {
        memory,
        sourceMap,
        symbols,
        listing: resolvedListing,
        entry: 0,
        ...(endAddress === undefined ? {} : { endAddress }),
        diagnostics,
        warnings,
    };
}

function resolveOperand(
    line: ParsedLine,
    id: InstructionId,
): OperandResolution {
    const operand = line.instruction.operand;

    if (id === 'end') {
        return { ok: true, operand: { mode: 'none' } };
    }

    if (id === 'st' || id === 'in') {
        const address = parseAddress(operand);

        if (address === undefined) {
            return fail(
                line,
                'invalid-address',
                'Instruction requires a data address.',
            );
        }

        return { ok: true, operand: { mode: 'address', value: address } };
    }

    if (id === 'jmp' || id === 'jlt' || id === 'jeq' || id === 'jgt') {
        if (operand.startsWith('#')) {
            const targetLine = parseInteger(operand.slice(1));

            if (targetLine === undefined || targetLine < 1 || targetLine > 99) {
                return fail(
                    line,
                    'invalid-line-target',
                    'Line target must be a number from 1 to 99.',
                );
            }

            return {
                ok: true,
                operand: { mode: 'target', fixup: { targetLine } },
            };
        }

        if (!/^[a-z][a-z0-9]*$/.test(operand)) {
            return fail(
                line,
                'invalid-jump-target',
                'Jump target must be a label or a line number.',
            );
        }

        return {
            ok: true,
            operand: { mode: 'target', fixup: { label: operand } },
        };
    }

    const address = parseAddress(operand);

    if (address !== undefined) {
        return { ok: true, operand: { mode: 'address', value: address } };
    }

    const value = parseImmediate(operand);

    if (value === undefined) {
        return fail(
            line,
            'invalid-operand',
            'Operand must be a data address or an integer value.',
        );
    }

    return { ok: true, operand: { mode: 'immediate', value } };
}

function fail(
    line: ParsedLine,
    code: string,
    message: string,
): OperandResolution {
    return {
        ok: false,
        diagnostic: createDiagnostic(
            line.number,
            0,
            line.raw.length,
            code,
            message,
        ),
    };
}

function parseAddress(value: string): Address | undefined {
    if (/^[a-h]$/.test(value)) {
        return 64 + value.charCodeAt(0) - 'a'.charCodeAt(0);
    }

    const match = /^\$(\d+)$/.exec(value);

    if (!match) {
        return undefined;
    }

    const address = Number.parseInt(match[1] ?? '', 10);

    return address >= 64 && address <= 71 ? address : undefined;
}

function parseImmediate(value: string): Word | undefined {
    const parsed = parseInteger(value);

    if (parsed === undefined || parsed < -9999 || parsed > 9999) {
        return undefined;
    }

    return parsed;
}

function parseInteger(value: string): number | undefined {
    if (!/^-?\d+$/.test(value)) {
        return undefined;
    }

    const parsed = Number.parseInt(value, 10);

    return Number.isNaN(parsed) ? undefined : parsed;
}
