import { test, expect } from '@playwright/test';
import library from '../lib/library-seed.json';

test.beforeEach(async ({ page }) => {
  test.setTimeout(90000);
  await page.route('**/api/library', route => route.fulfill({ json: { library } }));
  await page.route('**/api/summarize', route => route.fulfill({ json: { answer: route.request().postDataJSON().outcome } }));
});

for (const cancel of [false, true]) {
  test(cancel ? 'cancel a paused run without executing its pending response' : 'pause holds an in-flight response and resume continues the same task', async ({ page }) => {
    let requests = 0;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/agent', async route => {
      const turn = ++requests;
      if (turn === 1) await gate;
      await route.fulfill({ json: turn === 1
        ? { instruction: 'Add oranges.', action: { type: 'click', id: 'add-oranges' } }
        : { instruction: 'Cart contains oranges.', action: { type: 'finish' } } }).catch(() => {});
    });
    await page.goto('/');
    await page.getByRole('button', { name: /Amazon .*Open/ }).click();
    await page.getByRole('button', { name: 'Guide: Add oranges to my cart', exact: true }).click();
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect.poll(() => requests, { timeout: 30000 }).toBe(1);
    const controls = page.getByRole('group', { name: 'Guide task controls' });
    await controls.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(controls.getByRole('status')).toContainText('Paused');
    release();
    await page.waitForTimeout(600);
    const cart = page.locator('[data-sandbox-root]').getByRole('button', { name: 'Cart (0)', exact: true });
    await expect(cart).toBeVisible();
    expect(requests).toBe(1);
    if (cancel) {
      await controls.getByRole('button', { name: 'Cancel task', exact: true }).click();
      await expect(controls).toHaveCount(0);
      await expect(page.getByText('Task cancelled. Any completed steps have not been undone.', { exact: true })).toBeVisible();
      await page.waitForTimeout(400);
      await expect(cart).toBeEnabled();
      expect(requests).toBe(1);
    } else {
      await controls.getByRole('button', { name: 'Resume', exact: true }).click();
      await expect(page.locator('[data-sandbox-root]').getByRole('button', { name: 'Cart (1)', exact: true })).toBeVisible({ timeout: 30000 });
      await expect(page.getByText('Completed', { exact: true })).toBeVisible({ timeout: 30000 });
      expect(requests).toBe(2);
    }
  });
}
