import { test, expect } from '@playwright/test';
import library from '../lib/library-seed.json';

for (const site of ['Amazon', 'Quora', 'SoundCloud', 'The Met Map']) {
  test(`${site} keeps Guide shortcuts and Manual mode but has no Manual task presets`, async ({ page }) => {
    await page.route('**/api/library', r => r.fulfill({ json: { library } }));
    await page.goto('/');
    if (site === 'SoundCloud' || site === 'The Met Map') {
      await page.getByRole('region', { name: 'Guide interactive websites' }).getByRole('button', { name: 'More examples', exact: true }).click();
    }
    await page.getByRole('button', { name: new RegExp(`^${site}`) }).click();
    const bar = page.getByRole('toolbar', { name: 'Sandbox tasks', exact: true });
    await expect(bar).toBeVisible();
    expect(await bar.getByRole('button', { name: /^Guide:/ }).count()).toBeGreaterThanOrEqual(3);
    await expect(bar.getByRole('button', { name: /^Manual:/ })).toHaveCount(0);
    await expect(page.locator('[data-manual-task]')).toHaveCount(0);
    await expect(bar.getByRole('button', { name: 'Reset sandbox', exact: true })).toBeVisible();
    const manual = page.getByRole('button', { name: 'Manual', exact: true });
    await expect(manual).toHaveAttribute('aria-pressed', 'true');
    const modes = page.getByRole('button').filter({ hasText: /^(Find|Manual|Auto)$/ });
    await expect(modes).toHaveText(['Find', 'Manual', 'Auto']);
    await page.getByRole('button', { name: 'Find', exact: true }).click();
    await bar.getByRole('button', { name: /^Guide:/ }).first().click();
    await expect(manual).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('textbox', { name: 'Message PageGuide' })).toHaveValue(/.+/);
    await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeEnabled();
    await expect(page.locator('[data-guide-pointer]')).toHaveCount(0);
    const auto = page.getByRole('button', { name: 'Auto', exact: true });
    await auto.click();
    await bar.getByRole('button', { name: /^Guide:/ }).first().click();
    await expect(auto).toHaveAttribute('aria-pressed', 'true');
  });
}
