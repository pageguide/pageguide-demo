import { test, expect } from '@playwright/test';
import library from '../lib/library-seed.json';
import { applySandboxAction, initialSandbox, routeSandbox, sandboxDoc, stateUrl, verifySandboxTask, type SandboxState } from '../lib/sandboxes';

const spaceTask = 'How to post a question to Business Space';
const notificationsTask = 'How to check notifications for my content?';
const click = (state: SandboxState, id: string) => applySandboxAction(state, { type: 'click', id }, library).state;
const fill = (state: SandboxState, id: string, value: string) => applySandboxAction(state, { type: 'fill', id, value }, library).state;

function questionDraft(state: SandboxState) {
  state = fill(state, 'question-title', 'How can I price my first product?');
  state = fill(state, 'question-body', 'I am testing a fictional business idea and would like to learn about pricing.');
  return fill(state, 'question-topic', 'Business');
}

test('Business Space question requires publishing in the actual Space, not a public Business topic', () => {
  const start = initialSandbox('quora');
  const publicPost = click(questionDraft(click(start, 'ask-question')), 'post-question');
  expect(verifySandboxTask(spaceTask, publicPost, library, start).completed).toBe(false);
  let state = click(click(click(start, 'spaces'), 'space-business'), 'ask-business');
  expect(sandboxDoc(state, library).blocks.find(b => b.id === 'question-audience')?.text).toBe('Posting to: Business Space');
  expect(routeSandbox(state, stateUrl(state), library).questionSpace).toBe('Business');
  expect(sandboxDoc(state, library).blocks.find(b => b.id === 'post-question')?.text).toBe('Publish demo question');
  state = questionDraft(state);
  expect(verifySandboxTask(spaceTask, state, library, start).completed).toBe(false);
  state = click(state, 'post-question');
  expect(verifySandboxTask(spaceTask, state, library, start).completed).toBe(true);
  expect(state.userPosts[0].space).toBe('Business');
  expect(sandboxDoc(state, library).blocks.find(b => b.id === `published-space-${state.selected}`)?.text).toBe('Published in Business Space');
  state = click(state, 'space-business');
  expect(sandboxDoc(state, library).blocks.some(b => b.id === `post-${state.userPosts[0].id}`)).toBe(true);
  expect(start.userPosts).toHaveLength(1);
});

test('content notifications filter excludes Space announcements and does not mark activity read', () => {
  const start = initialSandbox('quora');
  let state = click(start, 'notifications');
  expect(verifySandboxTask(notificationsTask, state, library, start).completed).toBe(false);
  state = click(state, 'notifications-filter-content');
  expect(verifySandboxTask(notificationsTask, state, library, start).completed).toBe(true);
  const cards = sandboxDoc(state, library).blocks.filter(b => b.id.startsWith('notification-text-'));
  expect(cards).toHaveLength(3);
  expect(cards.some(b => b.id.includes('space-business'))).toBe(false);
  expect(state.notifications!.filter(n => !n.read)).toHaveLength(3);
  const restored = routeSandbox(state, stateUrl(state), library);
  expect(restored.view).toBe('notifications');
  expect(restored.notificationFilter).toBe('content');
  state = click(state, 'notification-open-answer-business');
  expect(state.view).toBe('post');
  expect(state.selected).toBe('my-business-question');
  expect(state.notifications!.filter(n => !n.read)).toHaveLength(2);
  expect(start.notifications!.filter(n => !n.read)).toHaveLength(3);
});

test('notification subfilters and mark-all-read work, with a valid empty state', () => {
  const start = initialSandbox('quora');
  let state = click(start, 'notifications');
  for (const filter of ['comments', 'upvotes', 'spaces']) {
    state = click(state, `notifications-filter-${filter}`);
    expect(sandboxDoc(state, library).blocks.filter(b => b.id.startsWith('notification-text-'))).toHaveLength(1);
  }
  state = click(state, 'notifications-mark-read');
  expect(state.notifications!.every(n => n.read)).toBe(true);
  state = { ...state, notifications: [] };
  expect(sandboxDoc(state, library).blocks.find(b => b.id === 'empty')?.text).toContain('No New Notifications');
  expect(initialSandbox('quora').notifications!.filter(n => !n.read)).toHaveLength(3);
});

test('Spanish language flow still translates Space and notification navigation', () => {
  let state = initialSandbox('quora');
  for (const id of ['settings', 'language-spanish', 'save-language', 'notifications', 'notifications-filter-content']) state = click(state, id);
  expect(state.language).toBe('Spanish');
  expect(sandboxDoc(state, library).blocks.find(b => b.id === 'page-title')?.text).toBe('Tu contenido');
  state = click(click(state, 'space-business'), 'ask-business');
  state = fill(questionDraft(state), 'question-topic', 'Negocios');
  state = click(state, 'post-question');
  expect(state.userPosts[0].topic).toBe('Business');
  expect(state.userPosts[0].space).toBe('Business');
});

