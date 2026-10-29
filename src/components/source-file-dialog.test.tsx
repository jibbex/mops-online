import { LanguageProvider } from '@/i18n/i18n-provider';
import { downloadTextFile, MAX_SOURCE_FILE_BYTES } from '@/lib/exchange';
import {
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
        downloadTextFile: vi.fn(),
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

describe('SourceFileDialog', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('downloads the normalized source with the task file name', async () => {
        renderDialog();
        const user = await openDialog();

        await user.click(
            screen.getByRole('button', { name: /Download source/ }),
        );

        expect(downloadTextFile).toHaveBeenCalledWith(
            'mops-42.asm',
            'ld 1\nend\n',
            'text/plain',
        );
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

    it('imports a valid source file and reports success', async () => {
        const { onImport } = renderDialog();
        const user = await openDialog();

        await user.upload(
            sourceInput(),
            new File(['ld 2\r\nend'], 'mops.asm', { type: 'text/plain' }),
        );

        await waitFor(() => {
            expect(onImport).toHaveBeenCalledWith('ld 2\nend');
        });
        expect(
            screen.getByText('Source loaded. Assemble it to run the program.'),
        ).toBeInTheDocument();
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
                /The file is too large\. The maximum size is 16 KB\./,
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

    it('resets the import status when the dialog closes', async () => {
        renderDialog();
        const user = await openDialog();

        await user.upload(
            sourceInput(),
            new File(['ld 2\nend'], 'mops.asm', { type: 'text/plain' }),
        );
        expect(
            await screen.findByText(
                'Source loaded. Assemble it to run the program.',
            ),
        ).toBeVisible();

        await user.click(screen.getByRole('button', { name: 'Close' }));
        await user.click(screen.getByRole('button', { name: 'File' }));

        expect(
            screen.queryByText(
                'Source loaded. Assemble it to run the program.',
            ),
        ).not.toBeInTheDocument();
    });
});
