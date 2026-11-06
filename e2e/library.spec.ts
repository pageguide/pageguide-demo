import { test, expect } from '@playwright/test';
import library from '../lib/library-seed.json';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/library', (r) => r.fulfill({ json: { library, source: 'bundled' } }));
  await page.route('**/api/summarize', (r) => {
    const data = r.request().postDataJSON();
    return r.fulfill({ json: { answer: `${data.outcome} ${(data.evidence || []).map((e: any) => `[EV:${e.name}]`).join(' ')}` } });
  });
});

test('Amazon manual controls change cart quantities and sandbox sessions stay isolated', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Amazon .*Open/ }).click();
  const site = page.locator('[data-sandbox-root]');
  await site.getByRole('button', { name: 'Add fresh oranges to cart', exact: true }).click();
  await site.getByRole('button', { name: 'Cart (1)', exact: true }).click();
  await expect(site.getByText('Subtotal: $4.99', { exact: true })).toBeVisible();
  await site.getByRole('button', { name: 'Increase fresh oranges quantity', exact: true }).click();
  await expect(site.getByText('Subtotal: $9.98', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open library', exact: true }).click();
  await page.getByRole('button', { name: /Quora .*Open/ }).click();
  await expect(site.locator('[data-node-id="current-state"]')).toContainText('Saved language: English');
  await page.getByRole('button', { name: 'Open library', exact: true }).click();
  await page.getByRole('button', { name: /Amazon .*Open/ }).click();
  await site.getByRole('button', { name: 'Cart (2)', exact: true }).click();
  await site.getByRole('button', { name: 'Remove fresh oranges', exact: true }).click();
  await expect(site.getByText('Your cart is empty.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset sandbox', exact: true }).click();
  await expect(site.locator('[data-node-id="current-state"]')).toContainText('Cart contents: empty');
});

test('Back returns a first visited page to the library', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Amazon .*Open/ }).click();
  const back = page.getByRole('button', { name: 'Back', exact: true });
  await expect(back).toBeEnabled();
  await back.click();
  await expect(page.getByRole('region', { name: 'Find saved websites', exact: true })).toBeVisible();
});

test('opening a new site from the library starts fresh history', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Amazon .*Open/ }).click();
  const back = page.getByRole('button', { name: 'Back', exact: true });
  await expect(back).toBeEnabled();
  await back.click();
  await page.getByRole('button', { name: /Quora .*Open/ }).click();
  await expect(back).toBeEnabled();
  await back.click();
  await expect(page.getByRole('region', { name: 'Find saved websites', exact: true })).toBeVisible();
});

