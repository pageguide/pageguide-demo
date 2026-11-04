import { test, expect, type Page } from '@playwright/test';
import library from '../lib/library-seed.json';
import { MANUAL_TASKS, MANUAL_QUESTION, manualTasksFor, manualTaskUnavailableReason } from '../lib/manual-tasks';
import { initialSandbox, applySandboxAction, verifySandboxTask, type BrowserAction, type SandboxState } from '../lib/sandboxes';

const click = (id: string): BrowserAction => ({ type: 'click', id });
const fill = (id: string, value: string): BrowserAction => ({ type: 'fill', id, value });
const FLOWS: Record<string, BrowserAction[]> = {
  'amazon-review': ['add-oranges', 'add-oranges', 'add-coffee', 'cart', 'checkout', 'use-demo-address', 'review-order'].map(click),
  'amazon-payment': ['add-oranges', 'cart', 'checkout', 'use-demo-address', 'review-order', 'payment-wallet', 'pay-demo'].map(click),
  'quora-publish': [click('ask-question'), fill('question-title', MANUAL_QUESTION.title), fill('question-topic', MANUAL_QUESTION.topic), fill('question-body', MANUAL_QUESTION.body), click('post-question')],
  'quora-language': ['settings', 'language-spanish', 'save-language', 'home'].map(click),
  'soundcloud-listen': ['play-midnight', 'like-midnight', 'follow-nova', 'library'].map(click),
  'soundcloud-undo': ['like-midnight', 'follow-nova', 'library'].map(click),
  'met-dining': ['amenity-dining', 'place-balcony-lounge', 'directions'].map(click),
  'met-restrooms': ['amenity-restrooms', 'place-restroom-balcony-2', 'directions'].map(click),
};
const apply = (s: SandboxState, actions: BrowserAction[]) => actions.reduce((state, action) => applySandboxAction(state, action, library).state, s);

for (const task of MANUAL_TASKS) {
  test(`lesson state verification: ${task.id}`, () => {
    let initial = initialSandbox(task.site);
    if (task.site === 'amazon') initial = apply(initial, [click('add-apples')]);
    if (task.id === 'soundcloud-undo') initial = apply(initial, FLOWS['soundcloud-listen']);
    expect(manualTaskUnavailableReason(task, initial, library)).toBeNull();
    expect(verifySandboxTask(task.prompt, initial, library, initial).completed).toBe(false);
    const state = apply(initial, FLOWS[task.id]);
    expect(verifySandboxTask(task.prompt, state, library, initial)).toMatchObject({ supported: true, completed: true });
    if (task.id === 'amazon-review') {
      expect(state.orders).toHaveLength(0);
      expect(state.cart.apples).toBe(1);
      expect(verifySandboxTask(task.prompt, { ...state, checkoutStage: 'shipping' }, library, initial).completed).toBe(false);
      expect(verifySandboxTask(task.prompt, { ...state, cart: { ...state.cart, coffee: 0 } }, library, initial).completed).toBe(false);
      const paid = apply(state, [click('pay-demo')]);
      expect(verifySandboxTask(task.prompt, paid, library, initial).completed).toBe(false);
    }
    if (task.id === 'amazon-payment') {
      expect(state.orders[0].items.apples).toBe(1);
      expect(verifySandboxTask(task.prompt, { ...state, orders: [{ ...state.orders[0], payment: 'Demo card •••• 4242' }] }, library, initial).completed).toBe(false);
      expect(verifySandboxTask(task.prompt, { ...state, orders: [{ ...state.orders[0], total: 0 }] }, library, initial).completed).toBe(false);
    }
    if (task.id === 'quora-publish') expect(verifySandboxTask(task.prompt, { ...state, userPosts: [{ ...state.userPosts[0], body: 'Wrong text' }] }, library, initial).completed).toBe(false);
    if (task.id === 'quora-language') expect(verifySandboxTask(task.prompt, { ...state, language: 'English' }, library, initial).completed).toBe(false);
    if (task.id === 'soundcloud-listen') {
      expect(verifySandboxTask(task.prompt, { ...state, soundPlaying: false }, library, initial).completed).toBe(true); // listening may have ended
      expect(verifySandboxTask(task.prompt, { ...state, followedTopics: [] }, library, initial).completed).toBe(false);
    }
    if (task.id === 'soundcloud-undo') expect(verifySandboxTask(task.prompt, initialSandbox('soundcloud'), library, initialSandbox('soundcloud')).completed).toBe(false);
    if (task.site === 'met-map') {
      expect(verifySandboxTask(task.prompt, { ...state, mapRouting: false }, library, initial).completed).toBe(false);
      expect(verifySandboxTask(task.prompt, { ...state, mapPlace: '' }, library, initial).completed).toBe(false);
      expect(verifySandboxTask(task.prompt, { ...state, mapAmenity: '' }, library, initial).completed).toBe(false);
    }
  });
}

