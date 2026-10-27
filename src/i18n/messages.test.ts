// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
    interpolate,
    messages,
    translateDiagnostic,
    translateTrap,
} from './messages';

describe('messages', () => {
    it('provides the same keys for English and German', () => {
        expect(Object.keys(messages.de).sort()).toEqual(
            Object.keys(messages.en).sort(),
        );
    });

    it('translates interface labels', () => {
        expect(messages.en['toolbar.assemble']).toBe('Assemble');
        expect(messages.de['toolbar.assemble']).toBe('Assemblieren');
    });

    it('interpolates named placeholders', () => {
        expect(
            interpolate('Line {line}: {message}', {
                line: 4,
                message: 'Unknown instruction.',
            }),
        ).toBe('Line 4: Unknown instruction.');
    });

    it('leaves unknown placeholders untouched', () => {
        expect(interpolate('Hello {name}')).toBe('Hello {name}');
    });

    it('translates diagnostics by stable code', () => {
        expect(translateDiagnostic('de', 'unknown-mnemonic', 'Unknown.')).toBe(
            'Unbekannter Befehl.',
        );
        expect(translateDiagnostic('en', 'unknown-mnemonic', 'Unknown.')).toBe(
            'Unknown.',
        );
        expect(translateDiagnostic('de', 'other', 'Fallback')).toBe('Fallback');
    });

    it('translates traps by stable code', () => {
        expect(translateTrap('de', 'DIVISION_BY_ZERO', 'Division.')).toBe(
            'Division durch null.',
        );
        expect(translateTrap('en', 'DIVISION_BY_ZERO', 'Division.')).toBe(
            'Division.',
        );
    });
});
