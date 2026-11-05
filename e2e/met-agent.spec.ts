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

test('a stuck Met image capture times out instead of blocking the first agent request', async ({ page }) => {
  test.setTimeout(60000);
  await page.route('**/api/library', route => route.fulfill({ json: { library } }));
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let requests = 0;
  await page.route('**/api/agent', async route => {
    requests++;
    await gate;
    await route.abort().catch(() => {});
  });
  await page.goto('/');
  const loaded = page.waitForResponse(response => response.url().endsWith('/sandbox/met-floor-1.webp'));
  await page.getByRole('button', { name: /The Met Map .*Open/ }).click();
  await loaded;
  await page.route('**/sandbox/met-floor-1.webp', async route => { await gate; await route.abort().catch(() => {}); });
  await page.getByRole('button', { name: 'Guide: Open The Great Hall', exact: true }).click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('Capturing a page screenshot…', { exact: true })).toBeVisible();
  await expect.poll(() => requests, { timeout: 25000 }).toBe(1);
  await expect(page.getByText('Screenshot unavailable for this step.', { exact: true })).toBeVisible();
  await expect(page.locator('div[inert][aria-hidden="true"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel task', exact: true }).click();
  release();
});

test('Guide completes the replacement Met task and renders its state changes', async ({ page }) => {
  test.setTimeout(90000);
  let turn = 0;
  // Reproduce browsers that do not fire load events for detached SVG images.
  await page.addInitScript(() => {
    Object.defineProperty(SVGImageElement.prototype, 'onload', { configurable: true, get: () => null, set: () => {} });
  });
  await page.route('**/api/library', route => route.fulfill({ json: { library } }));
  await page.route('**/api/agent', route => {
    const request = route.request().postDataJSON();
    expect(request.doc.sandbox).toBe('met-map');
    return route.fulfill({ json: ++turn === 1
      ? { instruction: 'Open The Great Hall.', action: { type: 'click', id: 'room-great-hall' } }
      : { instruction: 'The requested gallery is open.', action: { type: 'finish' } } });
  });
  await page.route('**/api/summarize', route => route.fulfill({ json: { answer: route.request().postDataJSON().outcome } }));
  await page.goto('/');
  await page.getByRole('button', { name: /The Met Map .*Open/ }).click();
  await expect(page.getByRole('button', { name: 'Guide: Open the Temple of Dendur', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Guide: Open The Great Hall', exact: true }).click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.locator('[data-sandbox-root] .met-detail h1')).toHaveText('The Great Hall', { timeout: 30000 });
  await expect(page.getByText('Completed', { exact: true })).toBeVisible({ timeout: 45000 });
  // A timeout alone would advance the run but lose its screenshot. Verify the
  // SVG capture actually succeeds in the no-load-event browser scenario.
  await expect(page.getByRole('button', { name: 'View step 0: Initial state', exact: true })).toBeVisible();
  await expect(page.getByText('Screenshot unavailable for this step.', { exact: true })).toHaveCount(0);
});

test('Met verification reads directions, zoom, services and floors from sandbox state', () => {
  const act = (state: ReturnType<typeof initialSandbox>, id: string) => applySandboxAction(state, { type: 'click', id }, library).state;
  const start = initialSandbox('met-map');
  const done = (task: string, state: typeof start) => verifySandboxTask(task, state, library, start);

  const opened = act(start, 'room-temple');
  expect(done('Get directions to the Temple of Dendur', opened)).toMatchObject({ supported: true, completed: false });
  expect(done('Get directions to the Temple of Dendur', act(opened, 'directions')).completed).toBe(true);
  expect(done('Zoom in on the map', start)).toMatchObject({ supported: true, completed: false });
  expect(done('Zoom in on the map', act(start, 'zoom-in')).completed).toBe(true);

  // Listing services or opening one is not a route.
  const restrooms = act(start, 'amenity-restrooms');
  expect(done('Find a restroom', start).completed).toBe(false);
  expect(done('Find a restroom', restrooms).completed).toBe(true);
  const hall = act(restrooms, 'place-restroom-hall-1');
  expect(done('Find a restroom and get directions', hall).completed).toBe(false);
  expect(done('Find a restroom and get directions', act(hall, 'directions')).completed).toBe(true);

  const upstairs = act(start, 'floor-2');
  expect(done('Go from Floor 1 to Floor 2', upstairs).completed).toBe(true);
  expect(verifySandboxTask('Go from Floor 2 to Floor 1', act(upstairs, 'floor-1'), library, upstairs).completed).toBe(true);
});

test('the agent recovers from an invalid reply and a premature finish', async ({ page }) => {
  test.setTimeout(90000);
  const seen: any[][] = [];
  const replies = [
    { status: 422, json: { error: 'The agent proposed an unavailable control: room-title-arms.', retryable: true } },
    { status: 200, json: { instruction: 'Finish early.', action: { type: 'finish' } } },
    { status: 200, json: { instruction: 'Open Arms and Armor.', action: { type: 'click', id: 'room-arms' } } },
    { status: 200, json: { instruction: 'Done.', action: { type: 'finish' } } },
  ];
  await page.route('**/api/library', route => route.fulfill({ json: { library } }));
  await page.route('**/api/agent', route => {
    seen.push(route.request().postDataJSON().history);
    return route.fulfill(replies[seen.length - 1]);
  });
  await page.route('**/api/summarize', route => route.fulfill({ json: { answer: route.request().postDataJSON().outcome } }));
  await page.goto('/');
  await page.getByRole('button', { name: /The Met Map .*Open/ }).click();
  await page.locator('textarea').last().fill('Open Arms and Armor');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('Completed', { exact: true })).toBeVisible({ timeout: 60000 });
  await expect(page.locator('[data-sandbox-root] .met-detail h1')).toHaveText('Arms and Armor');
  expect(seen).toHaveLength(4);
  expect(seen[1][0].action).toBe('invalid');
  expect(seen[2][1].action).toBe('finish (rejected)');
});

test('a task typed after opening a Guide site runs the agent, and /guide overrides Find', async ({ page }) => {
  test.setTimeout(90000);
  let agent = 0, ask = 0;
  await page.route('**/api/library', route => route.fulfill({ json: { library } }));
  await page.route('**/api/ask', route => { ask++; return route.fulfill({ status: 500, json: { error: 'Find should not run.' } }); });
  await page.route('**/api/agent', route => { agent++; return route.fulfill({ json: { instruction: 'Done.', action: { type: 'finish' } } }); });
  await page.route('**/api/verify', route => route.fulfill({ json: { completed: true, reason: 'ok', answer: 'ok' } }));
  await page.route('**/api/summarize', route => route.fulfill({ json: { answer: 'ok' } }));
  await page.goto('/');
  await page.getByRole('button', { name: /The Met Map .*Open/ }).click();
  await expect(page.getByRole('button', { name: 'Auto', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const composer = page.locator('textarea').last();
  await composer.fill('Describe this map');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect.poll(() => agent, { timeout: 45000 }).toBeGreaterThan(0);
  await expect(page.getByText('Completed', { exact: true }).first()).toBeVisible({ timeout: 45000 });

  agent = 0;
  await page.getByRole('button', { name: 'Find', exact: true }).click();
  await composer.fill('/guide Describe this map again');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect.poll(() => agent, { timeout: 45000 }).toBeGreaterThan(0);
  expect(ask).toBe(0);
});

test('the agent stops looping once the task is done or when it makes no progress', async ({ page }) => {
  test.setTimeout(120000);
  let script: object[] = [], requests = 0;
  await page.route('**/api/library', route => route.fulfill({ json: { library } }));
  await page.route('**/api/agent', route => route.fulfill({ json: script[Math.min(requests++, script.length - 1)] }));
  await page.route('**/api/summarize', route => route.fulfill({ json: { answer: route.request().postDataJSON().outcome } }));
  const run = async (task: string, status: string) => {
    await page.locator('textarea').last().fill(task);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByText(status, { exact: true }).last()).toBeVisible({ timeout: 45000 });
  };
  await page.goto('/');
  await page.getByRole('button', { name: /The Met Map .*Open/ }).click();

  script = [{ instruction: 'Open Arms and Armor.', action: { type: 'click', id: 'room-arms' } }];
  await run('Open Arms and Armor', 'Completed');
  expect(requests).toBe(2);
  await expect(page.locator('[data-sandbox-root] .met-detail h1')).toHaveText('Arms and Armor');

  requests = 0;
  script = [{ instruction: 'Switch floors.', action: { type: 'click', id: 'floor-2' } }];
  await run('Open Musical Instruments', 'Incomplete');
  expect(requests).toBe(3);
  await expect(page.getByText(/kept repeating/).first()).toBeVisible();
});
