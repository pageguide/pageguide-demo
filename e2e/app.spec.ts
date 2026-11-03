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

test('Guide runs the autonomous agent loop, saves evidence, and summarizes', async ({ page }) => {
  await mockFetch(page);
  let agentCall = 0;
  await page.route('**/api/agent', (r) => {
    agentCall++;
    if (agentCall === 1)
      return r.fulfill({
        json: {
          instruction: 'Click Start booking.',
          action: { type: 'click', id: 'n5' },
          evidence: { name: 'booking-started', imageId: 'n6', annotate: 'the confirmation' },
        },
      });
    return r.fulfill({ json: { instruction: 'Confirm the task is complete.', action: { type: 'finish' } } });
  });
  await page.route('**/api/annotate', (r) => r.fulfill({ json: { box: [0.1, 0.1, 0.3, 0.3], caption: 'confirmed' } }));
  await page.route('**/api/summarize', (r) =>
    r.fulfill({
      json: {
        status: 'Completed',
        answer: 'The task is complete and confirmed by the evidence [EV:booking-started].',
        reasoning: 'Clicked the booking button and verified the confirmation.',
      },
    }),
  );
  await loadPage(page);

  await page.fill('textarea', '/guide start a booking');
  await page.keyboard.press('Enter');

  // task card appears with the task title
  await expect(page.getByText('start a booking').first()).toBeVisible();
  await expect(page.getByText('View Journey')).toBeVisible();

  // the summarizer produces the final Answer card with status + evidence badge
  await expect(page.getByText('Completed')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/task is complete/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /📷\s*1/ })).toBeVisible();

  // opening the evidence shows its annotated screenshot
  await page.getByRole('button', { name: /📷\s*1/ }).click();
  await expect(page.getByText('ev:booking-started')).toBeVisible();
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
