import { test, expect } from '@playwright/test';
import library from '../lib/library-seed.json';

test('custom website entry belongs to Find and appears before Guide', async ({ page }) => {
  await page.route('**/api/library', r => r.fulfill({ json: { library } }));
  await page.goto('/');
  const find = page.getByRole('region', { name: 'Find saved websites', exact: true });
  const custom = find.getByRole('region', { name: 'Custom website', exact: true });
  await expect(custom.getByRole('heading', { name: 'Bring your own website' })).toBeAttached();
  await expect(custom.getByRole('textbox', { name: 'Custom website URL' })).toHaveAttribute('placeholder', 'https://your-website.com');
  await expect(custom.getByRole('button', { name: 'Open website', exact: true })).toBeDisabled();
  await custom.getByRole('textbox', { name: 'Custom website URL' }).fill('https://example.org');
  await expect(custom.getByRole('button', { name: 'Open website', exact: true })).toBeEnabled();
  expect(await custom.evaluate(el => Boolean(el.compareDocumentPosition(document.querySelector('[aria-label="Guide interactive websites"]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await expect(custom).toContainText('Custom sites use a safe read-only snapshot for Find.');
});
