import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { extractPage } from './extract-page';
import { LOCAL_LIBRARY } from './library';
import type { PageDoc } from './types';

const FILES: Record<string, string> = {
  'cold-war': 'Cold War - Wikipedia (11_3_2026 11：37：00 AM).html',
  manhattan: 'Manhattan - Wikipedia (11_3_2026 11：36：47 AM).html',
  'roman-empire': 'Roman Empire - Wikipedia (11_3_2026 11：36：36 AM).html',
};
// Deduplicate concurrent reads/parses. Full HTML remains server-side until requested.
const cache = new Map<string, Promise<PageDoc>>();
export function loadSavedPage(id: string): Promise<PageDoc> {
  if (!LOCAL_LIBRARY.articles.some((a) => a.id === id)) throw new Error('Unknown saved page.');
  if (!cache.has(id)) cache.set(id, (async () => {
    if (!Object.prototype.hasOwnProperty.call(FILES, id)) {
      const snapshot = JSON.parse(await readFile(path.join(process.cwd(), 'public', 'saved', `${id}.json`), 'utf8')) as PageDoc;
      if (!snapshot.html || !snapshot.saved) throw new Error('Invalid saved HTML snapshot.');
      return snapshot;
    }
    try {
      const bytes = await readFile(path.join(process.cwd(), 'public', 'saved', `${id}.json.gz`));
      return JSON.parse(gunzipSync(bytes).toString('utf8')) as PageDoc;
    } catch { /* Regeneration fallback for local development. */ }
    const html = await readFile(path.join(process.cwd(), 'save-webpage', FILES[id]), 'utf8');
    if (html.startsWith('version https://git-lfs.github.com/spec/v1')) throw new Error('Saved HTML is a Git LFS pointer. Run git lfs pull, then restart the server.');
    const article = LOCAL_LIBRARY.articles.find((a) => a.id === id)!;
    const doc = extractPage(html, new URL(article.source));
    return { ...doc, saved: true };
  })().catch((error) => { cache.delete(id); throw error; }));
  return cache.get(id)!;
}

export async function loadSavedGzip(id: string): Promise<Buffer> {
  if (!LOCAL_LIBRARY.articles.some((a) => a.id === id)) throw new Error('Unknown saved page.');
  try { return await readFile(path.join(process.cwd(), 'public', 'saved', `${id}.json.gz`)); }
  catch { return gzipSync(JSON.stringify(await loadSavedPage(id))); }
}
