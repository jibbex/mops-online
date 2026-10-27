/**
 * Line scanner for MOPS assembly source.
 *
 * The scanner removes comments and normalizes line endings and tabs. It keeps
 * the original raw line for listings and diagnostics.
 *
 * @module core/assembler/lineScanner
 */

/**
 * One non-empty source line after comment and whitespace normalization.
 */
export interface ScannedLine {
    /** One-based source line number. */
    readonly number: number;
    /** Original line text without the line terminator. */
    readonly raw: string;
    /** Lowercased, comment-free, tab-normalized code. */
    readonly code: string;
    /** Whether the code starts with whitespace. */
    readonly indented: boolean;
}

/**
 * Splits source into non-empty, comment-free lines.
 *
 * @param source The assembly source text.
 */
export function scanSource(source: string): ScannedLine[] {
    const normalized = source.replace(/\r\n?/g, '\n');
    const lines: ScannedLine[] = [];

    for (const [index, raw] of normalized.split('\n').entries()) {
        const withoutComment = stripComment(raw);
        const normalizedCode = withoutComment.replace(/\t/g, ' ').trimEnd();

        if (normalizedCode.trim() === '') {
            continue;
        }

        lines.push({
            number: index + 1,
            raw,
            code: normalizedCode.toLowerCase(),
            indented: /^[ \t]/.test(normalizedCode),
        });
    }

    return lines;
}

function stripComment(line: string): string {
    const commentStart = line.indexOf(';');

    return commentStart === -1 ? line : line.slice(0, commentStart);
}
