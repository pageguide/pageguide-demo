import { test, expect, type Page } from '@playwright/test';
import library from '../lib/library-seed.json';

async function setup(page: Page, ids: string[]) {
  await page.route('**/api/library', r => r.fulfill({ json: { library } }));
  let turn = 0;
  await page.route('**/api/agent', r => {
    const id = ids[turn++];
    return r.fulfill({ json: { instruction: id ? `Please use ${id}` : 'Finish the task', action: id ? { type: 'click', id } : { type: 'finish' } } });
  });
  await page.route('**/api/summarize', r => r.fulfill({ json: { answer: r.request().postDataJSON().outcome } }));
  await page.goto('/');
}

async function expectArrow(page: Page, id: string) {
  await expect(page.locator(`[data-guide-pointer][data-target-id="${id}"]`)).toBeVisible({ timeout: 30000 });
  await expect(page.locator(`[data-sandbox-root] [data-node-id="${id}"]`).first()).toHaveClass(/pg-guide/);
  const target = await page.locator(`[data-sandbox-root] [data-node-id="${id}"]`).first().boundingBox();
  const tip = await page.getByTestId('manual-guide-arrow').evaluate(el => ({ x: Number(el.getAttribute('data-tip-x')), y: Number(el.getAttribute('data-tip-y')) }));
  expect(tip.x).toBeGreaterThanOrEqual(target!.x - 1);
  expect(tip.x).toBeLessThanOrEqual(target!.x + target!.width + 1);
  expect(Math.min(Math.abs(tip.y - target!.y), Math.abs(tip.y - target!.y - target!.height))).toBeLessThan(12);
  const shaftEndY = await page.getByTestId('manual-guide-arrow').evaluate(el => { const path = el as unknown as SVGPathElement; return path.getPointAtLength(path.getTotalLength()).y; });
  expect(Math.abs(shaftEndY - tip.y)).toBeCloseTo(15, 1);
  await expect(page.locator('[data-guide-pointer] marker')).toHaveAttribute('refX', '8');
}

test('manual arrow follows each button, supports direct clicks and callout clicks, and performs each action only once', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page, ['add-oranges', 'cart', 'increase-oranges']);
  await page.getByRole('button', { name: /Amazon .*Open/ }).click();
  await page.getByRole('button', { name: 'Manual', exact: true }).click();
  await page.getByRole('textbox', { name: 'Message PageGuide' }).fill('Add 2 oranges to my cart');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expectArrow(page, 'add-oranges');
  await expect(page.locator('.az-cart-count')).toHaveText('0');
  await expect(page.locator('[data-node-id="add-apples"]')).toBeDisabled();
  await page.screenshot({ path: '/tmp/manual-guide-arrow.png' });
  await page.locator('[data-sandbox-root] [data-node-id="add-oranges"]').click();
  await expectArrow(page, 'cart');
  await expect(page.locator('.az-cart-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Perform highlighted step', exact: true }).click();
  await expectArrow(page, 'increase-oranges');
  await page.locator('[data-sandbox-root] [data-node-id="increase-oranges"]').click();
  await expect(page.getByTestId('guide-status')).toHaveText('Completed', { timeout: 30000 });
  await expect(page.locator('.az-cart-count')).toHaveText('2');
  await expect(page.locator('[data-guide-pointer]')).toHaveCount(0);
});

test('manual callout remains within the browser pane after resize and stops cleanly', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page, ['settings']);
  await page.getByRole('button', { name: /Quora .*Open/ }).click();
  await page.getByRole('button', { name: 'Manual', exact: true }).click();
  await page.getByRole('button', { name: 'Guide: Change my language to Spanish', exact: true }).click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expectArrow(page, 'settings');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await expectArrow(page, 'settings');
    const pane = await page.locator('[data-pageguide-page]').boundingBox();
    const callout = await page.getByRole('button', { name: 'Perform highlighted step' }).boundingBox();
    expect(callout!.x).toBeGreaterThanOrEqual(pane!.x);
    expect(callout!.x + callout!.width).toBeLessThanOrEqual(pane!.x + pane!.width);
    expect(callout!.y).toBeGreaterThanOrEqual(pane!.y);
    expect(callout!.y + callout!.height).toBeLessThanOrEqual(pane!.y + pane!.height);
  }
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.locator('[data-guide-pointer]')).toHaveCount(0);
  await expect(page.getByTestId('guide-status')).toHaveText('Incomplete');
});

