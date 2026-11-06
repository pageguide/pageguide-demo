import seed from './library-seed.json';

export interface Article {
  id: string; title: string; site: string; source: string; description: string;
}
export interface Product { id: string; name: string; emoji: string; price: number; description: string }
export interface Comment { id: string; author: string; text: string }
export interface Answer { id: string; author: string; credential: string; votes: number; text: string; comments: Comment[] }
export interface Post { id: string; title: string; topic: string; author: string; body: string; answers?: Answer[]; space?: string }
export interface Library { version: number; articles: Article[]; products: Product[]; posts: Post[] }
export const LOCAL_LIBRARY: Library = seed;
export const LIBRARY_ORIGIN = 'https://library.pageguide.test';
export const articleUrl = (id: string, library = LOCAL_LIBRARY) => library.articles.find((a) => a.id === id)?.source || `${LIBRARY_ORIGIN}/${id}`;
export function snapshotId(url: string, library = LOCAL_LIBRARY): string | null {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return library.articles.find((a) => a.source.replace(/\/$/, '') === parsed.href.replace(/\/$/, '') || `${LIBRARY_ORIGIN}/${a.id}` === parsed.href.replace(/\/$/, ''))?.id || null;
  } catch { return null; }
}

// Database content is DATA, never executable HTML. Reject malformed/oversized catalogs.
export function parseLibrary(value: unknown): Library | null {
  const v = value as Library;
  const text = (s: unknown, max = 4000): s is string => typeof s === 'string' && s.length > 0 && s.length <= max;
  const id = (s: unknown) => text(s, 80) && /^[a-z0-9-]+$/.test(s);
  if (!v || v.version !== 1 || !Array.isArray(v.articles) || !Array.isArray(v.products) || !Array.isArray(v.posts)) return null;
  if (v.articles.length !== LOCAL_LIBRARY.articles.length || !v.products.length || v.products.length > 20 || !v.posts.length || v.posts.length > 30) return null;
  if (!v.articles.every((a) => a && id(a.id) && text(a.title, 200) && text(a.site, 100) && text(a.description, 300)
    && text(a.source, 2000) && LOCAL_LIBRARY.articles.some((original) => original.id === a.id && original.source === a.source))) return null;
  if (!v.products.every((p) => p && id(p.id) && text(p.name, 200) && text(p.emoji, 16) && Number.isFinite(p.price)
    && p.price >= 0 && p.price <= 10000 && text(p.description))) return null;
  if (!v.products.some((p) => p.id === 'oranges')) return null;
  if (!v.posts.every((p) => p && id(p.id) && text(p.title, 300) && text(p.topic, 100) && text(p.author, 100) && text(p.body)
    && (p.answers === undefined || (Array.isArray(p.answers) && p.answers.length <= 10 && p.answers.every((a) => a && id(a.id) && text(a.author, 100) && text(a.credential, 200) && text(a.text) && Number.isFinite(a.votes) && a.votes >= 0
      && Array.isArray(a.comments) && a.comments.length <= 20 && a.comments.every((c) => c && id(c.id) && text(c.author, 100) && text(c.text, 2000))))))) return null;
  for (const items of [v.articles, v.products, v.posts]) if (new Set(items.map((x) => x.id)).size !== items.length) return null;
  return v;
}
