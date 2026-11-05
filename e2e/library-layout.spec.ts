import { test, expect } from '@playwright/test';
import library from '../lib/library-seed.json';

test('library has no redundant search field', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route('**/api/library', r => r.fulfill({ json: { library } }));
  await page.goto('/');
  const find = page.getByRole('region', { name: 'Find saved websites', exact: true });
  await expect(find.getByRole('heading', { name: 'Find', exact: true })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Guide', exact: true })).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Custom website', exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Search or enter website URL' })).toHaveValue('PageGuide library');
  await expect(page.getByRole('button', { name: 'Go', exact: true })).toBeEnabled();
  await expect(find.locator('.library-card--compact').first()).toHaveCSS('height', '198px');
  expect(await page.locator('.pg-scroll').first().evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);
});
