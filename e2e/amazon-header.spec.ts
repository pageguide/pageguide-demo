import { test, expect } from '@playwright/test';
import library from '../lib/library-seed.json';
import { normalizedScreenshotBox } from '../lib/capture-page';

test('annotation coordinates account for scrolling and clip to the capture, not a resized layout', () => {
  const origin = { left: 20, top: 100, width: 2000, height: 500 };
  expect(normalizedScreenshotBox(origin, { left: 1020, top: 50, width: 200, height: 40 }, 2000, 3000, 0, 300)).toEqual([.5, 250 / 3000, .1, 40 / 3000]);
  expect(normalizedScreenshotBox(origin, { left: 10, top: 90, width: 30, height: 30 }, 2000, 3000)).toEqual([0, 0, .01, 20 / 3000]);
  expect(normalizedScreenshotBox(origin, { left: 2020, top: 100, width: 50, height: 40 }, 2000, 3000)).toBeUndefined();
});

test('Amazon uses scalable logo/cart artwork and keeps cart counts aligned on narrow and wide screens', async ({ page }) => {
  await page.route('**/api/library', r => r.fulfill({ json: { library } }));
  await page.goto('/');
  await page.getByRole('button', { name: /Amazon sandbox/ }).click();
  const site = page.locator('[data-sandbox-root]');
  const logo = site.getByRole('button', { name: 'Amazon home', exact: true });
  await expect(logo.locator('img')).toHaveJSProperty('complete', true);
  await expect(logo.locator('img')).toHaveJSProperty('naturalWidth', 603);
  await expect(logo.locator('span')).toHaveCount(0);
  await expect(site.locator('.az-cart-icon svg')).toHaveCount(1);
  await site.getByRole('button', { name: 'Add fresh oranges to cart', exact: true }).click();
  for (const total of [1, 4, 12, 120]) {
    if (total === 4 || total === 12) await site.locator('[data-node-id="add-oranges"]').evaluate((button, n) => { for (let i = 0; i < n; i++) (button as HTMLButtonElement).click(); }, total === 4 ? 3 : 8);
    if (total === 120) {
      await site.locator('[data-node-id="add-oranges"]').evaluate(button => { for (let i = 0; i < 87; i++) (button as HTMLButtonElement).click(); });
      await site.locator('[data-node-id="add-apples"]').evaluate(button => { for (let i = 0; i < 21; i++) (button as HTMLButtonElement).click(); });
    }
    await expect(site.locator('.az-cart-count')).toHaveText(String(total));
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 960 });
      await site.evaluate(root => { root.scrollTop = 0; });
      const bounds = await logo.locator('img').boundingBox();
      expect(bounds!.width / bounds!.height).toBeCloseTo(603 / 182, 1);
      const icon = await site.locator('.az-cart-icon').boundingBox();
      const count = await site.locator('.az-cart-count').boundingBox();
      const basket = await site.locator('[data-cart-basket]').boundingBox();
      expect(count!.x).toBeGreaterThan(icon!.x);
      expect(count!.x + count!.width).toBeLessThanOrEqual(icon!.x + icon!.width);
      expect(count!.y + count!.height + 2).toBeLessThan(basket!.y);
      if (total === 4 && width === 1440) await page.screenshot({ path: '/tmp/amazon-cart-four-fixed.png' });
    }
  }
  await site.evaluate(root => { root.scrollTop = 0; });
  await page.screenshot({ path: '/tmp/amazon-header-fixed.png' });
});

test('saved annotations align with a scrolled Amazon page and stay inside the evidence image', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 2800, height: 1000 });
  await page.route('**/api/library', r => r.fulfill({ json: { library } }));
  let turn = 0;
  await page.route('**/api/agent', r => r.fulfill({ json: turn++ === 0
    ? { instruction: 'Save coffee to the wishlist', action: { type: 'click', id: 'wish-coffee' } }
    : { instruction: 'Confirm the saved coffee', action: { type: 'finish' }, evidence: { name: 'coffee-saved', description: 'Coffee saved in the wishlist', targetId: 'wishlist', annotate: 'Coffee saved! This annotation should stay within the screenshot.' } } }));
  await page.route('**/api/summarize', r => { const body = r.request().postDataJSON(); return r.fulfill({ json: { answer: `Coffee saved. [EV:${body.evidence[0].name}]` } }); });
  await page.goto('/');
  await page.getByRole('button', { name: /Amazon sandbox/ }).click();
  const site = page.locator('[data-sandbox-root]');
  await site.evaluate(root => { root.scrollTop = 250; });
  await page.getByRole('button', { name: 'Guide: Save coffee to my wishlist', exact: true }).click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByTestId('guide-status')).toHaveText('Completed', { timeout: 60000 });
  await expect(site.locator('[data-node-id="wishlist"]')).toHaveCount(1);
  const expected = await site.evaluate(root => {
    const a = root.getBoundingClientRect(), b = root.querySelector('[data-node-id="wishlist"]')!.getBoundingClientRect();
    return { x: (b.left - a.left + root.scrollLeft) / root.clientWidth, y: (b.top - a.top + root.scrollTop) / Math.min(root.scrollHeight, 6000), scroll: root.scrollTop };
  });
  expect(expected.scroll).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Screenshot evidence 1', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Saved screenshot' });
  const position = await dialog.getByTestId('evidence-box').evaluate(el => ({ x: parseFloat(el.style.left) / 100, y: parseFloat(el.style.top) / 100 }));
  expect(position.x).toBeCloseTo(expected.x, 2);
  expect(position.y).toBeCloseTo(expected.y, 2);
  await expect(dialog.locator('img')).toHaveJSProperty('naturalWidth', 1600);
  for (const width of [2800, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const image = await dialog.locator('img').boundingBox();
    const label = await dialog.getByTestId('evidence-annotation').boundingBox();
    expect(label!.x).toBeGreaterThanOrEqual(image!.x - 1);
    expect(label!.x + label!.width).toBeLessThanOrEqual(image!.x + image!.width + 1);
    expect(label!.y).toBeGreaterThanOrEqual(image!.y - 1);
    expect(label!.y + label!.height).toBeLessThanOrEqual(image!.y + image!.height + 1);
  }
  await page.screenshot({ path: '/tmp/amazon-annotation-fixed.png' });
});
