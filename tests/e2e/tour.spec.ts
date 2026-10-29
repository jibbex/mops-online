import { expect, test, type Page } from '@playwright/test';

const STEP_TITLES = [
    'The machine',
    'Active unit',
    'Read',
    'Write',
    'Increment',
    'Data packet',
];

const VIEWPORTS = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
];

async function openFirstStep(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Assemble' }).click();
    await page.getByRole('button', { name: 'Step' }).click();
    await expect(
        page.getByRole('dialog', { name: 'The machine' }),
    ).toBeVisible();
}

async function openFromHeader(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Guided tour' }).click();
    await expect(
        page.getByRole('dialog', { name: 'The machine' }),
    ).toBeVisible();
}

test('opens the tour on the first step and pauses the machine', async ({
    page,
}) => {
    await page.goto('/');
    await openFirstStep(page);

    await expect(page.getByTestId('status-status')).toHaveText('Paused');
});

test('walks through all steps, closes on Done, and stays closed after reload', async ({
    page,
}) => {
    await page.goto('/');
    await openFirstStep(page);

    for (const title of STEP_TITLES.slice(0, -1)) {
        await expect(page.getByRole('heading', { name: title })).toBeVisible();
        await page.getByRole('button', { name: 'Next' }).click();
    }

    await expect(
        page.getByRole('heading', { name: 'Data packet' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Done' }).click();

    await expect(page.getByTestId('tour')).toBeHidden();

    await page.reload();
    await page.getByRole('button', { name: 'Assemble' }).click();
    await page.getByRole('button', { name: 'Step' }).click();

    await expect(page.getByTestId('tour')).toBeHidden();
});

test('skips the tour and persists the choice', async ({ page }) => {
    await page.goto('/');
    await openFirstStep(page);

    await page.getByRole('button', { name: 'Skip tour' }).click();
    await expect(page.getByTestId('tour')).toBeHidden();

    await page.reload();
    await page.getByRole('button', { name: 'Assemble' }).click();
    await page.getByRole('button', { name: 'Step' }).click();

    await expect(page.getByTestId('tour')).toBeHidden();
});

test('reopens the tour from the header at step one', async ({ page }) => {
    await page.goto('/');
    await openFromHeader(page);

    await expect(page.getByText('Step 1 of 6', { exact: true })).toBeVisible();
});

test('shows the German tour title', async ({ page }) => {
    await page.goto('/?lang=de');
    await page.getByRole('button', { name: 'Geführte Tour' }).click();

    await expect(
        page.getByRole('heading', { name: 'Der Rechner' }),
    ).toBeVisible();
});

test('dims the page but leaves the read target visible', async ({ page }) => {
    await page.goto('/');
    await openFirstStep(page);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();

    const scrims = page.getByTestId('tour-scrim');
    const count = await scrims.count();

    expect(count).toBe(4);

    for (let index = 0; index < count; index += 1) {
        const filter = await scrims
            .nth(index)
            .evaluate((element) => getComputedStyle(element).backdropFilter);

        expect(filter).toContain('blur');
    }

    const pc = page.locator('#pc');
    const box = await pc.boundingBox();

    expect(box).not.toBeNull();

    if (!box) {
        throw new Error('Program counter has no box.');
    }

    const hit = await page.evaluate(
        ({ x, y }) => {
            const element = document.elementFromPoint(x, y);

            return element?.getAttribute('data-testid') === 'tour-scrim';
        },
        { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    );

    expect(hit).toBe(false);
});

test('uses the real read, write, and increment markers', async ({ page }) => {
    await page.goto('/');
    await openFirstStep(page);

    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('#pc')).toHaveAttribute('data-operation', 'read');

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('#br')).toHaveAttribute(
        'data-operation',
        'write',
    );

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.locator('#pc')).toHaveAttribute(
        'data-operation',
        'increment',
    );
});

test('keeps every step card inside the viewport', async ({ page }) => {
    for (const viewport of VIEWPORTS) {
        await page.setViewportSize(viewport);
        await page.goto('/');
        await openFromHeader(page);

        for (const [index, title] of STEP_TITLES.entries()) {
            await expect(
                page.getByRole('heading', { name: title }),
            ).toBeVisible();

            const card = page.getByTestId('tour-card');
            const box = await card.boundingBox();

            expect(box).not.toBeNull();

            if (!box) {
                throw new Error('Tour card has no box.');
            }

            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.y).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
            expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);

            const scrollWidth = await page.evaluate(
                () => document.documentElement.scrollWidth,
            );

            expect(scrollWidth).toBeLessThanOrEqual(viewport.width);

            if (index < STEP_TITLES.length - 1) {
                await page.getByRole('button', { name: 'Next' }).click();
            }
        }

        await page.getByRole('button', { name: 'Done' }).click();
    }
});
