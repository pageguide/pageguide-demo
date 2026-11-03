import { test, expect } from '@playwright/test';

test('website evidence uses soft peach and orange rather than yellow or blue', async ({ page }) => {
  await page.route('**/api/library', (r) => r.fulfill({ status: 503, json: {} }));
  await page.route('**/api/fetch', (r) => r.fulfill({ json: {
    url: 'https://example.org/article', title: 'Evidence styling',
    html: '<html><head></head><body><p data-pg-id="n1">First evidence with a <a href="https://example.org/source">source link</a>.</p><p data-pg-id="n2">Second evidence.</p></body></html>',
    blocks: [{ id: 'n1', type: 'paragraph', text: 'First evidence with a source link.' }, { id: 'n2', type: 'paragraph', text: 'Second evidence.' }],
  } }));
  await page.route('**/api/ask', (r) => r.fulfill({ json: { kind: 'find', answer: 'Two sources [1] [2].', citations: [{ id: 'n1', marker: '1' }, { id: 'n2', marker: '2' }], visual: null } }));
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Custom website URL' }).fill('https://example.org/article');
  await page.getByRole('button', { name: 'Open website', exact: true }).click();
  const frame = page.frameLocator('iframe');
  await expect(frame.locator('[data-pg-id="n1"]')).toBeVisible();
  await page.getByRole('textbox', { name: 'Message PageGuide' }).fill('/find show evidence');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(frame.locator('[data-pg-id="n1"]')).toHaveCSS('background-color', 'rgb(255, 230, 213)');
  await expect(frame.locator('[data-pg-id="n2"]')).toHaveCSS('background-color', 'rgb(255, 245, 237)');
  await expect(frame.locator('a')).toHaveCSS('color', 'rgb(156, 79, 37)');
  await page.getByRole('button', { name: '[2]', exact: true }).click();
  await expect(frame.locator('[data-pg-id="n2"]')).toHaveCSS('background-color', 'rgb(255, 230, 213)');
  await expect(frame.locator('[data-pg-id="n1"]')).toHaveCSS('background-color', 'rgb(255, 245, 237)');
});
