import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

// Keep the E2E boundary check independent from the UI text while still
// deriving it from the documented 16 KiB limit.
const MAX_SOURCE_FILE_BYTES = 16 * 1024;

async function disableFilePicker(page: Page): Promise<void> {
    await page.addInitScript(() => {
        Object.defineProperty(window, 'showSaveFilePicker', {
            configurable: true,
            value: undefined,
        });
    });
}

async function openFileDialog(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'File', exact: true }).click();
    await expect(
        page.getByRole('heading', { name: 'Source file' }),
    ).toBeVisible();
}

test('rejects an empty source file with a specific message', async ({
    page,
}) => {
    await page.goto('/');
    await openFileDialog(page);

    await page.locator('input[type="file"]').setInputFiles({
        name: 'empty.asm',
        mimeType: 'text/plain',
        buffer: Buffer.from('   \n\t'),
    });

    await expect(page.getByText('The file is empty.')).toBeVisible();
});

test('rejects an oversized source file', async ({ page }) => {
    await page.goto('/');
    await openFileDialog(page);

    await page.locator('input[type="file"]').setInputFiles({
        name: 'large.asm',
        mimeType: 'text/plain',
        buffer: Buffer.alloc(MAX_SOURCE_FILE_BYTES + 1, 'a'),
    });

    await expect(
        page.getByText('The file is too large. The maximum size is 16 KiB.'),
    ).toBeVisible();
});

test('rejects binary source files', async ({ page }) => {
    await page.goto('/');
    await openFileDialog(page);

    await page.locator('input[type="file"]').setInputFiles({
        name: 'binary.asm',
        mimeType: 'application/octet-stream',
        buffer: Buffer.from('ld 1\u0000end'),
    });

    await expect(
        page.getByText('The file is not a plain text file.'),
    ).toBeVisible();
});

test('normalizes CRLF source and closes the dialog', async ({ page }) => {
    await page.goto('/');
    await openFileDialog(page);

    await page.locator('input[type="file"]').setInputFiles({
        name: 'windows.asm',
        mimeType: 'text/plain',
        buffer: Buffer.from('ld 7\r\nout 7\r\nend'),
    });

    await expect(
        page.getByRole('heading', { name: 'Source file' }),
    ).toBeHidden();
    await expect(page.locator('.cm-content')).toContainText('out 7');
    expect(
        await page
            .locator('.cm-content')
            .evaluate((element) => element.textContent?.includes('\r')),
    ).toBe(false);
});

test('fits the file dialog on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await openFileDialog(page);

    const overflow = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
    }));

    expect(overflow.document).toBe(overflow.viewport);
});

test('keeps the dialog open after starting the download', async ({ page }) => {
    await disableFilePicker(page);
    await page.goto('/?task=42&title=Summe');
    await openFileDialog(page);

    const downloadPromise = page.waitForEvent('download');

    await page.getByRole('button', { name: /Download source/ }).click();
    await downloadPromise;

    await expect(page.getByText('Download started')).toBeVisible();
    await expect(
        page.getByRole('heading', { name: 'Source file' }),
    ).toBeVisible();
});

test('closes the dialog after the picker saved the file', async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(window, 'showSaveFilePicker', {
            configurable: true,
            value: () =>
                Promise.resolve({
                    createWritable: () =>
                        Promise.resolve({
                            write: () => Promise.resolve(),
                            close: () => Promise.resolve(),
                        }),
                }),
        });
    });

    await page.goto('/');
    await openFileDialog(page);

    await page.getByRole('button', { name: /Download source/ }).click();

    await expect(
        page.getByRole('heading', { name: 'Source file' }),
    ).toBeHidden();
});

test('keeps the dialog open when the picker is cancelled', async ({ page }) => {
    await page.addInitScript(() => {
        Object.defineProperty(window, 'showSaveFilePicker', {
            configurable: true,
            value: () =>
                Promise.reject(new DOMException('Cancelled', 'AbortError')),
        });
    });

    await page.goto('/');
    await openFileDialog(page);

    await page.getByRole('button', { name: /Download source/ }).click();

    await expect(
        page.getByRole('heading', { name: 'Source file' }),
    ).toBeVisible();
    await expect(page.getByText('Download started')).toBeHidden();
    await expect(page.getByText('Export failed')).toBeHidden();
});

test('keeps the dialog open when the export fails', async ({ page }) => {
    await disableFilePicker(page);
    await page.addInitScript(() => {
        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            value: () => {
                throw new Error('Download blocked.');
            },
        });
    });

    await page.goto('/');
    await openFileDialog(page);

    await page.getByRole('button', { name: /Download source/ }).click();

    await expect(page.getByText('Export failed')).toBeVisible();
    await expect(
        page.getByText('The source file could not be downloaded.'),
    ).toBeVisible();
    await expect(
        page.getByRole('heading', { name: 'Source file' }),
    ).toBeVisible();
});

test('downloads source with the task file name and final newline', async ({
    page,
}) => {
    await disableFilePicker(page);
    await page.goto('/?task=42&title=Summe');
    await openFileDialog(page);

    const downloadPromise = page.waitForEvent('download');

    await page.getByRole('button', { name: /Download source/ }).click();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('mops-42.asm');

    const path = await download.path();
    const source = await readFile(path ?? '', 'utf8');

    expect(source.endsWith('\n')).toBe(true);
    expect(source).toContain('in a');
});
