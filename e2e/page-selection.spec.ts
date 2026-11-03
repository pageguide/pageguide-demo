import { test, expect } from '@playwright/test';
import { pageWithSelection } from '../lib/page-selection';
import { composeFindAnswer } from '../lib/find-answer';
import type { PageDoc } from '../lib/types';

const text = 'Light with shorter wavelengths scatters more strongly in the atmosphere.';
const doc: PageDoc = {
  url: 'https://example.org/scattering', title: 'Scattering notes',
  html: `<html><body><h1>Scattering notes</h1><p data-pg-id="n1">A page about scattering.</p><p id="late">${text}</p></body></html>`,
  blocks: [{ id: 'n1', type: 'paragraph', text: 'A page about scattering.' }],
};

test('claim citations are placed after each supported claim, not grouped into a footer', () => {
  const result = composeFindAnswer([
    { text: 'Rayleigh scattering affects short wavelengths.', markers: ['1'] },
    { text: 'It helps explain the blue sky.', markers: ['2', '2', 'fake'] },
    { text: 'It also relates to sunset colors.', markers: ['1'] },
  ], '', new Set(['1', '2']));
  expect(result).toBe('Rayleigh scattering affects short wavelengths. [1] It helps explain the blue sky. [2] It also relates to sunset colors. [1]');
  expect(composeFindAnswer(undefined, 'An existing inline [1] answer.', new Set(['1']))).toBe('An existing inline [1] answer.');
});

test('selection context cannot carry over to a different page', () => {
  expect(pageWithSelection(doc, { id: 'selection', text, url: 'https://other.example/' })).toBe(doc);
  const contextual = pageWithSelection(doc, { id: 'selection', text, url: doc.url });
  expect(contextual.blocks[0]).toEqual({ id: 'selection', type: 'quote', text });
  expect(doc.blocks).toHaveLength(1);
});

test('highlighting original HTML adds removable selection context and sends the exact passage', async ({ page }) => {
  await page.route('**/api/library', (r) => r.fulfill({ status: 503, json: {} }));
  await page.route('**/api/fetch', (r) => r.fulfill({ json: doc }));
  const requests: any[] = [];
  await page.route('**/api/ask', (r) => {
    const body = r.request().postDataJSON();
    requests.push(body);
    return r.fulfill({ json: { kind: 'find', answer: 'Shorter wavelengths scatter strongly [1].', citations: [{ marker: '1', id: body.selection?.id || 'n1', quote: body.selection?.text || doc.blocks[0].text }], visual: null } });
  });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Custom website URL' }).fill(doc.url);
  await page.getByRole('button', { name: 'Open website', exact: true }).click();
  const frame = page.frameLocator('iframe');
  await expect(frame.locator('#late')).toBeVisible();
  await frame.locator('#late').evaluate((el) => {
    const range = el.ownerDocument.createRange(); range.selectNodeContents(el);
    const selection = el.ownerDocument.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    el.ownerDocument.dispatchEvent(new Event('mouseup'));
  });
  const chip = page.getByRole('complementary', { name: 'Selected text context' });
  await expect(chip).toContainText(text);
  const composer = page.getByRole('textbox', { name: 'Message PageGuide' });
  await composer.fill('Explain this passage');
  await expect(chip).toBeVisible();
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('Shorter wavelengths scatter strongly', { exact: false })).toBeVisible();
  expect(requests[0].question).toBe('Explain this passage');
  expect(requests[0].selection.text).toBe(text);
  expect(requests[0].doc.blocks[0].text).toBe(text);
  expect(requests[0].doc.html).toBeUndefined();
  await expect(frame.locator('#late mark[data-pg-focus]')).toBeVisible();
  await page.getByRole('button', { name: 'Remove selected text', exact: true }).click();
  await expect(chip).toHaveCount(0);
  await composer.fill('/find What is the page about?');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1].selection).toBeUndefined();
  expect(requests[1].doc.blocks).toEqual(doc.blocks);
});
