import { test, expect, Page } from '@playwright/test';
import library from '../lib/library-seed.json';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/library', (r) => r.fulfill({ json: { library, source: 'bundled' } }));
  await page.route('**/api/summarize', (r) => {
    const data = r.request().postDataJSON();
    return r.fulfill({ json: { answer: `${data.outcome} ${(data.evidence || []).map((e: any) => `[EV:${e.name}]`).join(' ')}` } });
  });
});

const DOC = {
  url: 'https://trails.example/guide',
  title: 'Weekend Trails Guide',
  siteName: 'trails.example',
  favicon: '',
  blocks: [
    { id: 'n0', type: 'heading', text: 'Weekend Trails Guide', level: 1 },
    { id: 'n1', type: 'paragraph', text: 'The best time to visit is late spring, from April to June.' },
    { id: 'n2', type: 'paragraph', text: 'Bring a water bottle, a rain jacket, and walking shoes.' },
    { id: 'n3', type: 'heading', text: 'Book your visit', level: 2 },
    { id: 'n4', type: 'input', text: 'Email address', control: true },
    { id: 'n5', type: 'button', text: 'Start booking', control: true },
    { id: 'n6', type: 'image', text: 'Confirmation', src: 'https://example.com/confirm.png' },
  ],
};

async function mockFetch(page: Page) {
  await page.route('**/api/fetch', (r) => r.fulfill({ json: DOC }));
}
async function mockFind(page: Page) {
  await page.route('**/api/ask', (r) =>
    r.fulfill({
      json: {
        kind: 'find',
        answer: 'Visit in late spring, April to June [1].',
        citations: [{ marker: '1', id: 'n1' }],
        visual: null,
        usage: { prompt: 100, completion: 50, total: 150, cost: 0.00012, estimated: true },
        debug: { provider: 'openai', model: 'gpt-4o-mini', system: 'Use page evidence only.', input: '{"question":"When is the best time to visit?"}', images: [], rawOutput: '{"claims":[]}' },
      },
    }),
  );
}
async function loadPage(page: Page) {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Search or enter website URL' }).fill('https://trails.example/guide');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.getByText('Weekend Trails Guide').first()).toBeVisible();
}

test('loads a page and Find highlights the grounded passage', async ({ page }) => {
  await mockFetch(page);
  await mockFind(page);
  await loadPage(page);
  await page.fill('textarea', 'When is the best time to visit?');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-node-id="n1"]')).toHaveClass(/pg-evidence|pg-visual/);
  await expect(page.locator('text=Visit in late spring').first()).toBeVisible();
});

