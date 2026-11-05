import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('deployment copies contain real binary media rather than Git LFS pointers', () => {
  for (const file of ['guide-latest.mp4', 'guide-latest.webm', 'guide-latest.gif']) {
    const data = readFileSync(`public/demo-media/${file}`);
    expect(data.length).toBeGreaterThan(100000);
    expect(data.subarray(0, 128).toString()).not.toContain('version https://git-lfs');
  }
});

test('demo video supports metadata, byte ranges, and invalid range responses', async ({ request }) => {
  const redirect = await request.get('/api/demo-video?format=gif', { maxRedirects: 0 });
  expect(redirect.status()).toBe(307);
  expect(redirect.headers().location).toContain('/demo-media/guide-latest.gif');
  const head = await request.head('/demo-media/guide-latest.mp4');
  expect(head.status()).toBe(200);
  expect(head.headers()['content-type']).toBe('video/mp4');
  expect(head.headers()['accept-ranges']).toBe('bytes');
  const size = Number(head.headers()['content-length']);
  expect(size).toBeGreaterThan(100000);
  const range = await request.get('/demo-media/guide-latest.mp4', { headers: { Range: 'bytes=4-11' } });
  expect(range.status()).toBe(206);
  expect(range.headers()['content-range']).toBe(`bytes 4-11/${size}`);
  expect((await range.body()).subarray(0, 4).toString()).toBe('ftyp');
  const suffix = await request.get('/demo-media/guide-latest.mp4', { headers: { Range: 'bytes=-16' } });
  expect(suffix.status()).toBe(206);
  expect((await suffix.body()).length).toBe(16);
  const invalid = await request.get('/demo-media/guide-latest.mp4', { headers: { Range: `bytes=${size}-` } });
  expect(invalid.status()).toBe(416);
  expect(invalid.headers()['content-range']).toBe(`bytes */${size}`);
  const gif = await request.get('/demo-media/guide-latest.gif', { headers: { Range: 'bytes=0-9' } });
  expect(gif.headers()['content-type']).toBe('image/gif');
  const header = await gif.body();
  expect(header.subarray(0, 3).toString()).toBe('GIF');
  expect(header.readUInt16LE(6)).toBe(1920);
  expect(header.readUInt16LE(8)).toBe(1080);
});
