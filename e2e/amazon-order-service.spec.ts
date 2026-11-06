import { test, expect } from '@playwright/test';
import library from '../lib/library-seed.json';
import { actionRisk, applySandboxAction, initialSandbox, routeSandbox, sandboxDoc, stateUrl, verifySandboxTask, type SandboxState } from '../lib/sandboxes';

const returnTask = 'How do I return the jacket I bought on Amazon last week?';
const trackingTask = 'Where can I track my order and see when it will arrive?';
const click = (state: SandboxState, id: string) => applySandboxAction(state, { type: 'click', id }, library).state;

test('Amazon test account has a recent delivered jacket and an in-transit order', () => {
  const state = initialSandbox('amazon');
  expect(state.orders).toHaveLength(2);
  const jacket = state.orders.find(order => order.items.jacket)!;
  expect(jacket.delivery?.status).toBe('delivered');
  expect(Date.now() - Date.parse(jacket.placedAt!)).toBeLessThan(8 * 86400000);
  expect(state.orders.some(order => order.delivery?.status === 'in-transit')).toBe(true);
  expect(initialSandbox('quora').orders).toEqual([]);
});

test('jacket return requires reason, method, review, and confirmation; it is persistent and isolated', () => {
  const start = initialSandbox('amazon');
  let state = click(click(start, 'orders'), 'return-DEMO-JACKET');
  expect(verifySandboxTask(returnTask, state, library, start).completed).toBe(false);
  expect(() => click(state, 'submit-return')).toThrow();
  state = click(click(state, 'return-reason-fit'), 'return-method-dropoff');
  expect(state.returnStage).toBe('review');
  expect(verifySandboxTask(returnTask, state, library, start).completed).toBe(false);
  expect(actionRisk({ type: 'click', id: 'submit-return' })?.title).toBe('Confirm demo return');
  state = click(state, 'submit-return');
  expect(verifySandboxTask(returnTask, state, library, start).completed).toBe(true);
  const doc = sandboxDoc(state, library);
  expect(doc.blocks.find(block => block.id === 'return-instructions')?.text).toContain('QR code');
  expect(doc.blocks.find(block => block.id === 'return-refund')?.text).toContain('$59.99');
  expect(() => click(state, 'submit-return')).toThrow();
  expect(start.orders[0].returnRequest).toBeUndefined();
  state = click(click(state, 'orders'), 'return-DEMO-JACKET');
  expect(state.returnStage).toBe('confirmation');
  const restored = routeSandbox(state, stateUrl(state), library);
  expect(restored.view).toBe('returns');
  expect(restored.selected).toBe('DEMO-JACKET');
  expect(sandboxDoc(restored, library).blocks.some(block => block.id === 'return-confirmation')).toBe(true);
  expect(initialSandbox('amazon').orders[0].returnRequest).toBeUndefined();
});

test('tracking page includes carrier, package journey and arrival estimate and restores its URL', () => {
  const start = initialSandbox('amazon');
  let state = click(start, 'orders');
  expect(verifySandboxTask(trackingTask, state, library, start).completed).toBe(false);
  expect(() => click(state, 'return-DEMO-COFFEE')).toThrow();
  expect(() => click(state, 'cancel-DEMO-JACKET')).toThrow();
  state = click(state, 'track-DEMO-COFFEE');
  expect(verifySandboxTask(trackingTask, state, library, start).completed).toBe(true);
  const blocks = sandboxDoc(state, library).blocks;
  expect(blocks.find(block => block.id === 'tracking-arrival')?.text).toContain('Estimated arrival:');
  expect(blocks.find(block => block.id === 'tracking-number')?.text).toContain('DEMO-TRACK-COFFEE');
  expect(blocks.filter(block => block.id.startsWith('tracking-event-'))).toHaveLength(3);
  const restored = routeSandbox(state, stateUrl(state), library);
  expect(restored.view).toBe('tracking');
  expect(restored.selected).toBe('DEMO-COFFEE');
  expect(routeSandbox(state, 'https://amazon.pageguide.test/tracking/nonexistent', library).view).toBe('home');
});

test('oranges checkout still creates a separate order with tracking', () => {
  const start = initialSandbox('amazon');
  let state = start;
  for (const id of ['add-oranges', 'cart', 'checkout', 'use-demo-address', 'review-order', 'pay-demo']) state = click(state, id);
  expect(state.orders).toHaveLength(3);
  expect(state.orders[2].id).toBe('DEMO-001');
  expect(verifySandboxTask('Buy oranges using demo checkout', state, library, start).completed).toBe(true);
  state = click(click(state, 'orders'), 'track-DEMO-001');
  expect(sandboxDoc(state, library).blocks.find(block => block.id === 'tracking-arrival')?.text).toContain('Estimated arrival');
});

test('Amazon renders working return and tracking pages for a human', async ({ page }) => {
  await page.route('**/api/library', route => route.fulfill({ json: { library } }));
  await page.goto('/');
  await page.getByRole('button', { name: /Amazon .*Open/ }).click();
  const site = page.locator('[data-sandbox-root]');
  await expect(page.getByRole('button', { name: `Guide: ${returnTask}`, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: `Guide: ${trackingTask}`, exact: true })).toBeVisible();
  await site.getByRole('button', { name: 'Your orders', exact: true }).click();
  await site.getByRole('button', { name: 'Return jacket DEMO-JACKET', exact: true }).click();
  await site.getByRole('button', { name: 'Does not fit', exact: true }).click();
  await site.getByRole('button', { name: /Free Demo Parcel drop-off/ }).click();
  await site.getByRole('button', { name: 'Confirm demo return', exact: true }).click();
  await expect(site.locator('[data-node-id="return-confirmation"]')).toContainText('Return requested');
  await expect(site.locator('[data-node-id="return-instructions"]')).toContainText('QR code');
  await site.getByRole('button', { name: 'Back to your orders', exact: true }).click();
  await site.getByRole('button', { name: /Track package DEMO-COFFEE/ }).click();
  await expect(site.getByRole('region', { name: 'Order tracking timeline' })).toBeVisible();
  await expect(site.locator('[data-node-id="tracking-arrival"]')).toContainText('Estimated arrival');
  await expect(site.getByRole('list', { name: 'Package journey' }).getByRole('listitem')).toHaveCount(3);
});
