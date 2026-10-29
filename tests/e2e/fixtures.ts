import { test as base, expect } from '@playwright/test';

/**
 * Playwright fixture that suppresses the first-run tour for existing flows.
 *
 * Tests that cover the tour import the raw Playwright `test` instead.
 */
export const test = base.extend({
    page: async ({ page }, provide) => {
        await page.addInitScript(() => {
            localStorage.setItem('mops-tour-seen', '1');
        });

        await provide(page);
    },
});

export { expect };
