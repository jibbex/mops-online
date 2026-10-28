/**
 * Assembler encoder.
 *
 * Encodes parsed lines into a fixed-size memory image, resolves symbols and
 * jump targets, and produces a listing and source map.
 *
 * @module core/assembler/encoder
 */

import {
    OPCODES,
    getOpcode,
    type InstructionId,
    type OperandMode,
} from '@/core/isa';
import {
    DATA_END,
    DATA_START,
    MAX_WORD,
    MEMORY_SIZE,
    MIN_WORD,
    type Address,
    type ListingEntry,
    type Word,
} from '@/core/object';
import {
    createDiagnostic,
    createWarning,
    type AssembleWarning,
    type Diagnostic,
    type DiagnosticCode,
} from './diagnostics';
import type { ParsedLine } from './line-parser';

/** Last memory address available to encoded instructions. */
const PROGRAM_LAST_CELL = DATA_START - 1;

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

interface EncoderContext {
    readonly memory: Word[];
    readonly sourceMap: number[];
    readonly listing: ListingEntry[];
    readonly lineToAddress: Map<number, Address>;
    readonly diagnostics: Diagnostic[];
    readonly warnings: AssembleWarning[];
    readonly fixups: JumpFixup[];
    pointer: number;
    endAddress: Address | undefined;
    hasCompare: boolean;
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
    const context = createEncoderContext();

    for (const [index, line] of lines.entries()) {
        if (line.instruction.id === 'end') {
            encodeEndInstruction(context, line, lines.slice(index + 1));
            break;
        }

        encodeInstruction(context, line);
    }

    if (context.endAddress === undefined) {
        reportMissingEnd(context, lines);
    }

    const usedLabels = resolveJumpFixups(context, labels);
    const symbols = collectSymbols(context, labels, usedLabels);

    return {
        memory: context.memory,
        sourceMap: context.sourceMap,
        symbols,
        listing: resolveListing(context.listing, context.memory),
        entry: 0,
        ...(context.endAddress === undefined
            ? {}
            : { endAddress: context.endAddress }),
        diagnostics: context.diagnostics,
        warnings: context.warnings,
    };
}

function createEncoderContext(): EncoderContext {
    return {
        memory: Array<Word>(MEMORY_SIZE).fill(0),
        sourceMap: Array<number>(MEMORY_SIZE).fill(0),
        listing: [],
        lineToAddress: new Map(),
        diagnostics: [],
        warnings: [],
        fixups: [],
        pointer: 0,
        endAddress: undefined,
        hasCompare: false,
    };
}

/**
 * Encodes the terminating `end` instruction and warns about trailing lines.
 *
 * @param context Mutable encoder state.
 * @param line Parsed `end` line.
 * @param remainingLines Lines after `end` in source order.
 */
function encodeEndInstruction(
    context: EncoderContext,
    line: ParsedLine,
    remainingLines: readonly ParsedLine[],
): void {
    if (!reserveCells(context, line, 1)) {
        return;
    }

    const address = context.pointer;

    context.memory[address] = OPCODES.HALT;
    context.sourceMap[address] = line.number;
    context.lineToAddress.set(line.number, address);
    context.listing.push({
        line: line.number,
        address,
        words: [OPCODES.HALT],
        source: line.raw,
    });
    context.endAddress = address;

    for (const remaining of remainingLines) {
        context.warnings.push(
            createLineWarning(
                remaining,
                'code-after-end',
                'Instructions after "end" are not executed.',
            ),
        );
    }
}

/**
 * Encodes one instruction line and records fixups for jump targets.
 *
 * @param context Mutable encoder state.
 * @param line Parsed instruction line.
 */
function encodeInstruction(context: EncoderContext, line: ParsedLine): void {
    const resolution = resolveOperand(line, line.instruction.id);

    if (!resolution.ok) {
        context.diagnostics.push(resolution.diagnostic);
        return;
    }

    const { mode, value, fixup } = resolution.operand;
    const opcode = getOpcode(line.instruction.id, mode);

    if (opcode === undefined) {
        context.diagnostics.push(
            createLineDiagnostic(
                line,
                'invalid-operand-mode',
                `Instruction "${line.instruction.id}" does not support this operand.`,
            ),
        );
        return;
    }

    const hasOperand = mode !== 'none';
    const wordCount = hasOperand ? 2 : 1;

    if (!reserveCells(context, line, wordCount)) {
        return;
    }

    const address = context.pointer;

    context.memory[address] = opcode;
    context.sourceMap[address] = line.number;
    context.pointer += 1;

    const words: Word[] = [opcode];

    if (hasOperand) {
        const operandValue = value ?? 0;

        context.memory[context.pointer] = operandValue;
        context.sourceMap[context.pointer] = line.number;
        words.push(operandValue);
        context.pointer += 1;
    }

    context.lineToAddress.set(line.number, address);
    context.listing.push({
        line: line.number,
        address,
        words,
        source: line.raw,
    });

    if (line.instruction.id === 'cmp') {
        context.hasCompare = true;
    }

    if (isConditionalJump(line.instruction.id) && !context.hasCompare) {
        context.diagnostics.push(
            createLineDiagnostic(
                line,
                'conditional-without-compare',
                'Conditional jump requires a preceding cmp instruction.',
            ),
        );
    }

    if (fixup !== undefined) {
        context.fixups.push({
            address: context.pointer - 1,
            line: line.number,
            ...fixup,
        });
    }
}

