import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { extractPage } from '../lib/extract-page';
import { sourceQuote } from '../lib/find-citations';
import type { PageDoc } from '../lib/types';

const url = new URL('https://example.org/article');
const quote = 'His strength and jumping ability, combined with his heading accuracy and height of 1.87 m, give him an edge in winning aerial duels.';
const html = `<html><head><title>Article</title></head><body><article><p>His strength and jumping ability, combined with his heading accuracy and height of <style>.frac { font-size: 80%; white-space: nowrap; }</style><span>1.87 m</span>, give him an edge in winning aerial duels.</p></article></body></html>`;

test('embedded CSS stays in the displayed HTML, not in extracted article text', () => {
  const doc = extractPage(html, url);
  const block = doc.blocks.find(block => block.type === 'paragraph')!;
  expect(block.text).toBe(quote);
  expect(sourceQuote(block.text, quote)).toBe(quote);
  expect(doc.html).toContain('.frac { font-size: 80%; white-space: nowrap; }');
  expect(doc.html).toContain(`data-pg-id="${block.id}"`);
});

test('cleaning applies to headings, list items, quotes, buttons and figure captions', () => {
  const doc = extractPage(`<html><body><main><h1>Heading<style>.bad{color:red}</style> text</h1><ul><li>List<style>.bad{color:red}</style> item</li></ul><blockquote>Quoted<style>.bad{color:red}</style> text</blockquote><button>Click<style>.bad{color:red}</style> me</button><figure><img src="https://example.org/photo.jpg"><figcaption>Picture<style>.bad{color:red}</style> caption</figcaption></figure></main></body></html>`, url);
  expect(doc.blocks.some(block => block.text.includes('.bad'))).toBe(false);
  expect(doc.blocks.find(block => block.type === 'image')?.text).toBe('Picture caption');
});

test('regenerated Ronaldo paragraph supports the clean aerial-duels quotation', () => {
  const doc = JSON.parse(gunzipSync(readFileSync('public/saved/ronaldo.json.gz')).toString()) as PageDoc;
  const block = doc.blocks.find(block => block.type === 'paragraph' && block.text.startsWith('His strength and jumping ability'))!;
  expect(block).toBeDefined();
  expect(block.text).not.toContain('.mw-parser-output');
  expect(sourceQuote(block.text, 'His strength and jumping ability, combined with his elevation, heading accuracy and height of 1.87 m (6 ft 1+1⁄2 in), give him an edge in winning aerial duels.')).not.toBeNull();
});

test('citation highlighting matches visible text across an embedded style element', async ({ page }) => {
  const doc = extractPage(html, url);
  const block = doc.blocks.find(block => block.type === 'paragraph')!;
  await page.route('**/api/fetch', route => route.fulfill({ json: doc }));
  await page.route('**/api/ask', route => route.fulfill({ json: { kind: 'find', answer: 'His jumping and heading support aerial duels. [1]', citations: [{ marker: '1', id: block.id, quote }], visual: null } }));
  await page.goto('/');
  const composer = page.getByRole('textbox', { name: 'Message PageGuide' });
  await composer.fill('/open https://example.org/article');
  await composer.press('Enter');
  const frame = page.frameLocator('iframe');
  await expect(frame.locator('p')).toBeVisible();
  await composer.fill('What helps him win aerial duels?');
  await composer.press('Enter');
  await expect(page.getByRole('button', { name: '[1]', exact: true })).toBeVisible();
  await expect.poll(async () => (await frame.locator('mark[data-pg-mark]').allTextContents()).join('')).toBe(quote);
  expect(await frame.locator('style').evaluateAll(styles => styles.some(style => style.textContent?.includes('.frac')))).toBe(true);
});
