import { test, expect } from '@playwright/test';
import library from '../lib/library-seed.json';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/library', route => route.fulfill({ json: { library, source: 'bundled' } }));
});

test('playground shows the supplied Find image and playable Guide video', async ({ page }) => {
  await page.goto('/');
  const find = page.getByRole('region', { name: 'Find saved websites' });
  const guide = page.getByRole('region', { name: 'Guide interactive websites' });
  await expect(find.getByText('The agent finds information and returns answer with evidence on the page.')).toBeVisible();
  await expect(guide.getByText('The agent navigates the website and completes your goal.')).toBeVisible();
  await expect(guide.getByText('Agent runs the steps')).toBeVisible();
  await expect(guide.getByText('You approve each step')).toBeVisible();
  const findImage = find.getByRole('img');
  const formats = guide.getByRole('group', { name: 'Guide example format' });
  await expect(formats.getByRole('button', { name: 'GIF', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const gif = guide.getByRole('img');
  await expect(gif).toHaveAttribute('src', '/demo-media/guide-latest.gif?v=latest-c4b21506');
  await expect.poll(() => gif.evaluate((element: HTMLImageElement) => element.naturalWidth), { timeout: 20000 }).toBe(1920);
  await formats.getByRole('button', { name: 'Video', exact: true }).click();
  const video = guide.getByLabel('Guide demonstration video', { exact: true });
  await expect(findImage).toHaveAttribute('src', '/examples/find-anchored-evidence.png');
  await expect(findImage).toBeVisible();
  await expect.poll(() => findImage.evaluate((element: HTMLImageElement) => element.naturalWidth), { timeout: 20000 }).toBeGreaterThan(0);
  await expect(video.locator('source').first()).toHaveAttribute('src', '/demo-media/guide-latest.mp4?v=latest-c4b21506');
  await expect(video.locator('source').nth(1)).toHaveAttribute('src', '/demo-media/guide-latest.webm?v=latest-c4b21506');
  await expect(video).toHaveAttribute('controls', '');
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState), { timeout: 20000 }).toBeGreaterThanOrEqual(1);
  expect(await video.evaluate((element: HTMLVideoElement) => element.duration)).toBeCloseTo(21.83, 0);
  await video.evaluate((element: HTMLVideoElement) => element.play());
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime), { timeout: 10000 }).toBeGreaterThan(0.1);
  await video.evaluate((element: HTMLVideoElement) => element.pause());
  expect(await video.evaluate((element: HTMLVideoElement) => element.muted)).toBe(true);
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.textTracks[0]?.mode)).toBe('showing');
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.textTracks[0]?.cues?.length || 0)).toBeGreaterThan(0);
  await expect(page.getByRole('textbox', { name: 'Search or enter website URL' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Go', exact: true })).toHaveCount(0);
  await expect(page.locator('.library-card')).toHaveCount(8);
  await expect(find.locator('.library-card').first()).toContainText('Roman Empire');
  const colors = await page.locator('.library-card').getByText('Open →', { exact: true }).evaluateAll(labels => labels.map(label => getComputedStyle(label).color));
  expect(new Set(colors).size).toBe(1);
});

test('media examples and website rows align and fit on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const find = page.getByRole('region', { name: 'Find saved websites' });
  const guide = page.getByRole('region', { name: 'Guide interactive websites' });
  const left = await find.locator('figure').boundingBox();
  const right = await guide.locator('figure').boundingBox();
  expect(left!.y).toBeCloseTo(right!.y, 0);
  expect(left!.height).toBeCloseTo(right!.height, 0);
  const modes = await guide.locator('dl').boundingBox();
  expect(modes!.y + modes!.height).toBeLessThan(right!.y);
  const shelf = page.locator('.pg-scroll').filter({ has: find });
  const dimensions = await shelf.evaluate(element => ({ content: element.scrollHeight, viewport: element.clientHeight }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  for (let i = 0; i < 4; i++) {
    const a = await find.locator('.library-card').nth(i).boundingBox();
    const b = await guide.locator('.library-card').nth(i).boundingBox();
    expect(a!.y).toBeCloseTo(b!.y, 0);
    expect(a!.height).toBeCloseTo(b!.height, 0);
  }
});

for (const mode of ['Find', 'Guide'] as const) {
  test(`${mode} media opens an overlay and closes with Escape or the close button`, async ({ page }) => {
    await page.goto('/');
    if (mode === 'Guide') await page.getByRole('button', { name: 'Video', exact: true }).click();
    const button = page.getByRole('button', { name: `Enlarge ${mode} example`, exact: true });
    await button.click();
    const overlay = page.getByRole('dialog', { name: `${mode} example`, exact: true });
    await expect(overlay).toBeVisible();
    const media = mode === 'Find' ? overlay.getByRole('img') : overlay.getByLabel('Guide demonstration video', { exact: true });
    await expect(mode === 'Find' ? media : media.locator('source').first()).toHaveAttribute('src', mode === 'Find' ? '/examples/find-anchored-evidence.png' : '/demo-media/guide-latest.mp4?v=latest-c4b21506');
    if (mode === 'Guide') {
      expect(await media.evaluate((element: HTMLVideoElement) => element.muted)).toBe(false);
      await expect(media.locator('track')).toHaveAttribute('src', '/examples/guide-demo.en.vtt');
      await expect.poll(() => media.evaluate((element: HTMLVideoElement) => element.textTracks[0]?.mode)).toBe('showing');
    }
    await page.keyboard.press('Escape');
    await expect(overlay).toHaveCount(0);
    await expect(button).toBeFocused();
    await button.click();
    await overlay.getByRole('button', { name: 'Close example' }).click();
    await expect(overlay).toHaveCount(0);
  });
}
