import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function setSource(page: Page, source: string): Promise<void> {
    const editor = page.locator('.cm-content');
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText(source);
}

test('assembles and runs a program with input', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Assemble' }).click();
    await page.getByRole('radio', { name: 'Run' }).click();
    await page.getByRole('radio', { name: 'Off' }).click();
    await page.getByRole('button', { name: 'Start' }).click();

    const input = page.getByLabel('Input value');
    await expect(input).toBeVisible();
    await input.fill('21');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByTestId('status-status')).toHaveText('Finished');
    await expect(page.getByTestId('status-aus')).toHaveText('00042');

    const overflows = await page.evaluate(
        () => document.documentElement.scrollHeight > window.innerHeight,
    );
    expect(overflows).toBe(false);
});

test('shows an assembly error in the UI', async ({ page }) => {
    await page.goto('/');
    await setSource(page, 'xyz 5\nend');

    await page.getByRole('button', { name: 'Assemble' }).click();

    await expect(page.getByTestId('status-status')).toHaveText('Error');
    await expect(page.getByText(/Unknown instruction/)).toBeVisible();
    await expect(page.locator('.cm-error-line')).toHaveCount(1);
});

test('shows the machine code listing in a sheet', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Assemble' }).click();
    await page.getByRole('button', { name: 'Listing' }).click();

    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await expect(
        sheet.getByRole('heading', { name: 'Machine code listing' }),
    ).toBeVisible();
    await expect(sheet.getByRole('cell', { name: 'in a' })).toBeVisible();
});

test('switches to dark mode', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Theme settings' }).click();
    await page.getByRole('menuitemradio', { name: 'Dark' }).click();

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('switches the interface to German', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Language settings' }).click();
    await page.getByRole('menuitemradio', { name: 'Deutsch' }).click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(
        page.getByRole('button', { name: 'Assemblieren' }),
    ).toBeVisible();
    await expect(page.getByText('SPEICHERWERK')).toBeVisible();
});

test('opens the command reference', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Reference' }).click();

    const dialog = page.getByRole('dialog');
    await expect(
        dialog.getByRole('heading', { name: 'Command reference' }),
    ).toBeVisible();
    await expect(
        dialog.getByRole('cell', { name: 'ld', exact: true }),
    ).toBeVisible();
    await expect(
        dialog.getByText('Load a value into the accumulator.'),
    ).toBeVisible();
});

test('downloads the assembly source for Moodle', async ({ page }) => {
    await page.goto('/?task=42&title=Summe');
    await expect(page.getByText('Summe')).toBeVisible();

    await page.getByRole('button', { name: 'File' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download source/ }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('mops-42.ass');

    const path = await download.path();
    expect(path).not.toBeNull();
    const source = await readFile(path ?? '', 'utf8');

    expect(source).toContain('in a');
});

test('imports an assembly source file', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'File' }).click();

    await page.locator('input[type="file"]').setInputFiles({
        name: 'mops.ass',
        mimeType: 'text/plain',
        buffer: Buffer.from('ld 7\nout 7\nend'),
    });

    await expect(
        page.getByText('Source loaded. Assemble it to run the program.'),
    ).toBeVisible();
    await expect(page.locator('.cm-content')).toContainText('out 7');
});

test('routes one data packet per step', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Assemble' }).click();
    await page.getByRole('button', { name: 'Step' }).click();

    const packet = page.locator('[data-transfer]');
    await expect(packet).toHaveCount(1);
    await expect(packet).toHaveAttribute('data-transfer', 'bz-memory');
    await expect(packet.locator('animateMotion')).toHaveCount(1);
    await expect(packet.locator('animate')).toHaveCount(1);
    await expect(packet.locator('.diagram-packet-core')).toHaveCount(1);

    await page.getByRole('button', { name: 'Step' }).click();
    await expect(packet).toHaveAttribute('data-transfer', 'memory-br');

    await page.waitForTimeout(1200);
    const opacity = await packet.evaluate(
        (element) => getComputedStyle(element).opacity,
    );
    expect(opacity).toBe('0');

    const busColor = await page
        .locator('#sl-trunk')
        .evaluate((element) => getComputedStyle(element).stroke);
    expect(busColor).toBe('oklch(0.78 0.14 85)');
});

test('pauses after each instruction in command mode', async ({ page }) => {
    await page.goto('/');
    await setSource(page, ['ld 5', 'add 3', 'st a', 'out a', 'end'].join('\n'));

    await page.getByRole('button', { name: 'Assemble' }).click();
    await page.getByRole('radio', { name: 'Commands' }).click();
    await page.getByRole('radio', { name: 'Off' }).click();
    await page.getByRole('button', { name: 'Start' }).click();

    await expect(page.getByTestId('status-status')).toHaveText('Paused');
    await expect(page.getByTestId('status-ac')).toHaveText('00005');
    await expect(page.locator('.cm-current-line')).toHaveCount(1);

    await page.getByRole('button', { name: 'Start' }).click();

    await expect(page.getByTestId('status-status')).toHaveText('Paused');
    await expect(page.getByTestId('status-ac')).toHaveText('00008');
});
