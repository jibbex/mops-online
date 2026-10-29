/**
 * Line parser for MOPS assembly source.
 *
 * The parser is intentionally flat: one source line becomes one parsed line.
 * There is no AST and no expression grammar.
 *
 * @module core/assembler/line-parser
 */

import { getInstruction, hasOperand, type InstructionId } from '@/core/isa';
import { resolveMnemonic, type MnemonicConfig } from './config';
import {
    createDiagnostic,
    type Diagnostic,
    type DiagnosticCode,
} from './diagnostics';
import type { ScannedLine } from './line-scanner';

/** Instruction reference and raw operand text from one line. */
export interface ParsedInstruction {
    readonly id: InstructionId;
    readonly operand: string;
    /** Raw column of the mnemonic. */
    readonly mnemonicColumn: number;
    /** Raw column of the first operand character. */
    readonly operandColumn: number;
}

/** One structurally parsed source line. */
export interface ParsedLine {
    readonly number: number;
    readonly raw: string;
    readonly label?: string;
    readonly instruction: ParsedInstruction;
}

/** Parsed lines and any syntax diagnostics. */
export interface ParseSourceResult {
    readonly lines: readonly ParsedLine[];
    readonly diagnostics: readonly Diagnostic[];
}

/**
 * Parses all scanned lines.
 *
 * @param scannedLines Lines returned by the scanner.
 * @param config Active mnemonic configuration.
 */
export function parseSource(
    scannedLines: readonly ScannedLine[],
    config: MnemonicConfig,
): ParseSourceResult {
    const lines: ParsedLine[] = [];
    const diagnostics: Diagnostic[] = [];

    for (const scanned of scannedLines) {
        const parsed = parseLine(scanned, config, diagnostics);

        if (parsed) {
            lines.push(parsed);
        }
    }

    return { lines, diagnostics };
}

function parseLine(
    scanned: ScannedLine,
    config: MnemonicConfig,
    diagnostics: Diagnostic[],
): ParsedLine | undefined {
    if (scanned.indented) {
        diagnostics.push(
            createLineDiagnostic(
                scanned,
                'indentation',
                'Instructions must not be indented.',
            ),
        );
    }

    const sourceCode = scanned.code.trim();
    let code = sourceCode;
    let label: string | undefined;
    let labelColumn: number | undefined;

    const colon = sourceCode.indexOf(':');

    if (colon !== -1) {
        const afterColon = sourceCode.slice(colon + 1);
        const labelStart =
            colon + 1 + afterColon.length - afterColon.trimStart().length;

        label = afterColon.trim();
        labelColumn = scanned.codeOffset + labelStart;
        code = sourceCode.slice(0, colon).trim();

        if (label === '') {
            diagnostics.push(
                createLineDiagnostic(
                    scanned,
                    'empty-label',
                    'Label name is missing.',
                    labelColumn,
                    0,
                ),
            );
            return undefined;
        }

        if (code === '') {
            diagnostics.push(
                createLineDiagnostic(
                    scanned,
                    'label-without-instruction',
                    'Label must be attached to an instruction.',
                ),
            );
            return undefined;
        }

        if (!/^[a-z][a-z0-9]*$/.test(label)) {
            diagnostics.push(
                createLineDiagnostic(
                    scanned,
                    'invalid-label',
                    'Label must start with a letter and contain only letters and digits.',
                    labelColumn,
                    label.length,
                ),
            );
            return undefined;
        }
    }

    const separator = code.search(/\s/);
    const mnemonic = separator === -1 ? code : code.slice(0, separator);
    const operand = separator === -1 ? '' : code.slice(separator).trim();
    const mnemonicColumn = scanned.codeOffset;
    const remainder = code.slice(mnemonic.length);
    const operandColumn =
        mnemonicColumn +
        mnemonic.length +
        remainder.length -
        remainder.trimStart().length;
    const id = resolveMnemonic(mnemonic, config);

    if (!id) {
        diagnostics.push(
            createLineDiagnostic(
                scanned,
                'unknown-mnemonic',
                `Unknown instruction "${mnemonic}".`,
                mnemonicColumn,
                mnemonic.length,
            ),
        );
        return undefined;
    }

    const instruction = getInstruction(id);

    if (!hasOperand(instruction)) {
        if (operand !== '') {
            diagnostics.push(
                createLineDiagnostic(
                    scanned,
                    'end-with-operand',
                    'The instruction does not take an operand.',
                    operandColumn,
                    operand.length,
                ),
            );
        }
    } else if (operand === '') {
        diagnostics.push(
            createLineDiagnostic(
                scanned,
                'missing-operand',
                'Instruction requires an operand.',
                scanned.raw.length,
                0,
            ),
        );
    }

    return {
        number: scanned.number,
        raw: scanned.raw,
        ...(label === undefined ? {} : { label }),
        instruction: {
            id,
            operand,
            mnemonicColumn,
            operandColumn,
        },
    };
}

function createLineDiagnostic(
    scanned: ScannedLine,
    code: DiagnosticCode,
    message: string,
    column = 0,
    length = scanned.raw.length,
): Diagnostic {
    return createDiagnostic(scanned.number, column, length, code, message);
}