test('prerequisites are explicit and lessons do not need a silent reset', () => {
  expect(MANUAL_TASKS).toHaveLength(8);
  for (const site of ['amazon', 'quora', 'soundcloud', 'met-map'] as const) expect(manualTasksFor(site)).toHaveLength(2);
  const undo = MANUAL_TASKS.find(t => t.id === 'soundcloud-undo')!;
  expect(manualTaskUnavailableReason(undo, initialSandbox('soundcloud'), library)).toContain('First complete');
  const review = MANUAL_TASKS.find(t => t.id === 'amazon-review')!;
  expect(manualTaskUnavailableReason(review, { ...initialSandbox('amazon'), cart: { oranges: 99 } }, library)).toContain('99');
});

async function prepare(page: Page, id: string) {
  const task = MANUAL_TASKS.find(t => t.id === id)!;
  let turn = 0;
  await page.route('**/api/library', r => r.fulfill({ json: { library } }));
  await page.route('**/api/agent', r => {
    expect(r.request().postDataJSON().task).toBe(task.prompt);
    const action = FLOWS[id][turn++];
    return r.fulfill({ json: { instruction: action ? `Review and perform ${action.id}` : 'Finish with the reviewed result', action: action || { type: 'finish' } } });
  });
  await page.route('**/api/summarize', r => r.fulfill({ json: { answer: r.request().postDataJSON().outcome } }));
  await page.goto('/');
  const name = task.site === 'amazon' ? 'Amazon' : task.site === 'quora' ? 'Quora' : task.site === 'soundcloud' ? 'SoundCloud' : 'The Met Map';
  await page.getByRole('button', { name: new RegExp(`${name} sandbox`) }).click();
  await page.getByRole('button', { name: 'Auto', exact: true }).click();
  return { task, turn: () => turn };
}

async function start(page: Page, id: string) {
  const task = MANUAL_TASKS.find(t => t.id === id)!;
  const bar = page.getByRole('toolbar', { name: 'Sandbox tasks', exact: true });
  await expect(bar.locator('[data-manual-task]')).toHaveCount(2);
  const button = bar.getByRole('button', { name: `Manual: ${task.shortLabel}`, exact: true });
  await expect(button).toHaveAttribute('title', /Why Manual\?/);
  await expect(page.getByRole('dialog', { name: 'Manual practice', exact: true })).toHaveCount(0);
  await button.click();
  await expect(page.getByRole('button', { name: 'Manual', exact: true })).toHaveAttribute('aria-pressed', 'true');
}

async function advance(page: Page, id: string, turn: () => number, before?: (action: BrowserAction) => Promise<void>) {
  for (const [index, action] of FLOWS[id].entries()) {
    await expect.poll(turn, { timeout: 30000 }).toBeGreaterThanOrEqual(index + 1);
    await expect(page.locator(`[data-guide-pointer][data-target-id="${action.id}"]`)).toBeVisible({ timeout: 30000 });
    if (before) await before(action);
    await page.getByRole('button', { name: 'Perform highlighted step', exact: true }).click();
    await expect.poll(turn, { timeout: 30000 }).toBeGreaterThanOrEqual(index + 2);
  }
  await expect(page.getByTestId('guide-status')).toHaveText('Completed', { timeout: 30000 });
  await expect(page.getByTestId('guide-status')).toHaveClass(/border-green-600/);
}