test('Quora manual settings, search, browsing, upvote, and back navigation work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Quora .*Open/ }).click();
  const site = page.locator('[data-sandbox-root]');
  await site.getByRole('button', { name: 'Settings', exact: true }).click();
  await site.getByRole('button', { name: 'Spanish', exact: true }).click();
  await expect(site.locator('[data-node-id="current-state"]')).toContainText('Saved language: English');
  await site.getByRole('button', { name: 'Save language settings', exact: true }).click();
  await expect(site.getByRole('status')).toContainText('Language saved: Spanish');
  await site.getByRole('searchbox', { name: 'Search posts', exact: true }).fill('gardening');
  await site.getByRole('button', { name: 'Search', exact: true }).click();
  await site.getByRole('button', { name: 'Read post: How do I grow an orange tree at home?', exact: true }).click();
  await expect(site.getByText(/Container-grown citrus benefits/)).toBeVisible();
  await site.getByRole('button', { name: 'Upvote', exact: true }).click();
  await expect(site.getByRole('button', { name: 'Upvote (saved)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(site.getByRole('heading', { name: 'Questions worth exploring', exact: true })).toBeVisible();
});

test('agent receives fresh Quora state, saves only selected evidence, and attaches step snapshots', async ({ page }) => {
  let turn = 0;
  const actions = [
    { type: 'click', id: 'settings' },
    { type: 'click', id: 'language-spanish' },
    { type: 'click', id: 'save-language' },
    { type: 'finish' },
  ];
  await page.route('**/api/agent', (r) => {
    const data = r.request().postDataJSON();
    if (turn === 3) expect(data.doc.blocks.find((b: any) => b.id === 'language-current').text).toContain('Spanish');
    const action = actions[turn++];
    return r.fulfill({ json: { instruction: `Language action ${turn}`, action,
      ...(action.type === 'finish' ? { evidence: { name: 'spanish-language-saved', description: 'Spanish is the saved language', targetId: 'language-current', annotate: 'Saved preference' } } : {}),
    } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Quora .*Open/ }).click();
  await page.getByRole('button', { name: 'Guide: Change my language to Spanish', exact: true }).click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('Completed', { exact: true })).toBeVisible({ timeout: 20000 });
  const saved = page.getByRole('region', { name: 'Saved evidence' });
  await expect(saved.locator('img')).toHaveCount(0);
  await saved.getByRole('button', { name: 'Saved evidence (1)', exact: true }).click();
  await expect(saved.locator('img')).toHaveCount(1);
  await expect(page.getByText('spanish language saved', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View Journey', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: /^View step/ })).toHaveCount(5);
  await page.getByRole('button', { name: 'View step 2: Language action 2', exact: true }).hover();
  await expect(page.getByRole('tooltip').getByRole('img')).toBeVisible();
  await page.getByRole('button', { name: 'Enlarge screenshot 1', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Saved preference');
});

test('a premature finish cannot falsely complete the task', async ({ page }) => {
  await page.route('**/api/agent', (r) => r.fulfill({ json: { instruction: 'Finish without adding anything.', action: { type: 'finish' } } }));
  await page.goto('/');
  await page.getByRole('button', { name: /Amazon .*Open/ }).click();
  await page.getByRole('button', { name: 'Guide: Add oranges to my cart', exact: true }).click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('Incomplete', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Completed', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Saved evidence' })).toHaveCount(0);
});

test('clear chat cancels an in-flight agent action', async ({ page }) => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => { release = resolve; });
  let requested = false;
  await page.route('**/api/agent', async (r) => {
    requested = true;
    await waiting;
    await r.fulfill({ json: { instruction: 'Add oranges.', action: { type: 'click', id: 'add-oranges' } } }).catch(() => {});
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Amazon .*Open/ }).click();
  await page.getByRole('button', { name: 'Guide: Add oranges to my cart', exact: true }).click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect.poll(() => requested).toBe(true);
  await page.getByRole('button', { name: 'Clear chat', exact: true }).click();
  release();
  await expect(page.getByRole('heading', { name: 'Your next move?' })).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.locator('[data-node-id="current-state"]')).toContainText('Cart contents: empty');
});

for (const id of ['ronaldo', 'facebook', 'united-states', 'bible']) {
  test(`saved original HTML loads: ${id}`, async ({ page }) => {
    const article = library.articles.find((a) => a.id === id)!;
    await page.goto('/');
    const shelf = page.getByRole('region', { name: 'Find saved websites' });
    if (id === 'united-states' || id === 'bible') await shelf.getByRole('button', { name: 'More examples', exact: true }).click();
    const card = shelf.getByRole('button').filter({ hasText: article.title });
    await card.click();
    const frame = page.frameLocator('iframe');
    await expect(frame.locator('body')).toBeVisible({ timeout: 20000 });
    await expect(frame.locator('h1').first()).toContainText(article.title, { ignoreCase: true });
    await expect(frame.locator('script')).toHaveCount(0);
    await expect(frame.locator('[data-pg-id]').first()).toBeVisible();
    expect(await frame.locator('style').count()).toBeGreaterThan(0);
    await expect(page.getByText(/Original website HTML · saved/)).toBeVisible();
    const questions = page.getByRole('toolbar', { name: 'Find example requests' }).getByRole('button');
    await expect(questions).toHaveCount(3);
    for (const question of await questions.all()) {
      const text = (await question.innerText()).replace(/^Find: /, '');
      await question.click();
      await expect(page.getByRole('textbox', { name: 'Message PageGuide' })).toHaveValue(text);
    }
  });
}

test('location display is read-only and follows page, cart, and library navigation', async ({ page }) => {
  await page.goto('/');
  const location = page.getByTestId('browser-location');
  await expect(location).toHaveText('PageGuide library');
  await expect(page.getByRole('button', { name: 'Go', exact: true })).toHaveCount(0);
  await expect(location.locator('input')).toHaveCount(0);
  await page.getByRole('button', { name: /Amazon .*Open/ }).click();
  await expect(location).toHaveText('https://amazon.pageguide.test/');
  await page.locator('[data-sandbox-root]').getByRole('button', { name: 'Cart (0)', exact: true }).click();
  await expect(location).toHaveText('https://amazon.pageguide.test/cart');
  await page.getByRole('button', { name: 'Open library', exact: true }).click();
  await expect(location).toHaveText('PageGuide library');
});

test('custom URL loads are cached in-session and refresh bypasses the cache', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/fetch', (r) => {
    calls++;
    return r.fulfill({ json: { url: 'https://custom.example/', title: 'Custom website', blocks: [{ id: 'custom-title', type: 'heading', text: 'Custom website', level: 1 }] } });
  });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Search or enter website URL' }).fill('https://custom.example/');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.locator('[data-node-id="custom-title"]')).toBeVisible();
  await page.getByRole('button', { name: 'Open library', exact: true }).click();
  await expect(page.getByRole('button', { name: 'custom.example', exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Search or enter website URL' }).fill('https://custom.example/');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.locator('[data-node-id="custom-title"]')).toBeVisible();
  expect(calls).toBe(1);
  await page.getByRole('button', { name: 'Refresh page', exact: true }).click();
  await expect.poll(() => calls).toBe(2);
});
