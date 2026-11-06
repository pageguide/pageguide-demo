import { test, expect } from '@playwright/test';
import library from '../lib/library-seed.json';

test('Admin mode restores website search and Go, and hides them when locked', async ({ page }) => {
  await page.route('**/api/library', r => r.fulfill({ json: { library } }));
  await page.route('**/api/search', r => r.fulfill({ json: { results: [] } }));
  await page.route('**/api/fetch', r => r.fulfill({ json: {
    url: 'https://trails.example/guide', title: 'Weekend Trails Guide',
    siteName: 'trails.example', favicon: '',
    blocks: [{ id: 'n0', type: 'heading', text: 'Weekend Trails Guide', level: 1 }],
  } }));
  await page.goto('/');
  const address = page.getByRole('textbox', { name: 'Search or enter website URL' });
  const composer = page.getByRole('textbox', { name: 'Message PageGuide' });
  await expect(address).toHaveCount(0);
  await composer.fill('/admin admin2026pageguide');
  await composer.press('Enter');
  await expect(address).toBeVisible();
  await address.fill('https://trails.example/guide');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(address).toHaveValue('https://trails.example/guide');
  await expect(page.getByRole('button', { name: 'Refresh page', exact: true })).toBeVisible();
  await address.fill('weekend trails');
  const searchRequest = page.waitForRequest(request => request.url().includes('/api/search'));
  await address.press('Enter');
  await searchRequest;
  await composer.fill('/admin off');
  await composer.press('Enter');
  await expect(address).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Go', exact: true })).toHaveCount(0);
});
