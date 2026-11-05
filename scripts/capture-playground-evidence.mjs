// Capture the actual supporting passage from the bundled long-form Cold War page.
// Run with the dev server available: node scripts/capture-playground-evidence.mjs
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
  await page.goto(process.env.PLAYGROUND_URL || 'http://127.0.0.1:3000');
  await page.getByRole('region', { name: 'Find saved websites' }).getByRole('button', { name: /Cold War/ }).click();
  const passage = page.frameLocator('iframe').locator('#mwC9M');
  await passage.waitFor({ state: 'visible' });
  await passage.evaluate((element) => {
    const quote = 'The tidal wave of change culminated with the fall of the Berlin Wall in November 1989, which symbolized the collapse of European communist governments and graphically ended the Iron Curtain divide of Europe.';
    if (!element.textContent.startsWith(quote)) throw new Error('Saved evidence passage changed; verify the example before recapturing.');
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let remaining = quote.length;
    let node;
    const range = document.createRange();
    range.setStart(element, 0);
    while ((node = walker.nextNode())) {
      if (remaining <= node.textContent.length) {
        range.setEnd(node, remaining);
        break;
      }
      remaining -= node.textContent.length;
    }
    const highlight = document.createElement('mark');
    highlight.style.cssText = 'background:#fff0a8;color:inherit;';
    highlight.append(range.extractContents());
    range.insertNode(highlight);
    // Annotation only: preserve the original paragraph, links, and typography.
    element.style.cssText += ';clear:both;max-width:640px;border:2px solid #f58232;border-radius:6px;padding:12px;background:white;color:#202122;';
  });
  await mkdir('public/examples', { recursive: true });
  await passage.screenshot({ path: 'public/examples/cold-war-berlin-wall-evidence.png' });
  console.log('Saved public/examples/cold-war-berlin-wall-evidence.png');

  await page.getByRole('button', { name: 'Open library', exact: true }).click();
  await page.getByRole('region', { name: 'Guide interactive websites' }).getByRole('button', { name: /Amazon .*Open/ }).click();
  const store = page.locator('[data-sandbox-root]');
  await store.getByRole('button', { name: 'Add fresh oranges to cart', exact: true }).click();
  await store.getByRole('button', { name: 'Cart (1)', exact: true }).click();
  await store.getByText('Subtotal: $4.99', { exact: true }).waitFor({ state: 'attached' });
  const cart = store.locator('.az-cart-page');
  await cart.locator('.az-product-image img').evaluate((image) => image.decode());
  await cart.evaluate((element) => {
    element.style.cssText += ';border:2px solid #f58232;border-radius:6px;';
    const quantity = element.querySelector('.az-quantity');
    if (quantity) quantity.style.background = '#fff0a8';
    const subtotal = element.querySelector('.az-cart-summary h2');
    if (subtotal) subtotal.style.background = '#fff0a8';
  });
  await cart.screenshot({ path: 'public/examples/amazon-oranges-cart-evidence.png' });
  console.log('Saved public/examples/amazon-oranges-cart-evidence.png');
} finally {
  await browser.close();
}
