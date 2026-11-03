import type { PageDoc } from './types';

// Bounded process/session memory only: no persisted personal third-party page contents.
const pages = new Map<string, { doc: PageDoc; expires: number }>();
const TTL = 5 * 60 * 1000;
const LIMIT = 12;
export function cachedPage(url: string): PageDoc | null {
  const hit = pages.get(url);
  if (!hit) return null;
  if (hit.expires < Date.now()) { pages.delete(url); return null; }
  return hit.doc;
}
export function cachePage(url: string, doc: PageDoc) {
  pages.delete(url);
  pages.set(url, { doc, expires: Date.now() + TTL });
  while (pages.size > LIMIT) pages.delete(pages.keys().next().value!);
}
