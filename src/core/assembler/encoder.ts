/**
 * Assembler encoder.
 *
 * Encodes parsed lines into a fixed-size memory image, resolves symbols and
 * jump targets, and produces a listing and source map.
 *
 * @module core/assembler/encoder
 */

import {
    getInstruction,
    getOpcode,
    getOperandFamily,
    type InstructionSpec,
    type OperandMode,
    type Opcode,
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
import { MAX_LINE_TARGET } from './limits';

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
    readonly endAddress: Address | undefined;
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

/**
 * A jump operand whose target is not known until all lines are laid out.
 *
 * Numeric targets stay attached to their source line, while labels are looked
 * up after encoding. This is what makes forward references work.
 */
type OperandFixup =
    | { readonly kind: 'line'; readonly targetLine: number }
    | { readonly kind: 'label'; readonly label: string };

type JumpFixup = OperandFixup & {
    readonly address: Address;
    readonly line: number;
    readonly operandColumn: number;
    readonly operandLength: number;
};

interface ResolvedOperand {
    readonly mode: OperandMode;
    readonly value?: Word;
    readonly fixup?: OperandFixup;
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

    // Encoding stops at the first terminating instruction; later lines are
    // still parsed so they can be reported as warnings instead of silently
    // disappearing from the source model.
    for (const [index, line] of lines.entries()) {
        const instruction = getInstruction(line.instruction.id);
        const address = encodeInstruction(context, line);

        if (!instruction.terminates) {
            continue;
        }

        if (address !== undefined) {
            context.endAddress = address;

            for (const remaining of lines.slice(index + 1)) {
                context.warnings.push(
                    createLineWarning(
                        remaining,
                        'code-after-end',
                        'Instructions after "end" are not executed.',
                    ),
                );
            }
        }

        break;
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
        endAddress: context.endAddress,
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
 * Encodes one instruction line and records fixups for jump targets.
 *
 * @param context Mutable encoder state.
 * @param line Parsed instruction line.
 * @returns The instruction address, or undefined when nothing was encoded.
 */
function encodeInstruction(
    context: EncoderContext,
    line: ParsedLine,
): Address | undefined {
    const instruction = getInstruction(line.instruction.id);
    const resolution = resolveOperand(line, instruction);

    if (!resolution.ok) {
        context.diagnostics.push(resolution.diagnostic);
        return undefined;
    }

    const { mode, value, fixup } = resolution.operand;
    // The operand family is derived from the same opcode table, so a resolved
    // mode always has an opcode.
    const opcode = getOpcode(line.instruction.id, mode) as Opcode;
    const hasOperand = mode !== 'none';
    const wordCount = hasOperand ? 2 : 1;

    if (!reserveCells(context, line, wordCount)) {
        return undefined;
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

    if (instruction.writesCompare) {
        context.hasCompare = true;
    }

    if (instruction.requiresCompare && !context.hasCompare) {
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
            operandColumn: line.instruction.operandColumn,
            operandLength: line.instruction.operand.length,
            ...fixup,
        });
    }

    return address;
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
        const label = fixup.kind === 'label' ? fixup.label : undefined;
        const targetLine =
            fixup.kind === 'line' ? fixup.targetLine : labels.get(fixup.label);

        if (targetLine === undefined) {
            context.diagnostics.push(
                createPointDiagnostic(
                    fixup.line,
                    'undefined-jump-target',
                    `Jump target "${label}" is not defined.`,
                ),
            );
            continue;
        }

        const targetAddress = context.lineToAddress.get(targetLine);

        if (targetAddress === undefined) {
            context.diagnostics.push(
                createDiagnostic(
                    fixup.line,
                    fixup.operandColumn,
                    fixup.operandLength,
                    'invalid-jump-target',
                    'Jump target does not refer to an instruction.',
                ),
            );
            continue;
        }

        context.memory[fixup.address] = targetAddress;

        if (label !== undefined) {
            usedLabels.add(label);
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
        // Listings are only recorded after their cells were reserved, so every
        // listed address is inside the memory image.
        words: item.words.map(
            (_, offset) => memory[item.address + offset] as Word,
        ),
    }));
}

function createLineDiagnostic(
    line: ParsedLine,
    code: DiagnosticCode,
    message: string,
    column = 0,
    length = line.raw.length,
): Diagnostic {
    return createDiagnostic(line.number, column, length, code, message);
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
    instruction: InstructionSpec,
): OperandResolution {
    const operand = line.instruction.operand;

    switch (getOperandFamily(instruction)) {
        case 'none':
            return { ok: true, operand: { mode: 'none' } };
        case 'target':
            return resolveTargetOperand(line, operand);
        case 'address':
            return resolveAddressOperand(line, operand);
        case 'address-or-immediate':
            return resolveAddressOrImmediateOperand(line, operand);
    }
}

/**
 * Resolves a jump target.
 *
 * Numeric targets are represented as source-line fixups because addresses are
 * only known after the complete program layout has been encoded.
 */
function resolveTargetOperand(
    line: ParsedLine,
    operand: string,
): OperandResolution {
    if (operand.startsWith('#')) {
        const targetLine = parseInteger(operand.slice(1));

        if (
            targetLine === undefined ||
            targetLine < 1 ||
            targetLine > MAX_LINE_TARGET
        ) {
            return fail(
                line,
                'invalid-line-target',
                `Line target must be a number from 1 to ${MAX_LINE_TARGET}.`,
            );
        }

        return {
            ok: true,
            operand: {
                mode: 'target',
                fixup: { kind: 'line', targetLine },
            },
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
        operand: { mode: 'target', fixup: { kind: 'label', label: operand } },
    };
}

/**
 * Resolves an instruction that only accepts data addresses.
 */
function resolveAddressOperand(
    line: ParsedLine,
    operand: string,
): OperandResolution {
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

/**
 * Resolves an instruction that accepts either an address or an immediate.
 *
 * Addresses are tried first so `a` through `h` and `$64` through `$71` keep
 * their documented meaning; everything else must be a valid word.
 */
function resolveAddressOrImmediateOperand(
    line: ParsedLine,
    operand: string,
): OperandResolution {
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
        diagnostic: createLineDiagnostic(
            line,
            code,
            message,
            line.instruction.operandColumn,
            line.instruction.operand.length,
        ),
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

    const address = Number(match[1]);

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

    return Number.parseInt(value, 10);
}
