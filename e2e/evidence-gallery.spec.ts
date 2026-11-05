import { test, expect } from '@playwright/test';
import { evidenceForAnswer } from '../lib/evidence';
import library from '../lib/library-seed.json';
import type { Evidence } from '../lib/types';

test('gallery includes only cited named evidence, once, in answer order', () => {
  const saved: Evidence[] = ['field-filled', 'confirmation', 'receipt'].map((name, i) => ({ name, index: i + 1, imageUrl: 'data:image/png;base64,test' }));
  expect(evidenceForAnswer('Done [EV:receipt] [EV:confirmation] [EV:receipt] [EV:unknown].', saved).map((e) => e.name)).toEqual(['receipt', 'confirmation']);
  expect(evidenceForAnswer('Done, without a citation.', saved)).toEqual([]);
});

test('answer evidence starts collapsed, excludes intermediate captures, and fits narrow/wide panels', async ({ page }) => {
  test.setTimeout(60000);
  await page.route('**/api/library', (r) => r.fulfill({ json: { library } }));
  const actions = ['settings', 'language-spanish', 'save-language'];
  let turn = 0;
  await page.route('**/api/agent', (r) => {
    const id = actions[turn++];
    return r.fulfill({ json: {
      instruction: id ? `Perform ${id}` : 'Confirm the saved language',
      action: id ? { type: 'click', id } : { type: 'finish' },
      ...(id ? { evidence: { name: id === 'save-language' ? 'language-confirmation' : `intermediate-${id}`, description: id === 'save-language' ? 'Spanish is saved' : 'Intermediate action' } } : {}),
    } });
  });
  await page.route('**/api/summarize', (r) => {
    const data = r.request().postDataJSON();
    const proof = data.evidence.find((e: any) => e.name.startsWith('language-confirmation'));
    return r.fulfill({ json: { answer: `Spanish is saved. [EV:${proof.name}]` } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Quora .*Open/ }).click();
  await page.getByRole('button', { name: 'Guide: Change my language to Spanish', exact: true }).click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('Completed', { exact: true })).toBeVisible({ timeout: 20000 });
  const gallery = page.getByRole('region', { name: 'Saved evidence' });
  const toggle = gallery.getByRole('button', { name: 'Saved evidence (1)', exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(gallery.locator('img')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Screenshot evidence 3', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Screenshot evidence 1', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'View step 1: Perform settings', exact: true })).toBeVisible();

  await toggle.click();
  await expect(gallery.locator('img')).toHaveCount(1);
  await expect(gallery).not.toContainText('Saved at step');
  await expect(gallery).not.toContainText('intermediate');
  await expect(gallery).toContainText('language confirmation');
  for (const width of [320, 390, 1024, 1600]) {
    await page.setViewportSize({ width, height: 960 });
    const panel = page.getByRole('region', { name: 'PageGuide chat' });
    expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await page.locator('.pg-guide-card').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 320) expect(await gallery.locator('.pg-evidence-grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
  }
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(gallery.locator('img')).toHaveCount(0);
});
