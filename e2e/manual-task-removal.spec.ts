import { test, expect } from '@playwright/test';
import library from '../lib/library-seed.json';

for (const site of ['Amazon', 'Quora', 'SoundCloud', 'The Met Map']) {
  test(`${site} keeps Guide shortcuts and Manual mode but has no Manual task presets`, async ({ page }) => {
    await page.route('**/api/library', r => r.fulfill({ json: { library } }));
    await page.goto('/');
    await page.getByRole('button', { name: new RegExp(`${site} sandbox`) }).click();
    const bar = page.getByRole('toolbar', { name: 'Sandbox tasks', exact: true });
    await expect(bar).toBeVisible();
    expect(await bar.getByRole('button', { name: /^Guide:/ }).count()).toBeGreaterThanOrEqual(3);
    await expect(bar.getByRole('button', { name: /^Manual:/ })).toHaveCount(0);
    await expect(page.locator('[data-manual-task]')).toHaveCount(0);
    await expect(bar.getByRole('button', { name: 'Reset sandbox', exact: true })).toBeVisible();
    const manual = page.getByRole('button', { name: 'Manual', exact: true });
    await manual.click();
    await expect(manual).toHaveAttribute('aria-pressed', 'true');
    await bar.getByRole('button', { name: /^Guide:/ }).first().click();
    await expect(page.getByRole('textbox', { name: 'Message PageGuide' })).toHaveValue(/.+/);
    await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeEnabled();
    await expect(page.locator('[data-guide-pointer]')).toHaveCount(0);
  });
}
