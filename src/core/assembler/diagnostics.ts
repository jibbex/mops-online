/**
 * Diagnostics shared by the assembler and editor integration.
 *
 * @module core/assembler/diagnostics
 */

export type DiagnosticSeverity = 'error' | 'warning';

export interface Diagnostic {
    readonly line: number;
    readonly column: number;
    readonly length: number;
    readonly severity: DiagnosticSeverity;
    readonly code: string;
    readonly message: string;
}

export interface AssembleWarning extends Diagnostic {
    readonly severity: 'warning';
}

export interface AssembleResult {
    readonly program?: import('@/core/object').ObjectProgram;
    readonly diagnostics: readonly Diagnostic[];
    readonly warnings: readonly AssembleWarning[];
}

export function createDiagnostic(
    line: number,
    column: number,
    length: number,
    code: string,
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

export function createWarning(
    line: number,
    column: number,
    length: number,
    code: string,
    message: string,
): AssembleWarning {
    return {
        ...createDiagnostic(line, column, length, code, message, 'warning'),
        severity: 'warning',
    };
}
