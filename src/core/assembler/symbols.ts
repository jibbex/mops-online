/**
 * Symbol collection for the MOPS assembler.
 *
 * Labels are attached to source lines and resolved to memory addresses after
 * encoding.
 *
 * @module core/assembler/symbols
 */

import { createDiagnostic, type Diagnostic } from './diagnostics';
import type { ParsedLine } from './lineParser';

/**
 * Labels collected from parsed source lines.
 *
 * Values are one-based source lines; addresses are resolved after encoding.
 */
export interface SymbolCollectionResult {
    readonly labels: ReadonlyMap<string, number>;
    readonly diagnostics: readonly Diagnostic[];
}

/**
 * Collects labels and rejects duplicate definitions.
 *
 * @param lines Parsed source lines.
 */
export function collectSymbols(
    lines: readonly ParsedLine[],
): SymbolCollectionResult {
    const labels = new Map<string, number>();
    const diagnostics: Diagnostic[] = [];

    for (const line of lines) {
        if (!line.label) {
            continue;
        }

        const existing = labels.get(line.label);

        if (existing !== undefined) {
            diagnostics.push(
                createDiagnostic(
                    line.number,
                    0,
                    line.raw.length,
                    'duplicate-label',
                    `Label "${line.label}" is already defined on line ${existing}.`,
                ),
            );
            continue;
        }

        labels.set(line.label, line.number);
    }

    return { labels, diagnostics };
}
