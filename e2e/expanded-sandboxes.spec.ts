import { test, expect } from '@playwright/test';
import library from '../lib/library-seed.json';
import { initialSandbox, applySandboxAction, verifySandboxTask } from '../lib/sandboxes';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/library', (r) => r.fulfill({ json: { library } }));
});

test('demo checkout requires shipping and review, creates a paid order, and supports cancellation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Amazon .*Open/ }).click();
  const site = page.locator('[data-sandbox-root]');
  await site.getByRole('button', { name: 'Add fresh oranges to cart', exact: true }).click();
  await site.getByRole('button', { name: 'Cart (1)', exact: true }).click();
  await site.getByRole('button', { name: 'Proceed to demo checkout', exact: true }).click();
  await site.getByRole('button', { name: 'Continue to order review', exact: true }).click();
  await expect(site.getByRole('status')).toContainText('Enter a name');
  await expect(site.getByRole('button', { name: /Pay .* with demo payment/ })).toHaveCount(0);
  await site.getByRole('button', { name: 'Use sample address', exact: true }).click();
  await expect(site.getByRole('textbox', { name: 'Recipient name', exact: true })).toHaveValue('Alex Demo');
  await site.getByRole('button', { name: 'Continue to order review', exact: true }).click();
  await site.getByRole('button', { name: 'Use demo wallet', exact: true }).click();
  await site.getByRole('button', { name: 'Pay $4.99 with demo payment', exact: true }).click();
  await expect(site.locator('[data-node-id="order-confirmation"]')).toContainText('Demo payment approved');
  await expect(site.locator('[data-node-id="order-confirmation"]')).toContainText('No real money was charged');
  await expect(site.getByRole('button', { name: 'Cart (0)', exact: true })).toBeVisible();
  await site.getByRole('button', { name: 'View all orders', exact: true }).click();
  await site.getByRole('button', { name: 'Cancel demo order DEMO-001', exact: true }).click();
  await expect(site.locator('[data-node-id="order-status-DEMO-001"]')).toContainText('Cancelled · demo refund');
});

test('Guide completes demo payment and saves the actual paid-order confirmation', async ({ page }) => {
  const ids = ['add-oranges', 'cart', 'checkout', 'use-demo-address', 'review-order', 'pay-demo'];
  let turn = 0;
  await page.route('**/api/agent', (r) => {
    const id = ids[turn++];
    return r.fulfill({ json: { instruction: id ? `Perform ${id}` : 'Verify the paid demo order', action: id ? { type: 'click', id } : { type: 'finish' },
      ...(!id ? { evidence: { name: 'paid-demo-order', description: 'Order DEMO-001 has a confirmed simulated payment', targetId: 'order-confirmation' } } : {}) } });
  });
  await page.route('**/api/summarize', (r) => { const data = r.request().postDataJSON(); return r.fulfill({ json: { answer: `${data.outcome} ${data.evidence.map((e: any) => `[EV:${e.name}]`).join(' ')}` } }); });
  await page.goto('/');
  await page.getByRole('button', { name: /Amazon .*Open/ }).click();
  await page.getByRole('button', { name: 'Guide: Buy oranges using demo checkout', exact: true }).click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('Completed', { exact: true })).toBeVisible({ timeout: 25000 });
  await expect(page.locator('[data-node-id="order-confirmation"]')).toContainText('Evidence 1');
  const saved = page.getByRole('region', { name: 'Saved evidence' });
  await expect(saved.locator('img')).toHaveCount(0);
  await expect(saved.getByRole('button', { name: 'Saved evidence (1)', exact: true })).toHaveAttribute('aria-expanded', 'false');
  // The inline answer citation remains available without opening the gallery.
  await expect(page.getByRole('button', { name: 'Screenshot evidence 1', exact: true })).toBeVisible();
  await expect(page.getByTestId('verification-result')).toHaveCount(0);
  await expect(page.getByTestId('guide-status')).toHaveClass(/border-green-600/);
});

test('checkout verification distinguishes reviewing from paying and rejects duplicate payment', () => {
  const start = initialSandbox('amazon');
  let state = start;
  for (const id of ['add-oranges', 'cart', 'checkout', 'use-demo-address', 'review-order']) state = applySandboxAction(state, { type: 'click', id }, library).state;
  expect(verifySandboxTask('Buy oranges using demo checkout', state, library, start).completed).toBe(false);
  state = applySandboxAction(state, { type: 'click', id: 'pay-demo' }, library).state;
  expect(verifySandboxTask('Buy oranges using demo checkout', state, library, start).completed).toBe(true);
  expect(() => applySandboxAction(state, { type: 'click', id: 'pay-demo' }, library)).toThrow();
  expect(state.orders).toHaveLength(1);
});

test('Quora includes multiple answers/comments and supports posting, voting, saving and following', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Quora .*Open/ }).click();
  const site = page.locator('[data-sandbox-root]');
  await site.getByRole('button', { name: 'Follow Gardening', exact: true }).click();
  await expect(site.locator('[data-node-id="current-state"]')).toContainText('Followed topics: Gardening');
  await site.getByRole('button', { name: 'Read post: How do I grow an orange tree at home?', exact: true }).click();
  await expect(site.locator('[data-node-id^="answer-text-"]')).toHaveCount(2);
  await expect(site.locator('p[data-node-id^="comment-"]')).toHaveCount(4);
  await site.getByRole('textbox', { name: "Comment on Nora Patel's answer", exact: true }).fill('Thank you, the drainage advice is useful.');
  await site.getByRole('button', { name: "Post comment on Nora Patel's answer", exact: true }).click();
  await expect(site.getByText('You (demo): Thank you, the drainage advice is useful.', { exact: true })).toBeVisible();
  await site.getByRole('textbox', { name: 'Write your answer', exact: true }).fill('Start with a dwarf variety and give it a sunny, sheltered position.');
  await site.getByRole('button', { name: 'Publish demo answer', exact: true }).click();
  await expect(site.locator('[data-node-id^="answer-text-"]')).toHaveCount(3);
  await site.getByRole('button', { name: 'Save this post', exact: true }).click();
  await site.getByRole('button', { name: 'Saved posts', exact: true }).click();
  await expect(site.getByRole('button', { name: 'Read post: How do I grow an orange tree at home?', exact: true })).toBeVisible();
  await site.getByRole('button', { name: 'Ask a question', exact: true }).click();
  await site.getByRole('textbox', { name: 'Question title', exact: true }).fill('How often should I water balcony herbs?');
  await site.getByRole('textbox', { name: 'Question topic', exact: true }).fill('Gardening');
  await site.getByRole('textbox', { name: 'Question details', exact: true }).fill('My balcony gets afternoon sun and I am growing parsley in a pot.');
  await site.getByRole('button', { name: 'Publish demo question', exact: true }).click();
  await expect(site.getByRole('heading', { name: 'How often should I water balcony herbs?', exact: true })).toBeVisible();
});

test('a draft answer or comment is not verified as published', () => {
  const start = initialSandbox('quora');
  let state = applySandboxAction(start, { type: 'click', id: 'post-growing-oranges' }, library).state;
  state = applySandboxAction(state, { type: 'fill', id: 'answer-draft', value: 'Grow a dwarf citrus tree in a sunny position.' }, library).state;
  expect(verifySandboxTask('Write an answer', state, library, start).completed).toBe(false);
  state = applySandboxAction(state, { type: 'click', id: 'submit-answer' }, library).state;
  expect(verifySandboxTask('Write an answer', state, library, start).completed).toBe(true);
});
