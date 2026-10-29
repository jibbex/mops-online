/**
 * Moodle task metadata read from the page URL.
 *
 * Moodle links can pass a stable task identifier and an optional display
 * title, for example `?task=42&title=Summe`. The identifier is written into
 * exported solution files so submissions remain attributable.
 *
 * @module lib/task
 */

/** Task context shown in the application and stored in solution files. */
export interface TaskInfo {
    /** Stable task identifier, safe for file names. */
    readonly id: string;
    /** Optional human-readable task title. */
    readonly title: string;
}

/** Identifier used when the application runs without a Moodle task. */
export const PRACTICE_TASK_ID = 'practice';

/**
 * Maximum display length for a task title passed through the URL.
 *
 * Moodle titles are unbounded; truncation keeps the header layout stable on
 * phones without rejecting the task link.
 */
export const MAX_TASK_TITLE_LENGTH = 120;

/**
 * Normalizes a task identifier for use in URLs and file names.
 *
 * @param value Raw task identifier.
 * @returns A lowercase identifier, or {@link PRACTICE_TASK_ID} when empty.
 */
export function sanitizeTaskId(value: string): string {
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '');

    return normalized || PRACTICE_TASK_ID;
}

/**
 * Reads task metadata from a URL search string.
 *
 * Supported parameters are `task` (or `taskId`) and `title` (or `taskTitle`).
 *
 * @param search URL search string, including the leading `?`.
 * @returns Normalized task metadata.
 */
export function readTaskInfo(search: string): TaskInfo {
    const params = new URLSearchParams(search);
    const id =
        params.get('task') ??
        params.get('taskId') ??
        params.get('taskid') ??
        '';
    const title =
        params.get('title') ??
        params.get('taskTitle') ??
        params.get('tasktitle') ??
        '';

    return {
        id: sanitizeTaskId(id),
        title: title.trim().slice(0, MAX_TASK_TITLE_LENGTH),
    };
}

/**
 * Returns whether the application is running in a task context.
 *
 * @param task Task metadata.
 * @returns True when a Moodle task was supplied.
 */
export function isTaskContext(task: TaskInfo): boolean {
    return task.id !== PRACTICE_TASK_ID || task.title.length > 0;
}
