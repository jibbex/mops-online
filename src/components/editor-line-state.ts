/**
 * Editor line state derived from assembler diagnostics and player position.
 *
 * @module components/editor-line-state
 */

import type { Diagnostic } from '@/core/assembler';

/** Line numbers and classes the editor should decorate. */
export interface EditorLineState {
    /** Current execution line, when known. */
    readonly currentLine?: number;
    /** Lines containing assembler errors. */
    readonly errorLines: ReadonlySet<number>;
    /** Lines containing assembler warnings. */
    readonly warningLines: ReadonlySet<number>;
}

/**
 * Builds a deduplicated editor line state.
 *
 * @param currentLine Current execution line, or undefined.
 * @param diagnostics Error diagnostics.
 * @param warnings Warning diagnostics.
 * @returns The line state used by CodeMirror decorations.
 */
export function createEditorLineState(
    currentLine: number | undefined,
    diagnostics: readonly Diagnostic[],
    warnings: readonly Diagnostic[],
): EditorLineState {
    const errorLines = new Set<number>();
    const warningLines = new Set<number>();

    for (const diagnostic of diagnostics) {
        if (diagnostic.severity === 'error') {
            errorLines.add(diagnostic.line);
        }
    }

    for (const warning of warnings) {
        warningLines.add(warning.line);
    }

    return {
        ...(currentLine === undefined || currentLine === 0
            ? {}
            : { currentLine }),
        errorLines,
        warningLines,
    };
}
