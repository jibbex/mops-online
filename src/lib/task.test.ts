// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
    isTaskContext,
    PRACTICE_TASK_ID,
    readTaskInfo,
    sanitizeTaskId,
} from './task';

describe('task metadata', () => {
    it('normalizes task identifiers for file names', () => {
        expect(sanitizeTaskId('  Aufgabe 4 / Summe ')).toBe('aufgabe-4-summe');
        expect(sanitizeTaskId('')).toBe(PRACTICE_TASK_ID);
        expect(sanitizeTaskId('---')).toBe(PRACTICE_TASK_ID);
    });

    it('reads task and title parameters', () => {
        expect(readTaskInfo('?task=42&title=Summe')).toEqual({
            id: '42',
            title: 'Summe',
        });
    });

    it('accepts alternate parameter names', () => {
        expect(readTaskInfo('?taskId=Ab-3&taskTitle=Test')).toEqual({
            id: 'ab-3',
            title: 'Test',
        });
    });

    it('falls back to free practice', () => {
        expect(readTaskInfo('')).toEqual({
            id: PRACTICE_TASK_ID,
            title: '',
        });
    });

    it('detects a Moodle task context', () => {
        expect(isTaskContext({ id: PRACTICE_TASK_ID, title: '' })).toBe(false);
        expect(isTaskContext({ id: '42', title: '' })).toBe(true);
        expect(isTaskContext({ id: PRACTICE_TASK_ID, title: 'Summe' })).toBe(
            true,
        );
    });
});