test('checkout review lesson starts Manual, preserves an existing cart, and never pays', async ({ page }) => {
  test.setTimeout(90000);
  const run = await prepare(page, 'amazon-review');
  await page.locator('[data-sandbox-root] [data-node-id="add-apples"]').click();
  await start(page, run.task.id);
  await advance(page, run.task.id, run.turn);
  await expect(page.locator('[data-node-id="order-total"]')).toContainText('$22.46');
  await expect(page.locator('[data-node-id="shipping-summary"]')).toContainText('Alex Demo');
  await expect(page.locator('[data-node-id="pay-demo"]')).toBeVisible();
  await expect(page.locator('[data-node-id="order-confirmation"]')).toHaveCount(0);
});

test('payment lesson waits at the final commit and confirms a new demo-wallet order', async ({ page }) => {
  test.setTimeout(90000);
  const run = await prepare(page, 'amazon-payment');
  await start(page, run.task.id);
  await advance(page, run.task.id, run.turn, async action => {
    if (action.id === 'pay-demo') {
      await expect(page.getByRole('alertdialog', { name: 'Confirm action', exact: true })).toBeVisible();
      await expect(page.locator('[data-node-id="payment-current"]')).toContainText('Demo wallet');
      await expect(page.locator('[data-node-id="order-confirmation"]')).toHaveCount(0);
    }
  });
  await expect(page.locator('[data-node-id="order-confirmation"]')).toContainText('Demo payment approved');
  await expect(page.locator('[data-node-id="order-confirmation"]')).toContainText('No real money was charged');
});

test('publishing lesson lets the user inspect the exact draft before final approval', async ({ page }) => {
  test.setTimeout(90000);
  const run = await prepare(page, 'quora-publish');
  await start(page, run.task.id);
  await advance(page, run.task.id, run.turn, async action => {
    if (action.id === 'post-question') {
      await expect(page.getByRole('textbox', { name: 'Question title', exact: true })).toHaveValue(MANUAL_QUESTION.title);
      await expect(page.getByRole('textbox', { name: 'Question details', exact: true })).toHaveValue(MANUAL_QUESTION.body);
      await expect(page.getByRole('alertdialog', { name: 'Confirm action', exact: true })).toBeVisible();
      await expect(page.locator('[data-node-id^="title-user-question-"]')).toHaveCount(0);
    }
  });
  await expect(page.locator('[data-node-id^="title-user-question-"]')).toHaveText(MANUAL_QUESTION.title);
});

test('inline SoundCloud tasks explain the undo prerequisite and work in a narrow viewport', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 390, height: 960 });
  const run = await prepare(page, 'soundcloud-listen');
  const bar = page.getByRole('toolbar', { name: 'Sandbox tasks', exact: true });
  const undo = bar.getByRole('button', { name: 'Manual: Undo like & follow', exact: true });
  await expect(undo).toBeDisabled();
  await expect(undo).toHaveAttribute('title', /First complete/);
  const listen = bar.getByRole('button', { name: 'Manual: Listen & save', exact: true });
  await listen.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/manual-task-bar-mobile.png' });
  await expect(page.getByRole('dialog', { name: 'Manual practice', exact: true })).toHaveCount(0);
  await listen.click();
  await advance(page, run.task.id, run.turn);
  await expect(page.locator('.sc-mix-row')).toContainText('Midnight Signals');
  await expect(undo).toBeEnabled();
  await expect(page.getByRole('dialog', { name: 'Manual practice', exact: true })).toHaveCount(0);
});

test('museum dining lesson verifies the selected service, floor, filter, and route', async ({ page }) => {
  test.setTimeout(90000);
  const run = await prepare(page, 'met-dining');
  await start(page, run.task.id);
  await advance(page, run.task.id, run.turn);
  await expect(page.getByLabel('Museum floor')).toHaveValue('2');
  await expect(page.locator('.met-place-pin.selected')).toHaveAttribute('data-place', 'balcony-lounge');
  await expect(page.locator('[data-node-id="route-guidance"]')).toContainText('82nd Street');
});
