/**
 * Source-level limits shared by the assembler and diagnostics.
 *
 * @module core/assembler/limits
 */

/**
 * Highest source line number accepted as a numeric jump target.
 *
 * The original MOPS editor uses two-digit line numbers, so targets stop at 99.
 */
export const MAX_LINE_TARGET = 99;