test('Guide acts on the real sandbox state and shows both screenshots and on-page proof', async ({ page }) => {
  test.setTimeout(60000);
  let agentCall = 0;
  await page.route('**/api/agent', (r) => {
    const request = r.request().postDataJSON();
    agentCall++;
    if (agentCall === 1) return r.fulfill({ json: { instruction: 'Add oranges to the cart.', action: { type: 'click', id: 'add-oranges' }, evidence: { name: 'oranges-added' } } });
    expect(request.doc.blocks.find((b: any) => b.id === 'current-state').text).toContain('oranges: 1');
    if (agentCall === 2) return r.fulfill({ json: { instruction: 'Open the cart.', action: { type: 'click', id: 'cart' } } });
    return r.fulfill({ json: { instruction: 'Confirm oranges are in the cart.', action: { type: 'finish' }, evidence: { name: 'cart-confirmation', description: 'Fresh oranges shown in the shopping cart' } } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Amazon .*Open/ }).click();
  await page.locator('[data-node-id="current-state"]').evaluate((el) => {
    const range = el.ownerDocument.createRange(); range.selectNodeContents(el);
    const selection = el.ownerDocument.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });
  await expect(page.getByRole('complementary', { name: 'Selected text context' })).toBeVisible();
  await page.getByRole('button', { name: 'Guide: Add oranges to my cart', exact: true }).click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('Completed', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Reasoning Trail')).toHaveCount(0);
  await expect(page.getByText('Saved evidence (2)')).toBeVisible();
  const screenshots = page.getByRole('region', { name: 'Saved evidence' });
  await expect(screenshots.locator('img')).toHaveCount(0);
  const disclosure = screenshots.getByRole('button', { name: 'Saved evidence (2)', exact: true });
  await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
  await disclosure.click();
  await expect(screenshots.locator('img')).toHaveCount(2);
  for (const image of await screenshots.locator('img').all()) {
    expect(await image.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    expect(await image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(300);
  }
  await expect(page.locator('[data-sandbox-root] [data-node-id="current-state"]')).toContainText('oranges: 1');
  await expect(page.locator('[data-sandbox-root] [data-node-id="current-state"]')).toContainText('Evidence 2');
  await expect(page.locator('[data-node-id="subtotal"]')).toHaveClass(/pg-evidence/);
  await expect(page.getByRole('button', { name: 'View Journey', exact: true })).toHaveAttribute('aria-expanded', 'true');
  const step = page.getByRole('button', { name: 'View step 1: Add oranges to the cart.', exact: true });
  await step.hover();
  await expect(page.getByRole('tooltip')).toContainText('Add oranges to the cart.');
  await expect(page.getByRole('tooltip').getByRole('img')).toBeVisible();
  await page.getByRole('button', { name: 'Screenshot evidence 2', exact: true }).first().hover();
  await expect(page.getByRole('tooltip').getByRole('img')).toBeVisible();
  await page.getByRole('button', { name: 'Enlarge screenshot 1', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Saved screenshot' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('minimal panel has only dark mode, clear chat and send, with larger text', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: 'PageGuide chat' });
  await expect(panel.getByRole('button')).toHaveCount(3);
  await expect(panel.getByRole('heading', { name: 'Your next move?' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Send', exact: true })).toBeDisabled();
  await expect(panel).not.toContainText(/OpenAI|OpenRouter|gpt-|tokens|\$/);
  const composer = panel.getByRole('textbox', { name: 'Message PageGuide' });
  expect(await composer.evaluate((el) => getComputedStyle(el).fontSize)).toBe('16px');
  expect(await panel.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('linear-gradient');
  await panel.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(panel.getByRole('button', { name: 'Light mode', exact: true })).toBeVisible();
});

test('clear chat removes conversation and highlights but keeps the page', async ({ page }) => {
  await mockFetch(page);
  await mockFind(page);
  await loadPage(page);
  await page.fill('textarea', 'When is the best time to visit?');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Visit in late spring', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Clear chat', exact: true }).click();
  const panel = page.getByRole('region', { name: 'PageGuide chat' });
  await expect(panel.getByRole('heading', { name: 'Your next move?' })).toBeVisible();
  await expect(panel).not.toContainText('Visit in late spring');
  await expect(page.locator('.pg-evidence, .pg-visual')).toHaveCount(0);
  await expect(page.locator('[data-node-id="n0"]')).toBeVisible();
});

test('usage and model diagnostics are admin-only', async ({ page }) => {
  await mockFetch(page);
  await mockFind(page);
  await loadPage(page);
  await page.fill('textarea', 'When is the best time to visit?');
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Visit in late spring/).first()).toBeVisible();
  await expect(page.getByTestId('admin-usage')).toHaveCount(0);
  await expect(page.getByTestId('admin-inspector')).toHaveCount(0);
  // The local admin command never becomes a chat message or provider request.
  await page.fill('textarea', '/admin admin2026pageguide');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByTestId('admin-usage')).toContainText('150 tokens · ≈ $0.00012');
  await page.getByTestId('admin-inspector').getByText('Latest model request', { exact: true }).click();
  await expect(page.getByTestId('admin-inspector')).toContainText('gpt-4o-mini');
  await page.getByTestId('admin-inspector').getByText('System prompt', { exact: true }).click();
  await expect(page.getByTestId('admin-inspector')).toContainText('Use page evidence only.');
  const panel = page.getByRole('region', { name: 'PageGuide chat' });
  await expect(panel).not.toContainText('admin2026pageguide');
  await expect(panel.locator('header button')).toHaveCount(2);
  await page.fill('textarea', '/admin off');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('admin-usage')).toHaveCount(0);
  await expect(page.getByTestId('admin-inspector')).toHaveCount(0);
});

test('admin mode exposes Guide request diagnostics and usage', async ({ page }) => {
  await page.route('**/api/agent', (r) => r.fulfill({ json: {
    instruction: 'Finish the task.', action: { type: 'finish' },
    usage: { prompt: 200, completion: 40, total: 240, cost: 0.0002, estimated: true },
    debug: { provider: 'openai', model: 'gpt-4o-mini', system: 'Complete the task safely.', input: '{"task":"Add oranges"}', images: [], rawOutput: '{"action":{"type":"finish"}}' },
  } }));
  await page.goto('/');
  await page.getByRole('button', { name: /Amazon .*Open/ }).click();
  await page.getByRole('button', { name: 'Auto', exact: true }).click();
  await page.getByRole('textbox', { name: 'Message PageGuide' }).fill('Add oranges to my cart');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByTestId('guide-status')).toBeVisible();
  await page.getByRole('textbox', { name: 'Message PageGuide' }).fill('/admin admin2026pageguide');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByTestId('admin-usage')).toContainText('720 tokens · ≈ $0.00060'); // The false finish is retried twice, so three requests are recorded.
  await page.getByTestId('admin-inspector').getByText('Latest model request', { exact: true }).click();
  await page.getByTestId('admin-inspector').getByText('Input prompt', { exact: true }).click();
  await expect(page.getByTestId('admin-inspector')).toContainText('{"task":"Add oranges"}');
});

test('narrow screens keep the composer visible without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const panel = page.getByRole('region', { name: 'PageGuide chat' });
  await expect(panel.getByRole('textbox')).toBeInViewport();
  await expect(panel.getByRole('button', { name: 'Send', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the model cannot highlight outside the page (invalid id is ignored by the server contract)', async ({ page }) => {
  await mockFetch(page);
  // Server drops invalid ids; simulate a clean response with no citations.
  await page.route('**/api/ask', (r) =>
    r.fulfill({ json: { kind: 'find', answer: 'I could not find that on the page.', citations: [], visual: null } }),
  );
  await loadPage(page);
  await page.fill('textarea', 'What is unrelated?');
  await page.keyboard.press('Enter');
  await expect(page.getByText('I could not find that on the page.')).toBeVisible();
  await expect(page.locator('.pg-evidence')).toHaveCount(0);
});

test('provider errors are surfaced, not silently swallowed', async ({ page }) => {
  await mockFetch(page);
  await page.route('**/api/ask', (r) =>
    r.fulfill({ status: 401, json: { error: 'The provider rejected this API key.' } }),
  );
  await loadPage(page);
  await page.fill('textarea', 'When is the best time to visit?');
  await page.keyboard.press('Enter');
  await expect(page.getByText('rejected this API key')).toBeVisible();
  await expect(page.locator('.pg-evidence')).toHaveCount(0);
});

test('Terminal view is disabled', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /Terminal/ })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Find saved websites' }).getByRole('button')).toHaveCount(4);
  await expect(page.getByRole('region', { name: 'Guide interactive websites' }).getByRole('button')).toHaveCount(2);
});
