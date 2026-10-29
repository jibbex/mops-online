/**
 * Diagnostics shared by the assembler and editor integration.
 *
 * @module core/assembler/diagnostics
 */

/** Severity of an assembler message. */
export type DiagnosticSeverity = 'error' | 'warning';

/** Stable diagnostic codes shared by the assembler, editor, and translations. */
export type DiagnosticCode =
    | 'indentation'
    | 'empty-label'
    | 'label-without-instruction'
    | 'invalid-label'
    | 'unknown-mnemonic'
    | 'missing-operand'
    | 'end-with-operand'
    | 'duplicate-label'
    | 'invalid-address'
    | 'invalid-operand'
    | 'invalid-line-target'
    | 'invalid-jump-target'
    | 'undefined-jump-target'
    | 'conditional-without-compare'
    | 'missing-end'
    | 'program-overflow'
    | 'code-after-end'
    | 'unused-label'
    | 'invalid-operand-mode';

/**
 * One source-anchored assembler message.
 */
export interface Diagnostic {
    /** One-based source line. */
    readonly line: number;
    /** Zero-based character offset within the line. */
    readonly column: number;
    /** Number of characters covered by the message. */
    readonly length: number;
    readonly severity: DiagnosticSeverity;
    /** Stable diagnostic code for tests and editor integration. */
    readonly code: DiagnosticCode;
    readonly message: string;
}

/** Warning variant used by the assembler result. */
export interface AssembleWarning extends Diagnostic {
    readonly severity: 'warning';
}

/**
 * Result of one assembly attempt.
 *
 * A program is present only when no errors were produced.
 */
export interface AssembleResult {
    readonly program?: import('@/core/object').ObjectProgram;
    readonly diagnostics: readonly Diagnostic[];
    readonly warnings: readonly AssembleWarning[];
}

/**
 * Creates an error diagnostic.
 *
 * @param line One-based source line.
 * @param column Zero-based character offset.
 * @param length Covered character count.
 * @param code Stable diagnostic code.
 * @param message Human-readable message.
 * @param severity Message severity.
 * @returns The diagnostic value.
 */
export function createDiagnostic(
    line: number,
    column: number,
    length: number,
    code: DiagnosticCode,
    message: string,
    severity: DiagnosticSeverity = 'error',
): Diagnostic {
    return {
        line,
        column,
        length,
        severity,
        code,
        message,
    };
}

/**
 * Creates a warning diagnostic.
 *
 * @param line One-based source line.
 * @param column Zero-based character offset.
 * @param length Covered character count.
 * @param code Stable diagnostic code.
 * @param message Human-readable message.
 * @returns The warning value.
 */
export function createWarning(
    line: number,
    column: number,
    length: number,
    code: DiagnosticCode,
    message: string,
): AssembleWarning {
    return {
        ...createDiagnostic(line, column, length, code, message, 'warning'),
        severity: 'warning',
    };
}
