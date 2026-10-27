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
    await expect(page.locator('html')).toHaveAttribute('data-accent', 'blue');
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

    await page.getByRole('button', { name: 'Start' }).click();

    await expect(page.getByTestId('status-status')).toHaveText('Paused');
    await expect(page.getByTestId('status-ac')).toHaveText('00008');
});
