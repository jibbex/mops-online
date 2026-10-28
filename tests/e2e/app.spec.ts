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

    await expect(
        page.getByRole('heading', { name: 'Program output' }),
    ).toBeVisible();
    await expect(page.getByTestId('output-value')).toHaveText('00042');
    await page.getByRole('button', { name: 'Continue' }).click();

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

test('shows the machine on mobile and switches to the editor', async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const machineTitle = page
        .locator('[data-slot="card-title"]')
        .filter({ hasText: 'Machine' });
    const editorTitle = page
        .locator('[data-slot="card-title"]')
        .filter({ hasText: 'Assembly source' });

    await expect(page.locator('.diagram-svg')).toBeVisible();
    await expect(machineTitle).toBeVisible();
    await expect(editorTitle).toBeHidden();

    await page.getByRole('button', { name: 'Run settings' }).click();
    await expect(
        page.getByRole('menuitemradio', { name: 'Commands' }),
    ).toBeVisible();
    await page.getByRole('menuitemradio', { name: 'Commands' }).click();

    await page.getByRole('button', { name: 'Step' }).click();
    await page.getByRole('radio', { name: 'Editor' }).click();

    await expect(editorTitle).toBeVisible();
    await expect(machineTitle).toBeHidden();
    await expect(page.locator('.cm-current-line')).toBeVisible();

    const overflows = await page.evaluate(
        () => document.documentElement.scrollHeight > window.innerHeight,
    );
    expect(overflows).toBe(false);
});

test('scales interface text fluidly with hierarchy', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto('/');

    const readSizes = async (): Promise<{
        badge: number;
        control: number;
        title: number;
    }> =>
        page.evaluate(() => ({
            badge: Number.parseFloat(
                getComputedStyle(
                    document.querySelector('[data-testid="status-status"]')!,
                ).fontSize,
            ),
            control: Number.parseFloat(
                getComputedStyle(document.querySelector('header + div button')!)
                    .fontSize,
            ),
            title: Number.parseFloat(
                getComputedStyle(
                    document.querySelector('[data-slot="card-title"]')!,
                ).fontSize,
            ),
        }));

    const settle = async (): Promise<void> => {
        let previous = '';

        await expect
            .poll(
                async () => {
                    const sizes = await readSizes();
                    const current = `${sizes.badge}/${sizes.control}/${sizes.title}`;
                    const stable = current === previous;
                    previous = current;

                    return stable;
                },
                { intervals: [120, 120, 200] },
            )
            .toBe(true);
    };

    const large = await readSizes();

    await page.setViewportSize({ width: 1920, height: 1080 });
    await settle();
    const medium = await readSizes();

    await page.setViewportSize({ width: 390, height: 844 });
    await settle();
    const small = await readSizes();

    expect(large.badge).toBeGreaterThan(medium.badge);
    expect(medium.badge).toBeGreaterThan(small.badge);
    expect(large.title).toBeGreaterThan(large.control);
    expect(small.title).toBeGreaterThan(small.control);
    expect(small.control).toBeLessThanOrEqual(14);
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
        dialog.getByRole('cell', {
            name: 'Load a value into the accumulator.',
        }),
    ).toBeVisible();
});

test('fits the command reference on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Reference' }).click();

    const dialog = page.getByRole('dialog');
    const list = dialog.locator('ul');

    await expect(list.getByText('ld', { exact: true })).toBeVisible();
    await expect(
        list.getByText('Load a value into the accumulator.'),
    ).toBeVisible();
    await expect(dialog.locator('table')).toBeHidden();

    const overflow = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        viewport: window.innerWidth,
    }));

    expect(overflow.document).toBe(overflow.viewport);
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

test('routes only real external bus transfers', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Assemble' }).click();

    const packet = page.locator('[data-transfer]');

    await page.getByRole('button', { name: 'Step' }).click();
    await expect(packet).toHaveCount(0);

    await page.getByRole('button', { name: 'Step' }).click();
    await expect(packet).toHaveCount(1);
    await expect(packet).toHaveAttribute('data-transfer', 'memory-control');
    await expect(packet.locator('animateMotion')).toHaveCount(1);
    await expect(packet.locator('.diagram-packet')).toHaveCount(1);
    await expect(packet.locator('circle')).toHaveCount(2);
    await expect(packet.locator('circle.diagram-packet-core')).toHaveCount(1);
    await expect(packet).toBeVisible();

    await page.waitForTimeout(1200);
    await expect(packet).toBeVisible();

    await page.getByRole('button', { name: 'Step' }).click();
    await expect(packet).toHaveCount(0);

    const busColor = await page
        .locator('#sl-trunk')
        .evaluate((element) => getComputedStyle(element).stroke);
    expect(busColor).toBe('oklch(0.78 0.14 85)');
});

test('moves every packet at the same bus speed', async ({ page }) => {
    await page.goto('/');
    await setSource(page, ['ld 5', 'mul 2', 'st a', 'out a', 'end'].join('\n'));
    await page.getByRole('button', { name: 'Assemble' }).click();

    const readPacket = async (): Promise<{
        length: number;
        duration: number;
        speed: number;
    } | null> =>
        page.evaluate(() => {
            const layer = document.querySelector('[data-transfer]');
            const motion = layer?.querySelector('animateMotion');
            const svg = document.querySelector('.diagram-svg');

            if (!layer || !motion || !svg) {
                return null;
            }

            const pathData = motion.getAttribute('path') ?? '';
            const duration = Number.parseFloat(
                motion.getAttribute('dur') ?? '0',
            );
            const path = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'path',
            );
            path.setAttribute('d', pathData);
            svg.append(path);
            const length = path.getTotalLength();
            path.remove();

            return { length, duration, speed: length / duration };
        });

    const stepUntilPacket = async (): Promise<void> => {
        for (let step = 0; step < 12; step += 1) {
            await page.getByRole('button', { name: 'Step' }).click();
            await page.waitForTimeout(50);

            if ((await page.locator('[data-transfer]').count()) > 0) {
                return;
            }
        }
    };

    await stepUntilPacket();
    const first = await readPacket();

    await stepUntilPacket();
    const second = await readPacket();

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();

    if (!first || !second) {
        return;
    }

    expect(first.length).not.toBe(second.length);
    expect(first.speed).toBeCloseTo(0.5, 1);
    expect(second.speed).toBeCloseTo(0.5, 1);
    expect(Math.abs(first.speed - second.speed)).toBeLessThan(0.02);
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