test('museum manual arrows target the visible floor selector and clickable SVG gallery', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page, ['floor-2', 'room-modern']);
  await page.getByRole('button', { name: /The Met Map .*Open/ }).click();
  await page.getByRole('button', { name: 'Manual', exact: true }).click();
  await page.getByRole('button', { name: 'Guide: Switch to Floor 2 and open Modern and Contemporary Art', exact: true }).click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expectArrow(page, 'floor-2');
  await expect(page.getByLabel('Museum floor')).toBeEnabled();
  await page.getByRole('button', { name: 'Perform highlighted step' }).focus();
  await page.keyboard.press('Enter');
  await expectArrow(page, 'room-modern');
  await expect(page.getByLabel('Museum floor')).toHaveValue('2');
  await page.locator('[data-node-id="room-modern"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('guide-status')).toHaveText('Completed', { timeout: 30000 });
  await expect(page.locator('.met-detail')).toContainText('Modern and Contemporary Art');
  await expect(page.locator('[data-guide-pointer]')).toHaveCount(0);
});

test('manual arrows translate iframe coordinates and clicking the link approves one navigation', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page, ['open-details']);
  let fetches = 0;
  await page.route('**/api/fetch', r => {
    fetches++;
    const url = r.request().postDataJSON().url;
    return r.fulfill({ json: { url, title: 'Example snapshot', html: url.endsWith('/details') ? '<html><body><h1>Details opened</h1></body></html>' : '<html><body style="padding:30px"><a data-pg-id="open-details" href="https://example.org/details">Open details</a></body></html>', blocks: url.endsWith('/details') ? [{ id: 'details', type: 'heading', text: 'Details opened' }] : [{ id: 'open-details', type: 'link', text: 'Open details', href: 'https://example.org/details', control: true }] } });
  });
  await page.route('**/api/verify', r => r.fulfill({ json: { completed: true, reason: 'Details snapshot is open.', answer: 'Details opened.' } }));
  await page.getByRole('textbox', { name: 'Search or enter website URL' }).fill('https://example.org/start');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.frameLocator('iframe').getByRole('link', { name: 'Open details' })).toBeVisible();
  await page.getByRole('button', { name: 'Manual', exact: true }).click();
  await page.getByRole('textbox', { name: 'Message PageGuide' }).fill('Open the details link');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.locator('[data-guide-pointer][data-target-id="open-details"]')).toBeVisible({ timeout: 30000 });
  const frame = await page.locator('iframe').boundingBox();
  const tipX = Number(await page.getByTestId('manual-guide-arrow').getAttribute('data-tip-x'));
  expect(tipX).toBeGreaterThan(frame!.x);
  expect(tipX).toBeLessThan(frame!.x + frame!.width);
  await page.frameLocator('iframe').getByRole('link', { name: 'Open details' }).click();
  await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Details opened' })).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('guide-status')).toHaveText('Completed', { timeout: 30000 });
  expect(fetches).toBe(2);
  await expect(page.locator('[data-guide-pointer]')).toHaveCount(0);
});

test('manual on-page clicks explicitly approve consequential steps without bypassing confirmation', async ({ page }) => {
  test.setTimeout(90000);
  await setup(page, ['post-question']);
  await page.getByRole('button', { name: /Quora .*Open/ }).click();
  await page.locator('[data-sandbox-root] [data-node-id="ask-question"]').click();
  await page.getByRole('textbox', { name: 'Question title', exact: true }).fill('How should I water my gardening plants?');
  await page.getByRole('textbox', { name: 'Question details', exact: true }).fill('I would like practical advice for gardening in containers.');
  await page.getByRole('textbox', { name: 'Question topic', exact: true }).fill('Gardening');
  await page.getByRole('button', { name: 'Manual', exact: true }).click();
  await page.getByRole('button', { name: 'Guide: Publish a demo question about gardening', exact: true }).click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expectArrow(page, 'post-question');
  await expect(page.getByRole('alertdialog', { name: 'Confirm action', exact: true })).toBeVisible();
  await expect(page.locator('[data-sandbox-root] [data-node-id="page-title"]')).toHaveText('Ask the community');
  await page.locator('[data-sandbox-root] [data-node-id="post-question"]').click();
  await expect(page.getByTestId('guide-status')).toHaveText('Completed', { timeout: 30000 });
  await expect(page.locator('[data-node-id^="title-user-question-"]')).toHaveCount(1);
  await expect(page.locator('[data-guide-pointer]')).toHaveCount(0);
});

test('auto mode never shows a manual arrow', async ({ page }) => {
  await setup(page, ['add-oranges']);
  await page.getByRole('button', { name: /Amazon .*Open/ }).click();
  await page.getByRole('button', { name: 'Auto', exact: true }).click();
  await page.getByRole('button', { name: 'Guide: Add oranges to my cart', exact: true }).click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByTestId('guide-status')).toHaveText('Completed', { timeout: 30000 });
  await expect(page.locator('[data-guide-pointer]')).toHaveCount(0);
});
