import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import type { Block, BlockType, PageDoc } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';
const MAX_BYTES = 3_000_000;
const MAX_BLOCKS = 220;
const MAX_IMAGES = 12;
const MAX_TEXT = 800;

// Block private / loopback / link-local hosts to avoid SSRF.
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (/^(0\.|127\.|10\.|169\.254\.|192\.168\.)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (h === '::1' || h.startsWith('fe80') || h.startsWith('fc') || h.startsWith('fd')) return true;
  if (/^\d+$/.test(h.replace(/\./g, ''))) {
    // bare numeric without dots etc. — be conservative
  }
  return false;
}

function clean(text: string | undefined | null): string {
  return (text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
}

export async function POST(req: NextRequest) {
  let url = '';
  try {
    const body = await req.json();
    url = String(body?.url || '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!url) return NextResponse.json({ error: 'A URL is required.' }, { status: 400 });
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'That does not look like a valid URL.' }, { status: 400 });
  }
  if (!/^https?:$/.test(parsed.protocol) || isBlockedHost(parsed.hostname)) {
    return NextResponse.json({ error: 'That address is not allowed.' }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let html = '';
  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) {
      const blocked = [401, 403, 404, 429, 503].includes(res.status);
      const msg = blocked
        ? `This site blocked the demo’s request (HTTP ${res.status}). Big retailers (e.g. Amazon), social networks, and bot-protected pages refuse automated reads. Try a content page — Wikipedia, MDN, docs, or a news/blog article work well.`
        : `The site returned HTTP ${res.status} and couldn’t be loaded.`;
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    const ctype = res.headers.get('content-type') || '';
    if (!/text\/html|application\/xhtml/i.test(ctype)) {
      return NextResponse.json(
        { error: `This URL is not an HTML page (${ctype || 'unknown type'}).` },
        { status: 415 },
      );
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'That page is too large to load in the demo.' }, { status: 413 });
    }
    html = new TextDecoder('utf-8').decode(buf);
  } catch (err: unknown) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return NextResponse.json(
      { error: aborted ? 'The page took too long to respond.' : 'Could not reach that page.' },
      { status: 504 },
    );
  } finally {
    clearTimeout(timer);
  }

  const doc = extract(html, parsed);
  if (doc.blocks.length === 0) {
    return NextResponse.json(
      { error: 'No readable content found. The page may rely on JavaScript to render.' },
      { status: 422 },
    );
  }
  return NextResponse.json(doc);
}

