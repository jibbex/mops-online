// @vitest-environment node

import { describe, expect, it } from 'vitest';
import type { Diagnostic } from '@/core/assembler';
import { createEditorLineState } from './editorLineState';

function diagnostic(
    line: number,
    severity: Diagnostic['severity'],
): Diagnostic {
    return {
        line,
        column: 0,
        length: 1,
        severity,
        code: 'test',
        message: 'test',
    };
}

describe('createEditorLineState', () => {
    it('collects error and warning lines', () => {
        const state = createEditorLineState(
            3,
            [
                diagnostic(1, 'error'),
                diagnostic(1, 'error'),
                diagnostic(2, 'error'),
            ],
            [diagnostic(4, 'warning')],
        );

        expect([...state.errorLines]).toEqual([1, 2]);
        expect([...state.warningLines]).toEqual([4]);
        expect(state.currentLine).toBe(3);
    });

    it('omits an unknown current line', () => {
        const state = createEditorLineState(undefined, [], []);

        expect(state.currentLine).toBeUndefined();
    });

    it('omits the no-source marker', () => {
        const state = createEditorLineState(0, [], []);

        expect(state.currentLine).toBeUndefined();
    });
});
