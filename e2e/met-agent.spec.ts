import { test, expect } from '@playwright/test';
import library from '../lib/library-seed.json';
import { applySandboxAction, initialSandbox, sandboxDoc, verifySandboxTask } from '../lib/sandboxes';

test('Met search exposes other-floor galleries as actionable controls and verifies all named galleries', () => {
  let state = initialSandbox('met-map');
  state = applySandboxAction(state, { type: 'fill', id: 'search', value: 'Musical Instruments' }, library).state;
  expect(sandboxDoc(state, library).blocks.find(block => block.id === 'room-instruments')?.control).toBe(true);
  state = applySandboxAction(state, { type: 'click', id: 'room-instruments' }, library).state;
  expect(state.mapFloor).toBe(2);
  expect(verifySandboxTask('Open Musical Instruments', state, library).completed).toBe(true);
  state = initialSandbox('met-map');
  expect(verifySandboxTask('Open Arms and Armor', state, library).completed).toBe(false);
  state = applySandboxAction(state, { type: 'click', id: 'room-arms' }, library).state;
  expect(verifySandboxTask('Open Arms and Armor', state, library).completed).toBe(true);
});

test('Guide completes the replacement Met task and renders its state changes', async ({ page }) => {
  test.setTimeout(90000);
  let turn = 0;
  await page.route('**/api/library', route => route.fulfill({ json: { library } }));
  await page.route('**/api/agent', route => {
    const request = route.request().postDataJSON();
    expect(request.doc.sandbox).toBe('met-map');
    return route.fulfill({ json: ++turn === 1
      ? { instruction: 'Open Arms and Armor.', action: { type: 'click', id: 'room-arms' } }
      : { instruction: 'The requested gallery is open.', action: { type: 'finish' } } });
  });
  await page.route('**/api/summarize', route => route.fulfill({ json: { answer: route.request().postDataJSON().outcome } }));
  await page.goto('/');
  await page.getByRole('button', { name: /The Met Map .*Open/ }).click();
  await expect(page.getByRole('button', { name: 'Guide: Open the Temple of Dendur', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Guide: Open Arms and Armor', exact: true }).click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.locator('.met-detail h1')).toHaveText('Arms and Armor', { timeout: 30000 });
  await expect(page.getByText('Completed', { exact: true })).toBeVisible({ timeout: 30000 });
});
