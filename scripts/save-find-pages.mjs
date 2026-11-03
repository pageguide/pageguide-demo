// Refresh the three REAL-HTML snapshots through the app's sanitizer.
// Run `npm run dev`, then `node scripts/save-find-pages.mjs`.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import * as cheerio from 'cheerio';
const { articles } = JSON.parse(await readFile(new URL('../lib/library-seed.json', import.meta.url), 'utf8'));
const origin = process.env.PAGEGUIDE_LOCAL_ORIGIN || 'http://127.0.0.1:3000';
const assets = new Map();
async function asset(raw, base) {
  const url = new URL(raw, base).href;
  if (url.startsWith('data:')) return url;
  if (!/^https?:/.test(url)) return '';
  if (!assets.has(url)) assets.set(url, (async () => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return '';
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length > 2000000) return '';
      return `data:${res.headers.get('content-type')?.split(';')[0] || 'application/octet-stream'};base64,${bytes.toString('base64')}`;
    } catch { return ''; }
  })());
  return assets.get(url);
}
async function stylesheet(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Stylesheet unavailable: ${url}`);
  let css = (await res.text()).replace(/@import\s+(?:url\()?[^;]+;/gi, '');
  // Save CSS assets too, so the iframe does not wait for the original website.
  const matches = [...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)];
  const replacements = await Promise.all(matches.map(async (m) => [m[0], `url("${await asset(m[1], url)}")`]));
  for (const [before, after] of replacements) css = css.replaceAll(before, after);
  return css;
}
await mkdir(new URL('../public/saved/', import.meta.url), { recursive: true });
for (const article of articles.filter((a) => ['fetch-api', 'blue-sky', 'web-accessibility'].includes(a.id) && (!process.argv[2] || a.id === process.argv[2]))) {
  const response = await fetch(`${origin}/api/fetch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: article.source, refresh: true }) });
  if (!response.ok) throw new Error(`Capture failed: ${article.source}: ${await response.text()}`);
  const doc = await response.json();
  const $ = cheerio.load(doc.html);
  const styles = $('link[rel="stylesheet"]').toArray();
  await Promise.all(styles.map(async (el) => {
    const href = $(el).attr('href');
    if (href) $(el).replaceWith(`<style>${(await stylesheet(new URL(href, article.source).href)).replaceAll('</style', '<\\/style')}</style>`);
  }));
  $('link').remove();
  await Promise.all($('img').toArray().map(async (el) => {
    const raw = $(el).attr('src') || $(el).attr('data-src');
    if (raw) $(el).attr('src', await asset(raw, article.source));
    $(el).removeAttr('srcset').removeAttr('data-srcset').removeAttr('loading');
  }));
  $('source').remove();
  // Inline style assets are uncommon on these pages; prevent external font/image waits.
  $('style').each((_, el) => { $(el).text($(el).text().replace(/url\((?!["']?data:)[^)]+\)/gi, 'none')); });
  doc.html = $.html();
  doc.saved = true;
  doc.savedAt = new Date().toISOString();
  await writeFile(new URL(`../public/saved/${article.id}.json`, import.meta.url), JSON.stringify(doc));
  console.log(`Saved original HTML: ${article.id}, ${doc.blocks.length} blocks, ${Math.round(Buffer.byteLength(JSON.stringify(doc)) / 1024)} KiB`);
}
