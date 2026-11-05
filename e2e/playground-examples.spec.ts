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
  await expect(gif).toHaveAttribute('src', '/demo-media/guide-latest.gif?v=latest-fd99f8bb-15x');
  await expect(guide.getByText(/1.5×/)).toBeVisible();
  const sideCaptions = page.getByRole('complementary', { name: 'Side captions' });
  await expect(sideCaptions).toHaveCount(0);
  await expect.poll(() => gif.evaluate((element: HTMLImageElement) => element.naturalWidth), { timeout: 20000 }).toBe(1440);
  await formats.getByRole('button', { name: 'Video', exact: true }).click();
  const video = guide.getByLabel('Guide demonstration video', { exact: true });
  await expect(findImage).toHaveAttribute('src', '/examples/find-anchored-evidence.png');
  await expect(findImage).toBeVisible();
  await expect.poll(() => findImage.evaluate((element: HTMLImageElement) => element.naturalWidth), { timeout: 20000 }).toBeGreaterThan(0);
  await expect(video.locator('source').first()).toHaveAttribute('src', '/demo-media/guide-latest.mp4?v=latest-fd99f8bb');
  await expect(video.locator('source').nth(1)).toHaveAttribute('src', '/demo-media/guide-latest.webm?v=latest-fd99f8bb');
  await expect(video).toHaveAttribute('controls', '');
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState), { timeout: 20000 }).toBeGreaterThanOrEqual(1);
  expect(await video.evaluate((element: HTMLVideoElement) => element.duration)).toBeCloseTo(11.9, 0);
  await video.evaluate((element: HTMLVideoElement) => element.play());
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime), { timeout: 10000 }).toBeGreaterThan(0.1);
  await video.evaluate((element: HTMLVideoElement) => element.pause());
  expect(await video.evaluate((element: HTMLVideoElement) => element.muted)).toBe(true);
  await expect(video.locator('track')).toHaveCount(0);
  await expect(sideCaptions).toHaveCount(0);
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

for (const format of ['GIF', 'Video'] as const) {
  test(`${format} steps are hidden inline and clicking them seeks to the correct scene`, async ({ page }) => {
    await page.goto('/');
    if (format === 'Video') await page.getByRole('button', { name: 'Video', exact: true }).click();
    await expect(page.getByRole('complementary', { name: 'Side captions' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Enlarge Guide example', exact: true }).click();
    const overlay = page.getByRole('dialog', { name: 'Guide example', exact: true });
    const player = overlay.locator('video');
    await expect.poll(() => player.evaluate((video: HTMLVideoElement) => video.readyState), { timeout: 20000 }).toBeGreaterThanOrEqual(1);
    const captions = overlay.getByRole('complementary', { name: 'Side captions' });
    await expect(captions.getByRole('listitem')).toHaveCount(3);
    const scale = format === 'GIF' ? 1.5 : 1;
    const second = captions.getByRole('button', { name: 'Go to step 2: Search nearby cafés' });
    await second.focus();
    await second.press('Enter');
    await player.evaluate((video: HTMLVideoElement) => video.pause());
    await expect.poll(() => player.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThanOrEqual(6 / scale - .05);
    expect(await player.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeLessThan(6 / scale + 1);
    await expect(captions.locator('[aria-current="step"]')).toContainText('Search nearby cafés');
    await captions.getByRole('button', { name: 'Go to step 3: Show the café and evidence' }).click();
    await player.evaluate((video: HTMLVideoElement) => video.pause());
    await expect.poll(() => player.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThanOrEqual(10.3 / scale - .05);
    expect(await player.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeLessThan(10.3 / scale + 1);
    await expect(captions.locator('[aria-current="step"]')).toContainText('Show the café and evidence');
    await captions.getByRole('button', { name: 'Go to step 1: Open the museum map' }).click();
    await expect(captions.locator('[aria-current="step"]')).toContainText('Open the museum map');
    await overlay.getByRole('button', { name: 'Close example' }).click();
    await expect(page.getByRole('complementary', { name: 'Side captions' })).toHaveCount(0);
  });
}

for (const mode of ['Find', 'Guide'] as const) {
  test(`${mode} media opens an overlay and closes with Escape or the close button`, async ({ page }) => {
    await page.goto('/');
    if (mode === 'Guide') await page.getByRole('button', { name: 'Video', exact: true }).click();
    const button = page.getByRole('button', { name: `Enlarge ${mode} example`, exact: true });
    await button.click();
    const overlay = page.getByRole('dialog', { name: `${mode} example`, exact: true });
    await expect(overlay).toBeVisible();
    const media = mode === 'Find' ? overlay.getByRole('img') : overlay.getByLabel('Guide demonstration video', { exact: true });
    await expect(mode === 'Find' ? media : media.locator('source').first()).toHaveAttribute('src', mode === 'Find' ? '/examples/find-anchored-evidence.png' : '/demo-media/guide-latest.mp4?v=latest-fd99f8bb');
    if (mode === 'Guide') {
      expect(await media.evaluate((element: HTMLVideoElement) => element.muted)).toBe(false);
      await expect(media.locator('track')).toHaveCount(0);
      const captions = overlay.getByRole('complementary', { name: 'Side captions' });
      await expect(captions).toContainText('Ask PageGuide.');
      await expect(captions.getByRole('listitem')).toHaveCount(3);
      await media.evaluate((element: HTMLVideoElement) => { element.pause(); element.currentTime = 8; });
      await expect(captions.locator('[aria-current="step"]')).toContainText('Search nearby cafés');
      await media.evaluate((element: HTMLVideoElement) => { element.currentTime = 11; });
      await expect(captions.locator('[aria-current="step"]')).toContainText('Show the café and evidence');
      const videoBox = await media.boundingBox();
      const captionBox = await captions.boundingBox();
      expect(captionBox!.x).toBeGreaterThanOrEqual(videoBox!.x + videoBox!.width);
    }
    await page.keyboard.press('Escape');
    await expect(overlay).toHaveCount(0);
    await expect(button).toBeFocused();
    await button.click();
    await overlay.getByRole('button', { name: 'Close example' }).click();
    await expect(overlay).toHaveCount(0);
  });
}
