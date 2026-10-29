// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { PRACTICE_TASK_ID } from './task';
import {
    MAX_SOURCE_FILE_BYTES,
    MAX_SOURCE_FILE_KIB,
    buildSourceExport,
    downloadTextFile,
    normalizeSourceText,
    readSourceFile,
    sourceFilename,
    type SourceFileLike,
} from './exchange';

function sourceFile(
    text: string,
    size = new TextEncoder().encode(text).length,
): SourceFileLike & { readonly read: ReturnType<typeof vi.fn> } {
    const read = vi.fn(() => Promise.resolve(text));

    return { size, text: read, read };
}

describe('source file names', () => {
    it('uses the task identifier in the file name', () => {
        expect(sourceFilename({ id: '42', title: 'Summe' })).toBe(
            'mops-42.asm',
        );
        expect(sourceFilename({ id: 'Task 7', title: '' })).toBe(
            'mops-task-7.asm',
        );
    });

    it('uses the task title when no identifier is supplied', () => {
        expect(sourceFilename({ id: PRACTICE_TASK_ID, title: 'Summe' })).toBe(
            'mops-summe.asm',
        );
    });

    it('falls back to a generic file name', () => {
        expect(sourceFilename({ id: PRACTICE_TASK_ID, title: '' })).toBe(
            'mops.asm',
        );
    });
});

describe('normalizeSourceText', () => {
    it('removes a BOM and normalizes line endings', () => {
        expect(normalizeSourceText('\uFEFFld 1\r\nadd 2\rend')).toBe(
            'ld 1\nadd 2\nend',
        );
    });

    it('is idempotent', () => {
        const normalized = normalizeSourceText('ld 1\r\nend');

        expect(normalizeSourceText(normalized)).toBe(normalized);
    });
});

describe('readSourceFile', () => {
    it('reads and normalizes a valid source file', async () => {
        const result = await readSourceFile(
            sourceFile('\uFEFFld 1\r\nout 1\r\nend'),
        );

        expect(result).toEqual({ ok: true, text: 'ld 1\nout 1\nend' });
    });

    it('accepts a file exactly at the size limit', async () => {
        const file = sourceFile('end', MAX_SOURCE_FILE_BYTES);
        const result = await readSourceFile(file);

        expect(result.ok).toBe(true);
        expect(file.read).toHaveBeenCalledTimes(1);
    });

    it('rejects an oversized file before reading it', async () => {
        const file = sourceFile('end', MAX_SOURCE_FILE_BYTES + 1);
        const result = await readSourceFile(file);

        expect(result).toEqual({ ok: false, reason: 'too-large' });
        expect(file.read).not.toHaveBeenCalled();
    });

    it('rejects empty and whitespace-only files', async () => {
        await expect(readSourceFile(sourceFile('   \n\t'))).resolves.toEqual({
            ok: false,
            reason: 'empty',
        });
    });

    it('rejects unreadable files', async () => {
        const file: SourceFileLike = {
            size: 10,
            text: vi.fn(() => Promise.reject(new Error('read failed'))),
        };

        await expect(readSourceFile(file)).resolves.toEqual({
            ok: false,
            reason: 'unreadable',
        });
    });

    it('rejects binary content', async () => {
        await expect(
            readSourceFile(sourceFile('ld 1\u0000end')),
        ).resolves.toEqual({
            ok: false,
            reason: 'binary',
        });
    });
});

describe('buildSourceExport', () => {
    it('trims trailing whitespace and adds one final newline', () => {
        const exported = buildSourceExport(
            { id: '42', title: 'Summe' },
            'ld 1\nend\n\n',
        );

        expect(exported).toEqual({
            filename: 'mops-42.asm',
            text: 'ld 1\nend\n',
            mimeType: 'text/plain',
        });
    });

    it('keeps the configured size limit in KiB', () => {
        expect(MAX_SOURCE_FILE_KIB).toBe(16);
    });
});

describe('downloadTextFile', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('downloads the text and revokes the object URL', async () => {
        vi.useFakeTimers();

        const createObjectURL = vi.fn((blob: Blob) => {
            expect(blob).toBeInstanceOf(Blob);
            return 'blob:mops';
        });
        const revokeObjectURL = vi.fn();
        const createElement = vi.spyOn(document, 'createElement');

        vi.stubGlobal('URL', {
            ...URL,
            createObjectURL,
            revokeObjectURL,
        });

        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
            () => undefined,
        );

        downloadTextFile('mops.asm', 'ld 1\nend\n', 'text/plain');

        expect(createObjectURL).toHaveBeenCalledTimes(1);

        const blob = createObjectURL.mock.calls[0]?.[0];

        expect(blob).toBeDefined();

        if (!blob) {
            return;
        }

        expect(blob.type).toBe('text/plain');
        await expect(blob.text()).resolves.toBe('ld 1\nend\n');

        const anchor = createElement.mock.results.at(-1)
            ?.value as HTMLAnchorElement;

        expect(anchor.download).toBe('mops.asm');
        expect(anchor.href).toBe('blob:mops');

        vi.runAllTimers();
        expect(revokeObjectURL).toHaveBeenCalledWith('blob:mops');
    });
});
