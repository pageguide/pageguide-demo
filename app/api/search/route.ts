import { NextRequest, NextResponse } from 'next/server';
import type { SearchResult } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';

// Keyless web search by merging two reliable JSON sources:
//  - DuckDuckGo Instant Answer API: official site (Results) + an abstract.
//  - Wikipedia search API: relevant articles with snippets.
// (DuckDuckGo's scrapeable HTML endpoint now returns an anti-bot challenge, so we
//  use its JSON API instead. Both sources are keyless.)
async function ddg(query: string, signal: AbortSignal): Promise<SearchResult[]> {
  const out: SearchResult[] = [];
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&t=pageguide`,
      { signal, headers: { 'User-Agent': UA } },
    );
    if (!res.ok) return out;
    const d: any = await res.json();
    const bad = (u: string) => !u || /(^|\.)duckduckgo\.com/i.test(new URL(u).hostname);
    if (Array.isArray(d.Results)) {
      for (const r of d.Results) {
        if (r?.FirstURL && !bad(r.FirstURL)) {
          out.push({
            title: d.Heading ? `${d.Heading} — official site` : new URL(r.FirstURL).hostname,
            url: r.FirstURL,
            snippet: (d.AbstractText || 'Official site').slice(0, 220),
          });
        }
      }
    }
    if (d.AbstractURL && !bad(d.AbstractURL) && d.AbstractText) {
      out.push({ title: d.Heading || 'Overview', url: d.AbstractURL, snippet: String(d.AbstractText).slice(0, 220) });
    }
  } catch {
    /* ignore */
  }
  return out;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function wiki(query: string, signal: AbortSignal): Promise<SearchResult[]> {
  const out: SearchResult[] = [];
  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&format=json&list=search&srlimit=6&origin=*&srsearch=${encodeURIComponent(
        query,
      )}`,
      { signal, headers: { 'User-Agent': UA } },
    );
    if (!res.ok) return out;
    const d: any = await res.json();
    for (const s of d?.query?.search || []) {
      out.push({
        title: s.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(String(s.title).replace(/ /g, '_'))}`,
        snippet: stripTags(s.snippet || ''),
      });
    }
  } catch {
    /* ignore */
  }
  return out;
}

export async function POST(req: NextRequest) {
  let query = '';
  try {
    const body = await req.json();
    query = String(body?.query || '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!query) return NextResponse.json({ error: 'A search query is required.' }, { status: 400 });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const [a, b] = await Promise.all([ddg(query, controller.signal), wiki(query, controller.signal)]);
    const merged: SearchResult[] = [];
    const seen = new Set<string>();
    for (const r of [...a, ...b]) {
      let key = r.url;
      try {
        const u = new URL(r.url);
        key = u.hostname + u.pathname;
      } catch {
        /* keep raw */
      }
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(r);
      if (merged.length >= 8) break;
    }
    return NextResponse.json({ results: merged });
  } catch {
    return NextResponse.json({ error: 'Search request failed.' }, { status: 504 });
  } finally {
    clearTimeout(timer);
  }
}
