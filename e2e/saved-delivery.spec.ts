import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import files from '../lib/saved-files.json';
import manifest from '../lib/saved-manifest.json';
import library from '../lib/library-seed.json';

test('all delivery copies are generated from the six repository originals and match their versions', async () => {
  for (const [id, filename] of Object.entries(files)) {
    const bytes = await readFile(`public/saved/${id}.json.gz`);
    const serialized = gunzipSync(bytes).toString('utf8');
    const doc = JSON.parse(serialized);
    const info = manifest[id as keyof typeof manifest];
    expect(doc.sourceFile).toBe(`save-webpage/${filename}`);
    expect(info.sourceFile).toBe(doc.sourceFile);
    expect(info.bytes).toBe(bytes.length);
    expect(info.version).toBe(createHash('sha256').update(serialized).digest('hex').slice(0, 16));
    expect(doc.html).not.toMatch(/<script[\s>]/i);
    expect(doc.saved).toBe(true);
  }
  expect(manifest['fetch-api'].bytes).toBeLessThan(350000);
  expect(manifest['web-accessibility'].bytes).toBeLessThan(250000);
});

test('Fetch API opens directly from static delivery, bypassing fetch and saved API functions', async ({ page }) => {
  await page.route('**/api/library', (r) => r.fulfill({ json: { library } }));
  let dynamicRequests = 0;
  await page.route(/\/api\/(fetch|saved)(\/|\?|$)/, (r) => { dynamicRequests++; return r.abort(); });
  await page.goto('/');
  await page.getByRole('region', { name: 'Find saved websites' }).getByRole('button').filter({ hasText: 'Fetch API' }).click();
  await expect(page.frameLocator('iframe').locator('h1').first()).toContainText('Fetch API', { timeout: 15000 });
  expect(dynamicRequests).toBe(0);
  await page.getByRole('button', { name: 'Refresh page', exact: true }).click();
  await expect(page.frameLocator('iframe').locator('h1').first()).toContainText('Fetch API');
  expect(dynamicRequests).toBe(0);
});

test('static assets advertise compression and long-lived caching', async ({ request }) => {
  const res = await request.get(`/saved/fetch-api.json.gz?v=${manifest['fetch-api'].version}`);
  expect(res.ok()).toBe(true);
  expect(res.headers()['content-encoding']).toBe('gzip');
  expect(res.headers()['cache-control']).toContain('immutable');
  expect((await res.json()).sourceFile).toBe(`save-webpage/${files['fetch-api']}`);
});
