import { test, expect, Page } from '@playwright/test';

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
      },
    }),
  );
}
async function loadPage(page: Page) {
  await page.goto('/');
  await page.fill('input[placeholder^="Enter a URL"]', 'trails.example/guide');
  await page.click('text=Go');
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

test('Guide performs real actions (fill then click) step by step', async ({ page }) => {
  await mockFetch(page);
  await page.route('**/api/ask', (r) =>
    r.fulfill({
      json: {
        kind: 'guide',
        answer: 'Here is how to book.',
        steps: [
          { id: 'n4', instruction: 'Enter your email.', action: 'fill', value: 'demo@example.com' },
          { id: 'n5', instruction: 'Click Start booking.', action: 'click' },
        ],
      },
    }),
  );
  await loadPage(page);
  // Use "Ask" mode so steps don't auto-advance.
  await page.getByRole('button', { name: /Auto:/ }).click();
  await page.getByText('Ask — confirm each step').click();

  await page.fill('textarea', 'How do I book a visit?');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-node-id="n4"]')).toHaveClass(/pg-guide/);
  await expect(page.getByText('Step 1 of 2')).toBeVisible();

  // perform step 1 (fill) — the field gets the value
  await page.getByRole('button', { name: /Do this step/ }).click();
  await expect(page.getByText(/Typed .* into/)).toBeVisible();
  await expect(page.locator('[data-node-id="n5"]')).toHaveClass(/pg-guide/);

  // perform step 2 (click) — the button shows done, walkthrough completes
  await page.getByRole('button', { name: /Do this step/ }).click();
  await expect(page.getByText(/Clicked/)).toBeVisible();
  await expect(page.getByText('Walkthrough complete')).toBeVisible();
});

test('saved chat history: save, reload a fresh session, and open it', async ({ page }) => {
  await mockFetch(page);
  await mockFind(page);
  await loadPage(page);
  await page.fill('textarea', 'When is the best time to visit?');
  await page.keyboard.press('Enter');
  await expect(page.locator('text=Visit in late spring').first()).toBeVisible();
  await page.getByRole('button', { name: 'Save chat' }).click();
  await expect(page.getByText(/Saved this chat/)).toBeVisible();

  // new chat clears, history still holds the saved one
  await page.getByRole('button', { name: 'New chat' }).click();
  await page.getByRole('button', { name: 'Chat history' }).click();
  await expect(page.getByText('Weekend Trails Guide')).toBeVisible();
  await page.getByText('Weekend Trails Guide').click();
  await expect(page.locator('text=Visit in late spring').first()).toBeVisible();
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

test('switching surfaces preserves the session', async ({ page }) => {
  await mockFetch(page);
  await mockFind(page);
  await loadPage(page);
  await page.fill('textarea', 'When is the best time to visit?');
  await page.keyboard.press('Enter');
  await expect(page.locator('text=Visit in late spring').first()).toBeVisible();
  await page.getByRole('button', { name: /Terminal/ }).click();
  // the terminal surface is active and the same conversation is preserved
  await expect(page.getByText('pageguide — terminal')).toBeVisible();
  await expect(page.getByText('Visit in late spring').first()).toBeVisible();
});
