import * as cheerio from 'cheerio';
import type { Block, BlockType, PageDoc } from './types';

const clean = (text: string | undefined | null) => (text || '').replace(/\s+/g, ' ').trim().slice(0, 4000);

/** Keep original HTML/CSS; tag source elements for grounding. Never reconstruct the website. */
export function extractPage(html: string, base: URL): PageDoc {
  const $ = cheerio.load(html);
  $('script, noscript, template, iframe, object, embed, meta[http-equiv="refresh"]').remove();
  // MDN dropdowns depend on scripts that are disabled in the snapshot iframe. Without
  // them, their saved panels render permanently open instead of responding to the nav.
  $('mdn-dropdown .menu__panel').remove();
  $('*').each((_, el) => {
    const e = el as { attribs?: Record<string, string> };
    if (e.attribs) for (const a of Object.keys(e.attribs)) {
      if (/^on/i.test(a) || (/^(href|src|action|formaction)$/i.test(a) && /^\s*javascript:/i.test(e.attribs[a]))) delete e.attribs[a];
    }
  });
  const title = clean($('meta[property="og:title"]').attr('content')) || clean($('title').first().text()) || base.hostname;
  const siteName = clean($('meta[property="og:site_name"]').attr('content')) || base.hostname.replace(/^www\./, '');
  let rootEl: import('domhandler').AnyNode = $('body').get(0)!;
  let best = 0;
  for (const selector of ['#mw-content-text', '[role="main"]', 'article', 'main', '.mw-parser-output', '#content']) {
    $(selector).each((_, el) => { const score = $(el).find('p').length; if (score > best) { best = score; rootEl = el; } });
  }
  const CHROME = 'nav,header,footer,aside,[role="navigation"],[role="banner"],[role="contentinfo"],[role="search"],.navbox,.vector-menu,.mw-portlet,.sidebar,.mw-editsection,.reference,.reflist,.catlinks,.hatnote,.mw-indicators,.mw-indicator,.infobox,.navbar,.toc,#toc';
  const blocks: Block[] = [];
  const seen = new Set<string>();
  let images = 0;
  const push = (type: BlockType, text: string, extra: Partial<Block> = {}) => {
    if (blocks.length >= 5000) return;
    const value = clean(text);
    const key = `${type}|${extra.src || value}`;
    if (!value || seen.has(key)) return;
    seen.add(key);
    const id = `n${blocks.length}`;
    blocks.push({ id, type, text: value, ...extra });
    return id;
  };
  $(rootEl).find('h1,h2,h3,h4,h5,h6,p,li,blockquote,a[href],button,[role="button"],input,textarea,select,img').each((_, el) => {
    if (blocks.length >= 5000) return false;
    const node = $(el);
    if (node.closest(CHROME).length) return;
    const tag = (el as { tagName?: string }).tagName?.toLowerCase() || '';
    let id: string | undefined;
    if (/^h[1-6]$/.test(tag)) id = push('heading', node.text(), { level: Number(tag[1]) });
    else if (tag === 'p') id = push('paragraph', node.text());
    else if (tag === 'li') {
      if (!(node.children('a').length && node.text().trim() === node.children('a').text().trim())) id = push('listitem', node.text());
    } else if (tag === 'blockquote') id = push('quote', node.text());
    else if (tag === 'a') {
      if (node.closest('p,li,h1,h2,h3,h4,h5,h6,blockquote').length) return;
      try {
        const href = new URL(node.attr('href') || '', base).href;
        if (/^https?:/.test(href)) id = push('link', node.text() || node.attr('aria-label') || node.attr('title') || '', { href, control: true });
      } catch { /* invalid link */ }
    } else if (tag === 'button' || node.attr('role') === 'button') id = push('button', node.text() || node.attr('aria-label') || '', { control: true });
    else if (['input', 'textarea', 'select'].includes(tag)) id = push('input', `${node.attr('aria-label') || node.attr('placeholder') || node.attr('name') || node.attr('type') || tag} field`, { control: true });
    else if (tag === 'img' && images < 12) {
      const raw = node.attr('src') || node.attr('data-src') || '';
      try {
        const src = new URL(raw, base).href;
        // Embedded SingleFile images remain in the displayed HTML but are omitted from model payloads.
        if (!/^https?:/.test(src) || /\.svg(\?|$)/i.test(src)) return;
        const w = parseInt(node.attr('width') || '0', 10), h = parseInt(node.attr('height') || '0', 10);
        if ((w && w < 80) || (h && h < 80)) return;
        images++;
        id = push('image', clean(node.attr('alt')) || clean(node.closest('figure').find('figcaption').text()) || 'Figure', { src });
      } catch { /* invalid image */ }
    }
    if (id) node.attr('data-pg-id', id);
  });
  $('base').remove();
  if (!$('head').length) $('html').prepend('<head></head>');
  $('head').prepend('<base>');
  $('head base').attr('href', base.href);
  return { url: base.href, title, siteName, blocks, html: $.html() };
}
