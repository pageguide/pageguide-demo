import { test, expect } from '@playwright/test';
import library from '../lib/library-seed.json';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/library', (route) => route.fulfill({ json: { library, source: 'bundled' } }));
});

test('playground explains both modes and uses consistent compact website cards', async ({ page }) => {
  await page.goto('/');
  const find = page.getByRole('region', { name: 'Find saved websites' });
  const guide = page.getByRole('region', { name: 'Guide interactive websites' });
  await expect(find.getByText('The agent finds information and returns answer with evidence on the page.')).toBeVisible();
  await expect(guide.getByText('The agent navigates the website and completes your goal.')).toBeVisible();
  await expect(guide.getByText('“Add oranges to my cart”')).toBeVisible();
  await expect(find.getByText(/The Berlin Wall fell in November 1989/)).toBeVisible();
  await expect(find.getByRole('tooltip')).toHaveCount(0);
  await find.getByRole('button', { name: /Preview evidence:/ }).hover();
  const screenshot = find.getByRole('img', { name: /Cold War article passage/ });
  await expect(screenshot).toBeVisible();
  await expect.poll(() => screenshot.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await find.getByRole('heading', { name: 'Find', exact: true }).hover();
  await expect(find.getByRole('tooltip')).toHaveCount(0);
  await expect(guide.getByRole('listitem')).toHaveText([
    'Locate oranges in the Amazon store.',
    'Click “Add to cart” for the oranges.',
    'Open the cart and confirm oranges were added.',
  ]);
  await expect(guide.getByText(/I’ve added fresh oranges to your cart/)).toBeVisible();
  await expect(guide.getByRole('tooltip')).toHaveCount(0);
  const citation = guide.getByRole('button', { name: /Preview evidence:/ });
  await citation.focus();
  const cartScreenshot = guide.getByRole('img', { name: 'Amazon cart showing fresh oranges, quantity 1, and a $4.99 subtotal.' });
  await expect(cartScreenshot).toBeVisible();
  await expect.poll(() => cartScreenshot.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await citation.press('Escape');
  await expect(guide.getByRole('tooltip')).toHaveCount(0);
  await citation.click();
  const overlay = page.getByRole('dialog', { name: 'Saved evidence screenshot' });
  await expect(overlay).toBeVisible();
  await expect(overlay.getByRole('img', { name: 'Amazon cart showing fresh oranges, quantity 1, and a $4.99 subtotal.' })).toBeVisible();
  await overlay.getByRole('button', { name: 'Close evidence screenshot' }).click();
  await expect(overlay).toHaveCount(0);
  await citation.click();
  await page.keyboard.press('Escape');
  await expect(overlay).toHaveCount(0);
  await find.getByRole('button', { name: /Preview evidence:/ }).click();
  await expect(overlay.getByRole('img', { name: /Cold War article passage/ })).toBeVisible();
  await page.mouse.click(4, 4);
  await expect(overlay).toHaveCount(0);
  await expect(guide.getByText('Agent runs the steps')).toBeVisible();
  await expect(guide.getByText('You approve each step')).toBeVisible();
  await expect(page.getByText(/Press Send to start\./)).toHaveCount(0);
  await expect(page.locator('.library-card')).toHaveCount(8);
  await expect(find.locator('.library-card').first()).toContainText('Roman Empire');
  await expect(find.locator('.library-card').filter({ hasText: 'Fetch API' })).toHaveCount(0);
  await expect(guide).not.toContainText('sandbox');
  const openLabels = page.locator('.library-card').getByText('Open →', { exact: true });
  const colors = await openLabels.evaluateAll((labels) => labels.map((label) => getComputedStyle(label).color));
  expect(new Set(colors).size).toBe(1);
});

test('Find and Guide examples and card rows align vertically on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const find = page.getByRole('region', { name: 'Find saved websites' });
  const guide = page.getByRole('region', { name: 'Guide interactive websites' });
  const findExample = await find.getByRole('heading', { name: 'Example · Wikipedia · Cold War' }).locator('..').boundingBox();
  const guideExample = await guide.getByRole('heading', { name: 'Example · Amazon' }).locator('..').boundingBox();
  const modes = await guide.locator('dl').boundingBox();
  expect(modes!.y + modes!.height).toBeLessThan(guideExample!.y);
  const shelf = page.locator('.pg-scroll').filter({ has: find });
  const dimensions = await shelf.evaluate((element) => ({ content: element.scrollHeight, viewport: element.clientHeight }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(findExample!.y).toBeCloseTo(guideExample!.y, 0);
  expect(findExample!.height).toBeCloseTo(guideExample!.height, 0);
  for (let i = 0; i < 4; i++) {
    const left = await find.locator('.library-card').nth(i).boundingBox();
    const right = await guide.locator('.library-card').nth(i).boundingBox();
    expect(left!.y).toBeCloseTo(right!.y, 0);
    expect(left!.height).toBeCloseTo(right!.height, 0);
  }
});

for (const mode of ['Find', 'Guide'] as const) {
  test(`${mode} example opens the website and prepares an editable request without submitting`, async ({ page }) => {
    let submitted = false;
    await page.route('**/api/agent', (route) => { submitted = true; return route.abort(); });
    await page.route('**/api/ask', (route) => { submitted = true; return route.abort(); });
    await page.goto('/');
    await page.getByRole('button', { name: `Try this ${mode} example →`, exact: true }).click();
    const composer = page.getByPlaceholder('Ask PageGuide…  (type / to pick a mode)');
    await expect(composer).toHaveValue(mode === 'Guide' ? 'Add oranges to my cart' : 'When did the Berlin Wall fall?');
    await expect(composer).toBeFocused();
    if (mode === 'Guide') {
      await expect(page.locator('[data-sandbox-root]')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Auto', exact: true })).toHaveAttribute('aria-pressed', 'true');
    } else {
      await expect(page.getByRole('button', { name: 'Find', exact: true })).toHaveAttribute('aria-pressed', 'true');
      const article = page.frameLocator('iframe');
      await expect(article.locator('h1').first()).toContainText('Cold War');
      await expect(article.locator('#mwC9M')).toContainText('fall of the Berlin Wall in November 1989');
      const dimensions = await article.locator('body').evaluate((body) => ({ height: body.scrollHeight, viewport: body.ownerDocument.defaultView!.innerHeight }));
      expect(dimensions.height).toBeGreaterThan(dimensions.viewport * 10);
    }
    expect(submitted).toBe(false);
  });
}
