/**
 * Source file exchange for Moodle submissions.
 *
 * The assembly source is the submission artifact. It can be downloaded as a
 * plain `.asm` file, uploaded to Moodle, and imported again later.
 *
 * @module lib/exchange
 */

import { PRACTICE_TASK_ID, sanitizeTaskId, type TaskInfo } from '@/lib/task';

/** MIME type used for plain assembly source files. */
export const SOURCE_MIME_TYPE = 'text/plain';

/**
 * Maximum accepted source file size in KiB.
 *
 * The machine has 72 cells and at most 32 two-cell instructions. 16 KiB leaves
 * roughly 512 bytes per source line for labels and comments, so the limit
 * rejects accidental binary or oversized files without restricting real tasks.
 */
export const MAX_SOURCE_FILE_KIB = 16;

/** Maximum accepted source file size in bytes. */
export const MAX_SOURCE_FILE_BYTES = MAX_SOURCE_FILE_KIB * 1024;

/** Why a source file was rejected. */
export type SourceImportFailureReason =
    'empty' | 'too-large' | 'unreadable' | 'binary';

/** Result of importing a source file. */
export type SourceImportResult =
    | { readonly ok: true; readonly text: string }
    | { readonly ok: false; readonly reason: SourceImportFailureReason };

/** Minimal file shape needed by the importer; `File` satisfies it. */
export interface SourceFileLike {
    readonly size: number;
    text(): Promise<string>;
}

/** Values needed to trigger a source download. */
export interface SourceExport {
    readonly filename: string;
    readonly text: string;
    readonly mimeType: string;
}

/**
 * Normalizes source text before it reaches the editor.
 *
 * The scanner already accepts all line endings, but normalizing at the file
 * boundary keeps the imported source stable in the editor and in snapshots.
 *
 * @param text Raw file text.
 */
export function normalizeSourceText(text: string): string {
    return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

/**
 * Reads and validates a source file.
 *
 * The size check happens before `text()` so an oversized file is never loaded
 * into memory. A NUL byte is treated as binary; assembly diagnostics remain the
 * responsibility of the assembler after a successful import.
 *
 * @param file File-like object.
 * @param maxBytes Maximum accepted size in bytes.
 */
export async function readSourceFile(
    file: SourceFileLike,
    maxBytes = MAX_SOURCE_FILE_BYTES,
): Promise<SourceImportResult> {
    if (file.size > maxBytes) {
        return { ok: false, reason: 'too-large' };
    }

    let raw: string;

    try {
        raw = await file.text();
    } catch {
        return { ok: false, reason: 'unreadable' };
    }

    const text = normalizeSourceText(raw);

    if (text.trim().length === 0) {
        return { ok: false, reason: 'empty' };
    }

    if (text.includes('\u0000')) {
        return { ok: false, reason: 'binary' };
    }

    return { ok: true, text };
}

/**
 * Builds the file name and contents for a source download.
 *
 * @param task Task metadata.
 * @param source Current assembly source.
 */
export function buildSourceExport(
    task: TaskInfo,
    source: string,
): SourceExport {
    return {
        filename: sourceFilename(task),
        text: `${source.trimEnd()}\n`,
        mimeType: SOURCE_MIME_TYPE,
    };
}

/**
 * Builds the file name for an exported source file.
 *
 * A Moodle task identifier or title is used when available; otherwise the
 * generic name `mops.asm` is returned.
 *
 * @param task Task metadata.
 * @returns A safe file name.
 */
export function sourceFilename(task: TaskInfo): string {
    if (task.id !== PRACTICE_TASK_ID) {
        return `mops-${sanitizeTaskId(task.id)}.asm`;
    }

    if (task.title.length > 0) {
        return `mops-${sanitizeTaskId(task.title)}.asm`;
    }

    return 'mops.asm';
}

/**
 * Starts a browser download for generated text.
 *
 * The temporary anchor and object URL stay alive until the next task. Removing
 * them in the same click handler can cancel the download before the browser
 * has handed the blob to its download manager.
 *
 * @param filename Suggested file name.
 * @param text File contents.
 * @param mimeType MIME type of the generated file.
 * @returns Resolves after the download has been handed off.
 */
export function downloadTextFile(
    filename: string,
    text: string,
    mimeType: string,
): Promise<void> {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.append(anchor);
    anchor.click();

    return new Promise((resolve) => {
        window.setTimeout(() => {
            anchor.remove();
            URL.revokeObjectURL(url);
            resolve();
        }, 0);
    });
}
