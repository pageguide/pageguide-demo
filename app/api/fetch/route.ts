import { NextRequest, NextResponse } from 'next/server';
import { extractPage } from '@/lib/extract-page';
import { cachedPage, cachePage } from '@/lib/page-cache';
import { snapshotId } from '@/lib/library';
import { loadSavedGzip } from '@/lib/saved-pages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';
const MAX_BYTES = 3_000_000;
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')
    || /^(0\.|127\.|10\.|169\.254\.|192\.168\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)
    || h === '::' || h === '::1' || h.startsWith('fe80') || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('::ffff:');
}
export async function POST(req: NextRequest) {
  let url = '', refresh = false;
  try { const body = await req.json(); url = String(body?.url || '').trim(); refresh = body?.refresh === true; }
  catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  if (!url) return NextResponse.json({ error: 'A URL is required.' }, { status: 400 });
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  let parsed: URL;
  try { parsed = new URL(url); } catch { return NextResponse.json({ error: 'That does not look like a valid URL.' }, { status: 400 }); }
  if (!/^https?:$/.test(parsed.protocol) || isBlockedHost(parsed.hostname)) return NextResponse.json({ error: 'That address is not allowed.' }, { status: 400 });
  const saved = snapshotId(parsed.href);
  if (saved && !refresh) {
    try {
      const doc = await loadSavedGzip(saved);
      return new Response(doc, { headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip', 'X-PageGuide-Cache': 'SAVED' } });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Saved HTML unavailable.' }, { status: 503 });
    }
  }
  const cached = !refresh && cachedPage(parsed.href);
  if (cached) return NextResponse.json(cached, { headers: { 'X-PageGuide-Cache': 'HIT' } });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let html = '';
  const requested = parsed.href;
  try {
    let res: Response | null = null;
    for (let hop = 0; hop < 5; hop++) {
      if (!/^https?:$/.test(parsed.protocol) || isBlockedHost(parsed.hostname)) return NextResponse.json({ error: 'The site redirected to a blocked address.' }, { status: 400 });
      res = await fetch(parsed.href, { signal: controller.signal, redirect: 'manual', headers: { ...(parsed.hostname === 'www.w3.org' ? {} : { 'User-Agent': UA }), Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' } });
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        await res.body?.cancel();
        parsed = new URL(res.headers.get('location')!, parsed);
        res = null;
      } else break;
    }
    if (!res) throw new Error('Too many redirects.');
    if (!res.ok) return NextResponse.json({ error: `This website returned HTTP ${res.status}. It may block automated reads. Try a saved page or a different public URL.` }, { status: 502 });
    const ctype = res.headers.get('content-type') || '';
    if (!/text\/html|application\/xhtml/i.test(ctype)) return NextResponse.json({ error: `This URL is not an HTML page (${ctype || 'unknown type'}).` }, { status: 415 });
    const reader = res.body?.getReader();
    if (!reader) throw new Error('Empty response.');
    const decoder = new TextDecoder();
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) { await reader.cancel(); return NextResponse.json({ error: 'That page is too large to load in the demo.' }, { status: 413 }); }
      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode();
  } catch (error) {
    return NextResponse.json({ error: controller.signal.aborted ? 'The page took too long. Choose an instant saved page or retry.' : error instanceof Error ? error.message : 'Could not reach that page.' }, { status: 504 });
  } finally { clearTimeout(timer); }
  const doc = extractPage(html, parsed);
  if (!doc.blocks.length) return NextResponse.json({ error: 'No readable content found. This page may require JavaScript.' }, { status: 422 });
  cachePage(requested, doc);
  cachePage(doc.url, doc);
  return NextResponse.json(doc, { headers: { 'X-PageGuide-Cache': 'MISS' } });
}
