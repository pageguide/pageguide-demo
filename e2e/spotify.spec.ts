import { test, expect } from '@playwright/test';
import library from '../lib/library-seed.json';
import { applySandboxAction, initialSandbox, sandboxDoc, sandboxSite, sandboxUrl, routeSandbox, stateUrl, verifySandboxTask, actionRisk, type SandboxState } from '../lib/sandboxes';

const premiumTask = 'Change Spotify plan: upgrade to Premium';
const visibilityTask = 'Hide and unhide songs & artists on Spotify';
const discordTask = 'Listen to music on Spotify with friends on Discord';
const click = (state: SandboxState, id: string) => applySandboxAction(state, { type: 'click', id }, library).state;

test('Spotify uses the same tracks and a compatible session with a new Spotify origin', () => {
  const state = initialSandbox('soundcloud');
  expect(sandboxUrl(state.site)).toBe('https://spotify.pageguide.test/');
  expect(sandboxSite('https://spotify.pageguide.test/preferences')).toBe(state.site);
  expect(sandboxSite('https://soundcloud.pageguide.test/')).toBe(state.site);
  const doc = sandboxDoc(state, library);
  expect(doc.title).toBe('Spotify sandbox');
  for (const id of ['midnight', 'summer', 'greenroom']) expect(doc.blocks.some(block => block.id === `play-${id}`)).toBe(true);
});

test('Premium upgrade requires review and confirmation without billing details', () => {
  const start = initialSandbox('soundcloud');
  let state = click(click(start, 'account'), 'plans');
  expect(() => click(state, 'confirm-premium')).toThrow();
  state = click(state, 'select-premium');
  expect(verifySandboxTask(premiumTask, state, library, start).completed).toBe(false);
  expect(actionRisk({ type: 'click', id: 'confirm-premium' })?.kind).toBe('buy');
  state = click(state, 'confirm-premium');
  expect(verifySandboxTask(premiumTask, state, library, start).completed).toBe(true);
  expect(sandboxDoc(state, library).blocks.find(block => block.id === 'premium-confirmation')?.text).toContain('No real subscription or charge');
  expect(start.spotifyPlan).toBe('Free');
  expect(() => click(state, 'confirm-premium')).toThrow();
});

test('hidden tracks and blocked artists cannot play, and both can be restored', () => {
  const start = initialSandbox('soundcloud');
  let state = click(click(start, 'play-midnight'), 'preferences');
  state = click(state, 'hide-track-midnight');
  expect(state.soundPlaying).toBe(false);
  expect(() => click(state, 'play-midnight')).toThrow();
  state = click(click(state, 'unhide-track-midnight'), 'hide-artist-nova');
  expect(() => click(state, 'play-midnight')).toThrow();
  expect(verifySandboxTask(visibilityTask, state, library, start).completed).toBe(false);
  state = click(state, 'unhide-artist-nova');
  expect(verifySandboxTask(visibilityTask, state, library, start).completed).toBe(true);
  expect(state.hiddenTracks).toEqual([]);
  expect(state.hiddenArtists).toEqual([]);
  expect(start.visibilityHistory).toEqual([]);
  state = click(click(state, 'home'), 'play-midnight');
  expect(state.soundPlaying).toBe(true);
});

test('Discord walkthrough requires a Jam, shared invite and simulated joining, not real integration', () => {
  const start = initialSandbox('soundcloud');
  let state = click(start, 'jam');
  expect(() => click(state, 'start-jam')).toThrow();
  expect(sandboxDoc(routeSandbox(state, 'https://spotify.pageguide.test/discord', library), library).blocks.some(b => b.id === 'discord-connect')).toBe(false);
  for (const id of ['play-midnight', 'start-jam', 'share-jam', 'open-discord', 'discord-connect', 'discord-send-invite']) state = click(state, id);
  expect(verifySandboxTask(discordTask, state, library, start).completed).toBe(false);
  state = click(state, 'simulate-friend-join');
  expect(verifySandboxTask(discordTask, state, library, start).completed).toBe(true);
  expect(state.spotifyPlan).toBe('Free');
  expect(sandboxDoc(state, library).blocks.find(b => b.id === 'jam-confirmation')?.text).toContain('No real Discord connection');
  const restored = routeSandbox(state, stateUrl(state), library);
  expect(restored.view).toBe('discord');
  expect(restored.selected).toBe('midnight');
});

test('Spotify UI plays the original audio and supports Premium, preferences, and demo Discord', async ({ page }) => {
  test.setTimeout(90000);
  await page.route('**/api/library', route => route.fulfill({ json: { library } }));
  await page.goto('/');
  await page.getByRole('region', { name: 'Guide interactive websites' }).getByRole('button', { name: 'More examples', exact: true }).click();
  await page.getByRole('button', { name: /^Spotify/ }).click();
  const site = page.locator('[data-sandbox-root]');
  await expect(site.getByLabel('Spotify', { exact: true })).toBeVisible();
  await expect(page.getByRole('toolbar', { name: 'Sandbox tasks' }).getByRole('button', { name: /^Guide:/ })).toHaveCount(3);
  await site.getByRole('button', { name: 'Play Midnight Signals', exact: true }).first().click();
  const audio = site.locator('audio');
  await expect(audio).toHaveAttribute('src', '/sandbox/midnight.wav');
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime), { timeout: 15000 }).toBeGreaterThan(0);
  await site.getByRole('button', { name: 'Explore Premium', exact: true }).first().click();
  await site.getByRole('button', { name: 'Select Premium Individual', exact: true }).click();
  await site.getByRole('button', { name: 'Confirm demo Premium upgrade', exact: true }).click();
  await expect(site.locator('[data-node-id="premium-confirmation"]')).toContainText('Premium active');
  await site.getByRole('button', { name: 'Content preferences', exact: true }).click();
  await site.getByRole('button', { name: 'Hide Midnight Signals', exact: true }).click();
  await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
  await site.getByRole('button', { name: 'Unhide Midnight Signals', exact: true }).click();
  await site.getByRole('button', { name: 'Block Nova Vale', exact: true }).click();
  await site.getByRole('button', { name: 'Unblock Nova Vale', exact: true }).click();
  await site.getByRole('button', { name: 'Listen with friends', exact: true }).click();
  await site.getByRole('button', { name: 'Play Midnight Signals', exact: true }).first().click();
  for (const name of ['Start a demo Jam', 'Create demo share link', 'Open demo Discord', 'Connect demo Discord account', 'Send demo invite to #listening-room', 'Simulate Alex Demo joining']) await site.getByRole('button', { name, exact: true }).click();
  await expect(site.locator('[data-node-id="jam-confirmation"]')).toContainText('Alex Demo joined');
  await expect(site.getByRole('region', { name: 'Demo Discord channel' })).toBeVisible();
});
