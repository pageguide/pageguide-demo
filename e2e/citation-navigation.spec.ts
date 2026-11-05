import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { selectFindPassages, validCitationQuote } from '../lib/find-passages';
import { composeFindAnswer } from '../lib/find-answer';
import type { PageDoc } from '../lib/types';

test('long saved pages include and retrieve the actual Berlin Wall passage', () => {
  const doc = JSON.parse(gunzipSync(readFileSync('public/saved/cold-war.json.gz')).toString()) as PageDoc;
  const passage = doc.blocks.find((block) => block.text.includes('Berlin Wall in November 1989'));
  expect(passage).toBeDefined();
  expect(doc.blocks.indexOf(passage!)).toBeGreaterThan(220);
  const selected = selectFindPassages(doc.blocks, 'When did the Berlin Wall fall?');
  expect(selected.length).toBeLessThanOrEqual(180);
  expect(selected).toContainEqual(passage);
  expect(doc.html).toContain(`data-pg-id="${passage!.id}"`);
});

test('invented or misassigned quotes cannot become whole-block citations', () => {
  expect(validCitationQuote('The Cold War ended in 1991.', 'The Berlin Wall fell in 1989.')).toBe(false);
  expect(validCitationQuote('The wall fell in November 1989.', 'the wall fell in November 1989.')).toBe(true);
  expect(validCitationQuote('The Cold War ended in 1991.', undefined)).toBe(false);
  expect(composeFindAnswer([{ text: 'An unsupported date.', markers: ['1'] }], '', new Set())).toContain('couldn’t verify');
  expect(composeFindAnswer(undefined, 'An unsupported date [1]', new Set())).toContain('couldn’t verify');
});

test('repeated citation clicks scroll back and older answers restore their own quotes', async ({ page }) => {
  const text = 'The Berlin Wall fell in November 1989. The Cold War ended in 1991.';
  await page.route('**/api/fetch', (route) => route.fulfill({ json: {
    url: 'https://example.org/history', title: 'History',
    blocks: [{ id: 'n1', type: 'paragraph', text }],
    html: `<html><head></head><body><div style="height:1800px">Top</div><p data-pg-id="n1">${text}</p><div style="height:1800px">Bottom</div></body></html>`,
  } }));
  let turn = 0;
  await page.route('**/api/ask', (route) => {
    const quote = turn++ === 0 ? 'The Berlin Wall fell in November 1989.' : 'The Cold War ended in 1991.';
    return route.fulfill({ json: { kind: 'find', answer: `${quote} [1]`, citations: [{ id: 'n1', marker: '1', quote }], visual: null } });
  });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Search or enter website URL' }).fill('https://example.org/history');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  const frame = page.frameLocator('iframe');
  await expect(frame.locator('[data-pg-id="n1"]')).toBeAttached({ timeout: 20000 });
  const ask = async (question: string) => {
    await page.getByRole('textbox', { name: 'Message PageGuide' }).fill(question);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
  };
  await ask('When did the Berlin Wall fall?');
  const first = page.getByRole('button', { name: '[1]', exact: true }).first();
  await expect(first).toBeVisible();
  const highlighted = frame.locator('mark[data-pg-sfocus]');
  await expect(highlighted).toHaveText('The Berlin Wall fell in November 1989.');
  await frame.locator('body').evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await first.click();
  await expect.poll(() => frame.locator('[data-pg-id="n1"]').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight;
  })).toBe(true);
  await ask('When did the Cold War end?');
  await expect(page.getByRole('button', { name: '[1]', exact: true })).toHaveCount(2);
  await expect(highlighted).toHaveText('The Cold War ended in 1991.');
  await first.click();
  await expect(highlighted).toHaveText('The Berlin Wall fell in November 1989.');
});
