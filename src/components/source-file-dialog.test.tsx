import { LanguageProvider } from '@/i18n/i18n-provider';
import {
    MAX_SOURCE_FILE_BYTES,
    saveTextFile,
    type SourceSaveResult,
} from '@/lib/exchange';
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SourceFileDialog } from './source-file-dialog';

vi.mock('@/lib/exchange', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/exchange')>();

    return {
        ...actual,
        saveTextFile: vi.fn(),
    };
});

const TASK = { id: '42', title: 'Summe' };

function renderDialog(onImport = vi.fn()) {
    render(
        <LanguageProvider>
            <SourceFileDialog
                task={TASK}
                source={'ld 1\nend\n'}
                onImport={onImport}
            />
        </LanguageProvider>,
    );

    return { onImport };
}

async function openDialog() {
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'File' }));
    return user;
}

function sourceInput(): HTMLInputElement {
    return document.querySelector('input[type="file"]') as HTMLInputElement;
}

async function waitForClosedDialog(): Promise<void> {
    await waitFor(() => {
        expect(
            screen.queryByRole('heading', { name: 'Source file' }),
        ).not.toBeInTheDocument();
    });
}

describe('SourceFileDialog', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        vi.mocked(saveTextFile).mockResolvedValue({ kind: 'started' });
    });

    afterEach(() => {
        cleanup();
    });

    it('starts the fallback download with the task file name', async () => {
        renderDialog();
        const user = await openDialog();

        await user.click(
            screen.getByRole('button', { name: /Download source/ }),
        );

        expect(saveTextFile).toHaveBeenCalledWith(
            'mops-42.asm',
            'ld 1\nend\n',
            'text/plain',
        );
        expect(await screen.findByText('Download started')).toBeVisible();
        expect(
            screen.getByRole('heading', { name: 'Source file' }),
        ).toBeVisible();
    });

    it('closes the dialog after the picker saved the file', async () => {
        vi.mocked(saveTextFile).mockResolvedValueOnce({ kind: 'saved' });

        renderDialog();
        const user = await openDialog();

        await user.click(
            screen.getByRole('button', { name: /Download source/ }),
        );

        await waitForClosedDialog();
    });

    it('keeps the dialog open when the picker is cancelled', async () => {
        vi.mocked(saveTextFile).mockResolvedValueOnce({ kind: 'cancelled' });

        renderDialog();
        const user = await openDialog();

        await user.click(
            screen.getByRole('button', { name: /Download source/ }),
        );

        await waitFor(() => {
            expect(saveTextFile).toHaveBeenCalledTimes(1);
        });
        expect(
            screen.getByRole('heading', { name: 'Source file' }),
        ).toBeVisible();
        expect(screen.queryByText('Download started')).not.toBeInTheDocument();
        expect(screen.queryByText('Export failed')).not.toBeInTheDocument();
    });

    it('reports the download only after the handoff', async () => {
        let finish: (() => void) | undefined;

        vi.mocked(saveTextFile).mockReturnValueOnce(
            new Promise<SourceSaveResult>((resolve) => {
                finish = () => resolve({ kind: 'started' });
            }),
        );

        renderDialog();
        const user = await openDialog();

        await user.click(
            screen.getByRole('button', { name: /Download source/ }),
        );

        expect(screen.queryByText('Download started')).not.toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Source file' }),
        ).toBeVisible();

        act(() => {
            finish?.();
        });

        expect(await screen.findByText('Download started')).toBeVisible();
        expect(
            screen.getByRole('heading', { name: 'Source file' }),
        ).toBeVisible();
    });

    it('reports an export failure and keeps the dialog open', async () => {
        vi.mocked(saveTextFile).mockRejectedValueOnce(
            new Error('Download blocked.'),
        );

        renderDialog();
        const user = await openDialog();

        await user.click(
            screen.getByRole('button', { name: /Download source/ }),
        );

        expect(await screen.findByText('Export failed')).toBeVisible();
        expect(
            screen.getByText('The source file could not be downloaded.'),
        ).toBeVisible();
        expect(
            screen.getByRole('heading', { name: 'Source file' }),
        ).toBeVisible();
    });

    it('opens the file picker from the choose button', async () => {
        renderDialog();
        const user = await openDialog();
        const input = sourceInput();
        const click = vi.spyOn(input, 'click').mockImplementation(() => {
            // jsdom cannot open a native picker.
        });

        await user.click(
            screen.getByRole('button', { name: 'Choose source file' }),
        );

        expect(click).toHaveBeenCalledOnce();
    });

    it('imports a valid source file and closes the dialog', async () => {
        const { onImport } = renderDialog();
        const user = await openDialog();

        await user.upload(
            sourceInput(),
            new File(['ld 2\r\nend'], 'mops.asm', { type: 'text/plain' }),
        );

        await waitFor(() => {
            expect(onImport).toHaveBeenCalledWith('ld 2\nend');
        });
        await waitForClosedDialog();
    });

    it('reports an empty file without changing the source', async () => {
        const { onImport } = renderDialog();
        const user = await openDialog();

        await user.upload(
            sourceInput(),
            new File(['   \n\t'], 'empty.asm', { type: 'text/plain' }),
        );

        expect(await screen.findByText('The file is empty.')).toBeVisible();
        expect(onImport).not.toHaveBeenCalled();
    });

    it('rejects an oversized file before reading it', async () => {
        const { onImport } = renderDialog();
        const user = await openDialog();
        const file = new File(
            [new Uint8Array(MAX_SOURCE_FILE_BYTES + 1)],
            'large.asm',
        );
        const read = vi.spyOn(file, 'text');

        await user.upload(sourceInput(), file);

        expect(
            await screen.findByText(
                /The file is too large\. The maximum size is 16 KiB\./,
            ),
        ).toBeVisible();
        expect(read).not.toHaveBeenCalled();
        expect(onImport).not.toHaveBeenCalled();
    });

    it('reports unreadable content', async () => {
        const { onImport } = renderDialog();
        const user = await openDialog();
        const file = new File(['ld 1\nend'], 'broken.asm');

        vi.spyOn(file, 'text').mockRejectedValue(new Error('unreadable'));

        await user.upload(sourceInput(), file);

        expect(
            await screen.findByText('The file could not be read.'),
        ).toBeVisible();
        expect(onImport).not.toHaveBeenCalled();
    });

    it('ignores a change event without a file', async () => {
        const { onImport } = renderDialog();
        await openDialog();

        fireEvent.change(sourceInput(), { target: { files: [] } });

        expect(onImport).not.toHaveBeenCalled();
        expect(
            screen.queryByText('The file could not be read.'),
        ).not.toBeInTheDocument();
    });

    it('reports binary content', async () => {
        const { onImport } = renderDialog();
        const user = await openDialog();

        await user.upload(
            sourceInput(),
            new File(['ld 1\u0000end'], 'binary.asm'),
        );

        expect(
            await screen.findByText('The file is not a plain text file.'),
        ).toBeVisible();
        expect(onImport).not.toHaveBeenCalled();
    });

    it('resets an import error when the dialog closes', async () => {
        renderDialog();
        const user = await openDialog();

        await user.upload(
            sourceInput(),
            new File(['   \n\t'], 'empty.asm', { type: 'text/plain' }),
        );
        expect(await screen.findByText('The file is empty.')).toBeVisible();

        await user.click(screen.getByRole('button', { name: 'Close' }));
        await user.click(screen.getByRole('button', { name: 'File' }));

        expect(
            screen.queryByText('The file is empty.'),
        ).not.toBeInTheDocument();
    });
});
