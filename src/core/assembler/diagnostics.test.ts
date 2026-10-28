// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { createDiagnostic, createWarning } from './diagnostics';

describe('createDiagnostic', () => {
    it('creates an error diagnostic by default', () => {
        expect(
            createDiagnostic(3, 1, 4, 'missing-operand', 'Operand is missing.'),
        ).toEqual({
            line: 3,
            column: 1,
            length: 4,
            severity: 'error',
            code: 'missing-operand',
            message: 'Operand is missing.',
        });
    });

    it('accepts an explicit severity', () => {
        const diagnostic = createDiagnostic(
            1,
            0,
            1,
            'unused-label',
            'Label is unused.',
            'warning',
        );

        expect(diagnostic.severity).toBe('warning');
    });
});

describe('createWarning', () => {
    it('always creates a warning diagnostic', () => {
        expect(
            createWarning(2, 0, 5, 'code-after-end', 'Code is ignored.'),
        ).toEqual({
            line: 2,
            column: 0,
            length: 5,
            severity: 'warning',
            code: 'code-after-end',
            message: 'Code is ignored.',
        });
    });
});
