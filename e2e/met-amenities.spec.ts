import { test, expect } from '@playwright/test';
import library from '../lib/library-seed.json';

test('Floor 2 matches the reference departments and each service has its own selectable locations', async ({ page }) => {
  test.setTimeout(90000);
  await page.route('**/api/library', r => r.fulfill({ json: { library } }));
  await page.goto('/');
  await page.getByRole('button', { name: /The Met Map sandbox/ }).click();
  const site = page.locator('[data-sandbox-root]');
  await site.getByLabel('Museum floor').selectOption('2');
  await expect(site.getByRole('button', { name: 'Open Musical Instruments', exact: true })).toBeVisible();
  await expect(site.getByRole('button', { name: 'Open European Paintings, 1250–1800', exact: true })).toBeVisible();
  await page.screenshot({ path: '/tmp/met-floor-2.png' });
  const sets: string[] = [];
  for (const [category, count] of [['Dining', 8], ['Coffee Shops', 5], ['Restrooms', 6], ['Information Desk', 2], ['Lactation Room', 1], ['Retail', 3], ['Water Fountains', 4]] as const) {
    await site.getByRole('button', { name: category, exact: true }).click();
    await expect(site.locator('.met-place-pin')).toHaveCount(count);
    await expect(site.locator('.met-results > h2')).toHaveText(`${count} results`);
    await expect(site.getByRole('textbox', { name: 'Search The Met' })).toHaveValue(category);
    sets.push(await site.locator('.met-place-pin').evaluateAll(pins => pins.map(pin => pin.getAttribute('transform')).join('|')));
    await site.locator('.met-place-result').first().click();
    await expect(site.locator('.met-place-pin.selected')).toHaveCount(1);
    await expect(site.locator('.met-place-description')).toBeVisible();
    await site.getByRole('button', { name: 'Get directions', exact: true }).click();
    await expect(site.locator('[data-node-id="route-guidance"]')).toContainText('82nd Street');
    if (category === 'Dining') await page.screenshot({ path: '/tmp/met-dining.png' });
  }
  expect(new Set(sets).size).toBe(7);
  await site.getByRole('button', { name: 'Dining', exact: true }).click();
  await site.getByRole('button', { name: 'Show The Balcony Lounge', exact: true }).click();
  await expect(site.getByLabel('Museum floor')).toHaveValue('2');
  await expect(site.locator('.met-place-pin.selected')).toHaveAttribute('data-place', 'balcony-lounge');
  await site.getByRole('button', { name: 'Show American Wing Cafe', exact: true }).click();
  await expect(site.getByLabel('Museum floor')).toHaveValue('1');
  await site.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(site.locator('.met-place-pin')).toHaveCount(0);
});