function extract(html: string, base: URL): PageDoc {
  const $ = cheerio.load(html);
  // For display we keep the page's own layout + styles; only strip what is unsafe
  // or would break in a sandboxed iframe (scripts, embeds, event handlers).
  $('script, noscript, template, iframe, object, embed').remove();
  $('*').each((_, el) => {
    const e = el as { attribs?: Record<string, string> };
    if (e.attribs) for (const a of Object.keys(e.attribs)) if (/^on/i.test(a)) delete e.attribs[a];
  });

  const title =
    clean($('meta[property="og:title"]').attr('content')) ||
    clean($('title').first().text()) ||
    base.hostname;
  const siteName =
    clean($('meta[property="og:site_name"]').attr('content')) || base.hostname.replace(/^www\./, '');
  const favicon = `https://www.google.com/s2/favicons?domain=${base.hostname}&sz=64`;

  // Pick the richest content container (most paragraphs) among likely roots.
  // Picking the *first* match breaks on pages (e.g. Wikipedia) where a tiny
  // indicator container matches the same selector before the real article body.
  let rootEl: any = $('body').get(0);
  let best = 0;
  for (const sel of ['#mw-content-text', '[role="main"]', 'article', 'main', '.mw-parser-output', '#content']) {
    $(sel).each((_, el) => {
      const score = $(el).find('p').length;
      if (score > best) {
        best = score;
        rootEl = el;
      }
    });
  }
  const root = $(rootEl);

  // Chrome/boilerplate: excluded from the model's blocks, but still shown on the page.
  const CHROME =
    'nav,header,footer,aside,[role="navigation"],[role="banner"],[role="contentinfo"],[role="search"],' +
    '.navbox,.vector-menu,.mw-portlet,.sidebar,.mw-editsection,.reference,.reflist,.catlinks,' +
    '.hatnote,.mw-indicators,.mw-indicator,.infobox,.navbar,.toc,#toc';

  const blocks: Block[] = [];
  const seen = new Set<string>();
  let n = 0;
  let imageCount = 0;
  const push = (type: BlockType, text: string, extra: Partial<Block> = {}): string | undefined => {
    if (blocks.length >= MAX_BLOCKS) return undefined;
    const t = clean(text);
    if (!t) return undefined;
    const key = type + '|' + (extra.src || t);
    if (seen.has(key)) return undefined;
    seen.add(key);
    const id = `n${n++}`;
    blocks.push({ id, type, text: t, ...extra });
    return id;
  };

  const selector =
    'h1,h2,h3,h4,h5,h6,p,li,blockquote,a[href],button,[role="button"],input,textarea,select,img';
  root.find(selector).each((_, el) => {
    if (blocks.length >= MAX_BLOCKS) return false;
    const $el = $(el);
    if ($el.closest(CHROME).length) return; // skip chrome for the model; the page still renders it
    const tag = (el as { tagName?: string }).tagName?.toLowerCase();
    if (!tag) return;
    let id: string | undefined;
    if (/^h[1-6]$/.test(tag)) {
      id = push('heading', $el.text(), { level: Number(tag[1]) });
    } else if (tag === 'p') {
      id = push('paragraph', $el.text());
    } else if (tag === 'li') {
      if ($el.children('a').length && $el.text().trim() === $el.children('a').text().trim()) return;
      id = push('listitem', $el.text());
    } else if (tag === 'blockquote') {
      id = push('quote', $el.text());
    } else if (tag === 'a') {
      // Skip inline links inside text blocks — they duplicate the paragraph text.
      if ($el.closest('p, li, h1, h2, h3, h4, h5, h6, blockquote').length) return;
      const href = $el.attr('href') || '';
      let abs = '';
      try {
        abs = new URL(href, base).toString();
      } catch {
        abs = '';
      }
      const text = $el.text() || $el.attr('aria-label') || $el.attr('title') || '';
      if (abs && /^https?:/.test(abs)) id = push('link', text, { href: abs, control: true });
    } else if (tag === 'button' || $el.attr('role') === 'button') {
      id = push('button', $el.text() || $el.attr('aria-label') || '', { control: true });
    } else if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      const label =
        $el.attr('aria-label') || $el.attr('placeholder') || $el.attr('name') || $el.attr('type') || tag;
      id = push('input', `${label} field`, { control: true });
    } else if (tag === 'img') {
      if (imageCount >= MAX_IMAGES) return;
      const raw = $el.attr('src') || $el.attr('data-src') || $el.attr('data-srcset')?.split(' ')[0] || '';
      if (!raw) return;
      let abs = '';
      try {
        abs = new URL(raw, base).toString();
      } catch {
        return;
      }
      if (!/^https?:/.test(abs) || /\.svg(\?|$)/i.test(abs)) return;
      const w = parseInt($el.attr('width') || '0', 10);
      const h = parseInt($el.attr('height') || '0', 10);
      if ((w && w < 80) || (h && h < 80)) return;
      const alt = clean($el.attr('alt')) || clean($el.closest('figure').find('figcaption').text()) || 'Figure';
      imageCount++;
      id = push('image', alt, { src: abs });
    }
    if (id) $el.attr('data-pg-id', id); // tag the real element so we can highlight/drive it
    return;
  });

  // Make relative assets/links resolve to the origin inside the iframe.
  $('base').remove();
  if ($('head').length === 0) $('html').prepend('<head></head>');
  $('head').prepend('<base>');
  $('head base').attr('href', base.toString());
  const pageHtml = $.html();

  return { url: base.toString(), title, siteName, favicon, blocks, html: pageHtml };
}