test('Quora UI posts to Business Space and displays the Your content notification screen', async ({ page }) => {
  await page.route('**/api/library', route => route.fulfill({ json: { library } }));
  await page.goto('/');
  await page.getByRole('button', { name: /Quora .*Open/ }).click();
  const site = page.locator('[data-sandbox-root]');
  const tasks = page.getByRole('toolbar', { name: 'Sandbox tasks' });
  await expect(tasks.getByRole('button', { name: /^Guide:/ })).toHaveCount(3);
  await expect(tasks.getByRole('button', { name: `Guide: ${spaceTask}`, exact: true })).toBeVisible();
  await expect(tasks.getByRole('button', { name: `Guide: ${notificationsTask}`, exact: true })).toBeVisible();
  await site.getByRole('button', { name: 'Spaces', exact: true }).click();
  await site.locator('.quora-feed').getByRole('button', { name: 'Open Business Space', exact: true }).click();
  await site.getByRole('button', { name: 'Ask a question in Business Space', exact: true }).click();
  await expect(site.locator('[data-node-id="question-audience"]')).toHaveText('Posting to: Business Space');
  await site.getByRole('textbox', { name: 'Question title', exact: true }).fill('How can I price my first product?');
  await site.getByRole('textbox', { name: 'Question details', exact: true }).fill('I am testing a fictional business idea and would like to learn about pricing.');
  await site.getByRole('button', { name: 'Publish demo question', exact: true }).click();
  await expect(site.locator('[data-node-id^="published-space-"]')).toHaveText('Published in Business Space');
  await site.getByRole('button', { name: 'Notifications', exact: true }).click();
  await site.getByRole('button', { name: 'Your content', exact: true }).click();
  await expect(site.getByRole('button', { name: 'Your content', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(site.locator('[data-node-id^="notification-text-"]')).toHaveCount(3);
  await expect(site.getByLabel('3 unread notifications')).toBeVisible();
  await site.locator('[data-node-id="notification-open-answer-business"]').click();
  await expect(site.locator('[data-node-id="title-my-business-question"]')).toContainText('first customers');
  await expect(site.getByLabel('2 unread notifications')).toBeVisible();
});

for (const scenario of [
  { task: notificationsTask, mode: 'Manual', actions: [{ type: 'click', id: 'notifications' }, { type: 'click', id: 'notifications-filter-content' }] },
  { task: spaceTask, mode: 'Manual', actions: [
    { type: 'click', id: 'spaces' }, { type: 'click', id: 'space-business' }, { type: 'click', id: 'ask-business' },
    { type: 'fill', id: 'question-title', value: 'How can I price my first product?' },
    { type: 'fill', id: 'question-body', value: 'I am testing a fictional business idea and would like to learn about pricing.' },
    { type: 'click', id: 'post-question' },
  ] },
  { task: spaceTask, mode: 'Auto', actions: [
    { type: 'click', id: 'spaces' }, { type: 'click', id: 'space-business' }, { type: 'click', id: 'ask-business' },
    { type: 'fill', id: 'question-title', value: 'Agent text that must never be inserted' },
    { type: 'fill', id: 'question-body', value: 'Agent details that must never be inserted' },
    { type: 'click', id: 'post-question' },
  ] },
]) {
  test(`${scenario.mode} Guide follows visible controls: ${scenario.task}`, async ({ page }) => {
    test.setTimeout(90000);
    await page.route('**/api/library', route => route.fulfill({ json: { library } }));
    let turn = 0;
    await page.route('**/api/agent', route => {
      const action = scenario.actions[turn++] || { type: 'finish' };
      return route.fulfill({ json: { instruction: `Next: ${action.type}`, action } });
    });
    await page.route('**/api/summarize', route => route.fulfill({ json: { answer: route.request().postDataJSON().outcome } }));
    await page.goto('/');
    await page.getByRole('button', { name: /Quora .*Open/ }).click();
    await page.getByRole('button', { name: scenario.mode, exact: true }).click();
    await page.getByRole('button', { name: `Guide: ${scenario.task}`, exact: true }).click();
    await expect(page.getByRole('button', { name: scenario.mode, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    for (const action of scenario.actions) {
      if (scenario.mode === 'Auto' && action.type !== 'fill' && action.id !== 'post-question') continue;
      if (scenario.mode === 'Manual' || action.type === 'fill') await expect(page.locator(`[data-guide-pointer][data-target-id="${action.id}"]`)).toBeVisible({ timeout: 30000 });
      const target = page.locator(`[data-sandbox-root] [data-node-id="${action.id}"]:visible`).first();
      if (action.type === 'fill') {
        await expect(target).toHaveValue('');
        await target.click();
        await expect(target).toHaveValue(''); // Focusing the field must not insert the proposed model text.
        const next = page.getByRole('alertdialog').getByRole('button', { name: 'Continue', exact: true });
        await target.fill('short');
        await expect(next).toBeDisabled();
        await target.fill(action.id === 'question-title' ? 'My own question about finding business customers?' : 'These are my own question details, typed by the person using this demo.');
        await expect(next).toBeEnabled();
        await next.click();
      } else await target.click();
    }
    await expect(page.getByTestId('guide-status')).toHaveText('Completed', { timeout: 30000 });
    const site = page.locator('[data-sandbox-root]');
    if (scenario.task === notificationsTask) {
      await expect(site.getByRole('button', { name: 'Your content', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await expect(site.getByLabel('3 unread notifications')).toBeVisible();
    } else {
      await expect(site.locator('[data-node-id^="published-space-"]')).toHaveText('Published in Business Space');
      await expect(site.locator('[data-node-id^="title-user-question-"]')).toHaveText('My own question about finding business customers?');
    }
  });
}
