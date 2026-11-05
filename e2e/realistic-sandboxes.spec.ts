import { test, expect } from '@playwright/test';
import library from '../lib/library-seed.json';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/library', r => r.fulfill({ json: { library } }));
  await page.goto('/');
});

test('SoundCloud plays actual audio, seeks, saves likes, filters library, and follows artists', async ({ page }) => {
  await page.getByRole('button', { name: /SoundCloud .*Open/ }).click();
  const site = page.locator('[data-sandbox-root]');
  await expect(site.locator('.sc-app')).toBeVisible();
  await page.screenshot({ path: '/tmp/soundcloud-home.png' });
  await site.locator('.sc-mix [data-node-id="play-midnight"]').first().click();
  await expect.poll(() => site.locator('audio').evaluate((a: HTMLAudioElement) => a.currentTime)).toBeGreaterThan(0);
  await site.getByRole('slider', { name: 'Playback position' }).fill('15');
  await expect.poll(() => site.locator('audio').evaluate((a: HTMLAudioElement) => a.currentTime)).toBeGreaterThan(14);
  await site.locator('.sc-mix [data-node-id="like-midnight"]').click();
  await site.getByRole('button', { name: 'Follow Nova Vale', exact: true }).click();
  await expect(site.getByRole('button', { name: 'Following Nova Vale', exact: true })).toBeVisible();
  await site.getByRole('button', { name: 'Library', exact: true }).click();
  await expect(site.locator('.sc-mix-row')).toHaveCount(1);
  await expect(site.locator('.sc-mix-row')).toContainText('Midnight Signals');
  await site.locator('.sc-player-play').click();
  await expect.poll(() => site.locator('audio').evaluate((a: HTMLAudioElement) => a.paused)).toBe(true);
  await page.screenshot({ path: '/tmp/soundcloud-sandbox.png' });
});

test('museum supports map selection, routes, floors, search, zoom, and amenity toggles', async ({ page }) => {
  await page.getByRole('button', { name: /The Met Map .*Open/ }).click();
  const site = page.locator('[data-sandbox-root]');
  // Select an SVG room via keyboard, then exercise the shared reducer-backed controls.
  await site.locator('[data-node-id="room-temple"]').focus();
  await page.keyboard.press('Enter');
  await expect(site.locator('.met-detail')).toContainText('Gallery 131');
  await site.getByRole('button', { name: 'Get directions', exact: true }).click();
  await expect(site.locator('[data-node-id="route-guidance"]')).toContainText('82nd Street');
  await site.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(site.locator('svg.met-map-canvas')).not.toHaveAttribute('viewBox', '0 0 1400 880');
  await site.getByRole('button', { name: 'Restrooms', exact: true }).click();
  await expect(site.getByRole('button', { name: 'Restrooms', exact: true })).toHaveClass('active');
  await site.getByRole('textbox', { name: 'Search The Met' }).fill('Monet');
  await site.locator('.met-results button').click();
  await expect(site.getByLabel('Museum floor')).toHaveValue('2');
  await expect(site.locator('.met-detail')).toContainText('European Paintings');
  await page.screenshot({ path: '/tmp/met-map-sandbox.png' });
});

test('Amazon home promos, product sorting, cart quantities and wishlist are functional', async ({ page }) => {
  await page.getByRole('button', { name: /Amazon .*Open/ }).click();
  const site = page.locator('[data-sandbox-root]');
  await expect(site.locator('.az-home-promos')).toBeVisible();
  await page.screenshot({ path: '/tmp/amazon-home.png' });
  await site.getByLabel('Sort products').selectOption('low');
  await expect(site.locator('.az-product').first()).toContainText('Organic bananas');
  await site.getByRole('button', { name: 'Add fresh oranges to cart', exact: true }).click();
  await site.getByRole('button', { name: 'Save to wishlist: Fresh oranges', exact: true }).click();
  await site.getByRole('button', { name: 'Cart (1)', exact: true }).click();
  await site.getByRole('button', { name: 'Increase fresh oranges quantity', exact: true }).click();
  await expect(site.locator('.az-cart-summary')).toContainText('$9.98');
  await site.getByRole('button', { name: 'Decrease fresh oranges quantity', exact: true }).click();
  await expect(site.locator('.az-cart-summary')).toContainText('$4.99');
  await page.screenshot({ path: '/tmp/amazon-sandbox.png' });
});
