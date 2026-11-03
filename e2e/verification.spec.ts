import { test, expect } from '@playwright/test';
import { validatePageVerdict } from '../lib/verification';
import { initialSandbox, applySandboxAction, verifySandboxTask } from '../lib/sandboxes';
import library from '../lib/library-seed.json';
import type { PageDoc } from '../lib/types';

const doc: PageDoc = { url: 'https://example.org/fetch', title: 'Fetch API', html: '<html><body><h1>Fetch API</h1><p data-pg-id="n1">The Fetch API provides an interface for fetching resources across the network.</p></body></html>', blocks: [{ id: 'n1', type: 'paragraph', text: 'The Fetch API provides an interface for fetching resources across the network.' }] };

test('page completion checks exact evidence and refuses unsupported mutations or wrong destinations', () => {
  const verdict = { completed: true, kind: 'read', answer: doc.blocks[0].text, checks: [{ id: 'n1', quote: 'an interface for fetching resources' }] };
  expect(validatePageVerdict(verdict, doc).completed).toBe(true);
  expect(validatePageVerdict({ ...verdict, checks: [{ id: 'invented', quote: 'an interface for fetching resources' }] }, doc).completed).toBe(false);
  expect(validatePageVerdict({ ...verdict, checks: [{ id: 'n1', quote: 'fake quotation' }] }, doc).completed).toBe(false);
  expect(validatePageVerdict({ ...verdict, kind: 'mutate' }, doc).completed).toBe(false);
  expect(validatePageVerdict({ ...verdict, kind: 'navigate', expectedUrl: 'https://example.org/wrong' }, doc).completed).toBe(false);
  expect(validatePageVerdict({ ...verdict, kind: 'navigate', expectedUrl: doc.url }, doc).completed).toBe(true);
});

test('cart verification checks all products, requested quantities, and changes relative to the starting cart', () => {
  const start = initialSandbox('amazon');
  let state = applySandboxAction(start, { type: 'click', id: 'add-oranges' }, library).state;
  expect(verifySandboxTask('Add oranges and apples to my cart', state, library, start).completed).toBe(false);
  state = applySandboxAction(state, { type: 'click', id: 'add-apples' }, library).state;
  expect(verifySandboxTask('Add oranges and apples to my cart', state, library, start).completed).toBe(true);
  expect(verifySandboxTask('Add 2 oranges to my cart', state, library, start).completed).toBe(false);
  expect(verifySandboxTask('Add oranges to my cart', state, library, state).completed).toBe(false);
});

test('selecting a language without saving cannot complete a settings task', () => {
  const start = initialSandbox('quora');
  let state = applySandboxAction(start, { type: 'click', id: 'settings' }, library).state;
  state = applySandboxAction(state, { type: 'click', id: 'language-spanish' }, library).state;
  expect(verifySandboxTask('Change my language to Spanish', state, library, start).completed).toBe(false);
  state = applySandboxAction(state, { type: 'click', id: 'save-language' }, library).state;
  expect(verifySandboxTask('Change my language to Spanish', state, library, start).completed).toBe(true);
});

for (const outcome of ['completed', 'unmet', 'unavailable'] as const) {
  test(`reading-task verification: ${outcome}, with Journey open by default`, async ({ page }) => {
    await page.route('**/api/library', (r) => r.fulfill({ json: { library } }));
    await page.route('**/api/fetch', (r) => r.fulfill({ json: doc }));
    await page.route('**/api/agent', (r) => r.fulfill({ json: { instruction: 'Read the Fetch API overview.', action: { type: 'finish' }, evidence: { name: 'fetch-api-overview', description: 'The Fetch API definition', targetId: 'n1' } } }));
    await page.route('**/api/verify', (r) => outcome === 'unavailable' ? r.fulfill({ status: 502, json: { error: 'Page verification timed out.' } }) : r.fulfill({ json: { completed: outcome === 'completed', reason: outcome === 'completed' ? 'Supporting quotations exist on the observed page.' : 'The requested comparison is not present on this page.', answer: outcome === 'completed' ? doc.blocks[0].text : 'The requested comparison was not found.' } }));
    await page.route('**/api/summarize', (r) => { const data = r.request().postDataJSON(); return r.fulfill({ json: { answer: `${data.outcome} ${data.evidence.map((e: any) => `[EV:${e.name}]`).join(' ')}` } }); });
    await page.goto('/');
    await page.getByRole('textbox', { name: 'Custom website URL' }).fill(doc.url);
    await page.getByRole('button', { name: 'Open website', exact: true }).click();
    await expect(page.frameLocator('iframe').locator('h1')).toBeVisible();
    await page.getByRole('textbox', { name: 'Message PageGuide' }).fill('/guide Explain the Fetch API from this page');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByRole('button', { name: 'View Journey', exact: true })).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText(outcome === 'completed' ? 'Completed' : 'Incomplete', { exact: true })).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('verification-result')).toContainText(outcome === 'completed' ? 'Verified' : outcome === 'unmet' ? 'comparison is not present' : 'Verification unavailable');
    await expect(page.getByRole('button', { name: 'View step 1: Read the Fetch API overview.', exact: true })).toBeVisible();
  });
}
