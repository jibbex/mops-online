/**
 * Source file exchange for Moodle submissions.
 *
 * The assembly source is the submission artifact. It can be downloaded as a
 * plain `.ass` file, uploaded to Moodle, and imported again later.
 *
 * @module lib/exchange
 */

import { PRACTICE_TASK_ID, sanitizeTaskId, type TaskInfo } from '@/lib/task';

/** MIME type used for plain assembly source files. */
export const SOURCE_MIME_TYPE = 'text/plain';

/**
 * Builds the file name for an exported source file.
 *
 * A Moodle task identifier or title is used when available; otherwise the
 * generic name `mops.ass` is returned.
 *
 * @param task Task metadata.
 * @returns A safe file name.
 */
export function sourceFilename(task: TaskInfo): string {
    if (task.id !== PRACTICE_TASK_ID) {
        return `mops-${sanitizeTaskId(task.id)}.ass`;
    }

    if (task.title.length > 0) {
        return `mops-${sanitizeTaskId(task.title)}.ass`;
    }

    return 'mops.ass';
}

/**
 * Starts a browser download for generated text.
 *
 * @param filename Suggested file name.
 * @param text File contents.
 * @param mimeType MIME type of the generated file.
 */
export function downloadTextFile(
    filename: string,
    text: string,
    mimeType: string,
): void {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
