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
import { createDiagnostic, type Diagnostic } from './diagnostics';
import type { ScannedLine } from './line-scanner';

/** Instruction reference and raw operand text from one line. */
export interface ParsedInstruction {
    readonly id: InstructionId;
    readonly operand: string;
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
            createDiagnostic(
                scanned.number,
                0,
                scanned.raw.length,
                'indentation',
                'Instructions must not be indented.',
            ),
        );
    }

    let code = scanned.code.trim();
    let label: string | undefined;

    const colon = code.indexOf(':');

    if (colon !== -1) {
        label = code.slice(colon + 1).trim();
        code = code.slice(0, colon).trim();

        if (label === '') {
            diagnostics.push(
                createDiagnostic(
                    scanned.number,
                    0,
                    scanned.raw.length,
                    'empty-label',
                    'Label name is missing.',
                ),
            );
            return undefined;
        }

        if (code === '') {
            diagnostics.push(
                createDiagnostic(
                    scanned.number,
                    0,
                    scanned.raw.length,
                    'label-without-instruction',
                    'Label must be attached to an instruction.',
                ),
            );
            return undefined;
        }

        if (!/^[a-z][a-z0-9]*$/.test(label)) {
            diagnostics.push(
                createDiagnostic(
                    scanned.number,
                    0,
                    scanned.raw.length,
                    'invalid-label',
                    'Label must start with a letter and contain only letters and digits.',
                ),
            );
            return undefined;
        }
    }

    const match = /^(\S+)(?:\s+(.*))?$/.exec(code);

    if (!match) {
        diagnostics.push(
            createDiagnostic(
                scanned.number,
                0,
                scanned.raw.length,
                'empty-line',
                'Line does not contain an instruction.',
            ),
        );
        return undefined;
    }

    const mnemonic = match[1] ?? '';
    const operand = (match[2] ?? '').trim();
    const id = resolveMnemonic(mnemonic, config);

    if (!id) {
        diagnostics.push(
            createDiagnostic(
                scanned.number,
                0,
                scanned.raw.length,
                'unknown-mnemonic',
                `Unknown instruction "${mnemonic}".`,
            ),
        );
        return undefined;
    }

    const instruction = getInstruction(id);

    if (!hasOperand(instruction)) {
        if (operand !== '') {
            diagnostics.push(
                createDiagnostic(
                    scanned.number,
                    0,
                    scanned.raw.length,
                    'end-with-operand',
                    'The instruction does not take an operand.',
                ),
            );
        }
    } else if (operand === '') {
        diagnostics.push(
            createDiagnostic(
                scanned.number,
                0,
                scanned.raw.length,
                'missing-operand',
                'Instruction requires an operand.',
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
        },
    };
}
