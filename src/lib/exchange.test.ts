// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { sourceFilename } from './exchange';

describe('source file exchange', () => {
    it('uses the task identifier in the file name', () => {
        expect(sourceFilename({ id: '42', title: 'Summe' })).toBe(
            'mops-42.asm',
        );
        expect(sourceFilename({ id: 'Task 7', title: '' })).toBe(
            'mops-task-7.asm',
        );
    });

    it('uses the task title when no identifier is supplied', () => {
        expect(sourceFilename({ id: 'practice', title: 'Summe' })).toBe(
            'mops-summe.asm',
        );
    });

    it('falls back to a generic file name', () => {
        expect(sourceFilename({ id: 'practice', title: '' })).toBe('mops.asm');
    });
});