/**
 * Reserves memory cells for an encoded line.
 *
 * @param context Mutable encoder state.
 * @param line Source line that needs the cells.
 * @param wordCount Number of cells required.
 * @returns Whether the cells fit in the program area.
 */
function reserveCells(
    context: EncoderContext,
    line: ParsedLine,
    wordCount: number,
): boolean {
    if (context.pointer + wordCount <= PROGRAM_LAST_CELL + 1) {
        return true;
    }

    context.diagnostics.push(
        createLineDiagnostic(
            line,
            'program-overflow',
            'Program is too large for the available memory.',
        ),
    );

    return false;
}

/**
 * Reports a missing `end` instruction on the last source line.
 *
 * @param context Mutable encoder state.
 * @param lines Parsed source lines.
 */
function reportMissingEnd(
    context: EncoderContext,
    lines: readonly ParsedLine[],
): void {
    const lastLine = lines.at(-1);

    context.diagnostics.push(
        createDiagnostic(
            lastLine?.number ?? 1,
            0,
            lastLine?.raw.length ?? 0,
            'missing-end',
            'Program must end with the end instruction.',
        ),
    );
}

/**
 * Resolves every jump fixup against the final instruction addresses.
 *
 * @param context Mutable encoder state.
 * @param labels Label-to-source-line map.
 * @returns Labels that were used by jump targets.
 */
function resolveJumpFixups(
    context: EncoderContext,
    labels: ReadonlyMap<string, number>,
): ReadonlySet<string> {
    const usedLabels = new Set<string>();

    for (const fixup of context.fixups) {
        const targetLine = fixup.targetLine ?? labels.get(fixup.label ?? '');

        if (targetLine === undefined) {
            context.diagnostics.push(
                createPointDiagnostic(
                    fixup.line,
                    'undefined-jump-target',
                    `Jump target "${fixup.label ?? ''}" is not defined.`,
                ),
            );
            continue;
        }

        const targetAddress = context.lineToAddress.get(targetLine);

        if (targetAddress === undefined) {
            context.diagnostics.push(
                createPointDiagnostic(
                    fixup.line,
                    'invalid-jump-target',
                    'Jump target does not refer to an instruction.',
                ),
            );
            continue;
        }

        context.memory[fixup.address] = targetAddress;

        if (fixup.label !== undefined) {
            usedLabels.add(fixup.label);
        }
    }

    return usedLabels;
}

/**
 * Builds the resolved symbol table and warns about unused labels.
 *
 * @param context Mutable encoder state.
 * @param labels Label-to-source-line map.
 * @param usedLabels Labels referenced by jump targets.
 */
function collectSymbols(
    context: EncoderContext,
    labels: ReadonlyMap<string, number>,
    usedLabels: ReadonlySet<string>,
): ReadonlyMap<string, Address> {
    const symbols = new Map<string, Address>();

    for (const [label, lineNumber] of labels) {
        const address = context.lineToAddress.get(lineNumber);

        if (address === undefined) {
            continue;
        }

        symbols.set(label, address);

        if (!usedLabels.has(label)) {
            context.warnings.push(
                createPointWarning(
                    lineNumber,
                    'unused-label',
                    `Label "${label}" is never used.`,
                ),
            );
        }
    }

    return symbols;
}

/**
 * Resolves listing words against the final memory image.
 *
 * @param listing Raw listing entries.
 * @param memory Complete memory image.
 */
function resolveListing(
    listing: readonly ListingEntry[],
    memory: readonly Word[],
): readonly ListingEntry[] {
    return listing.map((item) => ({
        ...item,
        words: item.words.map(
            (_, offset) => memory[item.address + offset] ?? 0,
        ),
    }));
}

function isConditionalJump(id: InstructionId): boolean {
    return id === 'jlt' || id === 'jeq' || id === 'jgt';
}

function createLineDiagnostic(
    line: ParsedLine,
    code: DiagnosticCode,
    message: string,
): Diagnostic {
    return createDiagnostic(line.number, 0, line.raw.length, code, message);
}

function createLineWarning(
    line: ParsedLine,
    code: DiagnosticCode,
    message: string,
): AssembleWarning {
    return createWarning(line.number, 0, line.raw.length, code, message);
}

function createPointDiagnostic(
    line: number,
    code: DiagnosticCode,
    message: string,
): Diagnostic {
    return createDiagnostic(line, 0, 0, code, message);
}

function createPointWarning(
    line: number,
    code: DiagnosticCode,
    message: string,
): AssembleWarning {
    return createWarning(line, 0, 0, code, message);
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
    code: DiagnosticCode,
    message: string,
): OperandResolution {
    return {
        ok: false,
        diagnostic: createLineDiagnostic(line, code, message),
    };
}

function parseAddress(value: string): Address | undefined {
    if (/^[a-h]$/.test(value)) {
        return DATA_START + value.charCodeAt(0) - 'a'.charCodeAt(0);
    }

    const match = /^\$(\d+)$/.exec(value);

    if (!match) {
        return undefined;
    }

    const address = Number.parseInt(match[1] ?? '', 10);

    return address >= DATA_START && address <= DATA_END ? address : undefined;
}

function parseImmediate(value: string): Word | undefined {
    const parsed = parseInteger(value);

    if (parsed === undefined || parsed < MIN_WORD || parsed > MAX_WORD) {
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
