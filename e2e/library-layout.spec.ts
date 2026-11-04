import { test, expect } from '@playwright/test';
import library from '../lib/library-seed.json';

test('custom website entry appears after the Find and Guide demos', async ({ page }) => {
  await page.route('**/api/library', r => r.fulfill({ json: { library } }));
  await page.goto('/');
  const find = page.getByRole('region', { name: 'Find saved websites', exact: true });
  const custom = page.getByRole('region', { name: 'Custom website', exact: true });
  await expect(custom.getByRole('heading', { name: 'Try another website' })).toBeAttached();
  await expect(custom.getByRole('textbox', { name: 'Custom website URL' })).toHaveAttribute('placeholder', 'https://your-website.com');
  expect(await custom.evaluate(el => Boolean(document.querySelector('[aria-label="Guide interactive websites"]')!.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await expect(custom).toContainText('Read-only FIND demo');
});
