/**
 * Public assembler API.
 *
 * @module core/assembler
 */

import type { ObjectProgram } from '@/core/object';
import { DEFAULT_MNEMONICS, type MnemonicConfig } from './config';
import type { AssembleResult } from './diagnostics';
import { encodeProgram } from './encoder';
import { parseSource } from './line-parser';
import { scanSource } from './line-scanner';
import { collectSymbols } from './symbols';

/**
 * Assembles MOPS source into an object program.
 *
 * @param source The assembly source text.
 * @param config Active mnemonic configuration.
 */
export function assemble(
    source: string,
    config: MnemonicConfig = DEFAULT_MNEMONICS,
): AssembleResult {
    const scanned = scanSource(source);
    const parsed = parseSource(scanned, config);
    const diagnostics = [...parsed.diagnostics];

    if (diagnostics.length > 0) {
        return { diagnostics, warnings: [] };
    }

    const symbols = collectSymbols(parsed.lines);
    diagnostics.push(...symbols.diagnostics);

    if (diagnostics.length > 0) {
        return { diagnostics, warnings: [] };
    }

    const encoded = encodeProgram(parsed.lines, symbols.labels);
    diagnostics.push(...encoded.diagnostics);

    if (diagnostics.length > 0) {
        return {
            diagnostics,
            warnings: encoded.warnings,
        };
    }

    const program: ObjectProgram = {
        memory: encoded.memory,
        sourceMap: encoded.sourceMap,
        symbols: encoded.symbols,
        listing: encoded.listing,
        entry: encoded.entry,
        ...(encoded.endAddress === undefined
            ? {}
            : { endAddress: encoded.endAddress }),
    };

    return {
        program,
        diagnostics,
        warnings: encoded.warnings,
    };
}

export * from './config';
export * from './diagnostics';
export * from './encoder';
export * from './line-parser';
export * from './line-scanner';
export * from './symbols';
