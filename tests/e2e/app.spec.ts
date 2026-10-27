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
    await page.getByLabel('Mode').selectOption('run');
    await page.getByLabel('Speed').selectOption('0');
    await page.getByRole('button', { name: 'Start' }).click();

    const input = page.getByLabel('Input register');
    await expect(input).toBeVisible();
    await input.fill('21');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByTestId('status-status')).toHaveText('Finished');
    await expect(page.getByTestId('status-aus')).toHaveText('00042');
});

test('shows an assembly error in the UI', async ({ page }) => {
    await page.goto('/');
    await setSource(page, 'xyz 5\nend');

    await page.getByRole('button', { name: 'Assemble' }).click();

    await expect(page.getByTestId('status-status')).toHaveText('Error');
    await expect(page.getByText(/Unknown instruction/)).toBeVisible();
});

test('pauses after each instruction in instruction mode', async ({ page }) => {
    await page.goto('/');
    await setSource(page, ['ld 5', 'add 3', 'st a', 'out a', 'end'].join('\n'));

    await page.getByRole('button', { name: 'Assemble' }).click();
    await page.getByLabel('Mode').selectOption('instruction');
    await page.getByLabel('Speed').selectOption('0');
    await page.getByRole('button', { name: 'Start' }).click();

    await expect(page.getByTestId('status-status')).toHaveText('Paused');
    await expect(page.getByTestId('status-ac')).toHaveText('00005');

    await page.getByRole('button', { name: 'Start' }).click();

    await expect(page.getByTestId('status-status')).toHaveText('Paused');
    await expect(page.getByTestId('status-ac')).toHaveText('00008');
});
