'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Block, PageDoc, PageSelection } from '@/lib/types';
import { readPageSelection } from '@/lib/page-selection';

type Evidence = { id: string; quote?: string; emphasis?: string; marker?: string; annotation?: string };

const HILITE_CSS = `
/* whole-block fallback highlight (used only when the quote can't be located) */
[data-pg-ev]{background:#fff5ed !important;color:#553b2c !important;box-shadow:0 0 0 1px #edc7ab;border-radius:5px}
[data-pg-focus]{background:#ffe6d5 !important;color:#513524 !important;box-shadow:0 0 0 1.5px #dc986a !important;border-radius:5px}
[data-pg-ev] a,[data-pg-focus] a,a[data-pg-ev],a[data-pg-focus]{color:#9c4f25 !important;text-decoration-color:#d6a07d !important}
/* continuous span highlight: flat fragments merge into one band, rounded only at the ends */
mark[data-pg-mark]{background:#ffe7d4 !important;color:#4a3526 !important;padding:0;border-radius:0;box-shadow:none}
mark[data-pg-mark][data-pg-sfocus]{background:#ffd7bb !important;color:#43301f !important}
mark[data-pg-strong]{background:#f7b27a !important;color:#3f2c1b !important}
mark[data-pg-strong][data-pg-sfocus]{background:#f3a060 !important}
mark[data-pg-start]{border-top-left-radius:5px;border-bottom-left-radius:5px;padding-left:1px}
mark[data-pg-end]{border-top-right-radius:5px;border-bottom-right-radius:5px;padding-right:1px}
mark[data-pg-mark] a{color:#8f4a22 !important;text-decoration-color:#d6a07d !important}
[data-pg-gd]{box-shadow:0 0 0 3px #f0792b !important;background:#fff6ee !important;border-radius:6px;scroll-margin:100px}
sup[data-pg-badge]{background:#ec3973;color:#fff;border-radius:5px;padding:2px 5px;font-size:9px;font-weight:700;margin:0 3px;vertical-align:super;cursor:pointer;line-height:1.4;font-family:ui-sans-serif,system-ui,sans-serif;text-decoration:none}
sup[data-pg-badge][data-focused]{box-shadow:0 0 0 2px #f3ceb4}
html{scroll-behavior:smooth}
`;

const QUOTE_RE = (q: string) => {
  const pattern = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return pattern ? new RegExp(pattern, 'i') : null;
};

// Highlight the broad `quote` (whitespace-tolerant) inside `el` as ONE continuous band —
// even when it spans inline elements (e.g. links) — and, if `emphasis` is a sub-span of the
// quote, highlight that part more strongly. Fragments share a flat style so they read as a
// single stream; only the first/last get rounded ends. Returns the last <mark> (for the
// badge + scroll), or null if the quote wasn't found (caller then marks the whole block).
function markSpan(el: Element, quote: string, emphasis: string | undefined, focused: boolean): Element | null {
  const d = el.ownerDocument;
  const walker = d.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: { node: Text; start: number; len: number }[] = [];
  let full = '';
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = (n as Text).nodeValue || '';
    nodes.push({ node: n as Text, start: full.length, len: t.length });
    full += t;
  }
  const broadRe = QUOTE_RE(quote);
  const broad = broadRe && broadRe.exec(full);
  if (!broad) return null;
  const s = broad.index;
  const e = broad.index + broad[0].length;

  // locate the optional emphasis span inside the broad [s, e] region
  let es = -1;
  let ee = -1;
  if (emphasis) {
    const emRe = QUOTE_RE(emphasis);
    const em = emRe && emRe.exec(full.slice(s, e));
    if (em) { es = s + em.index; ee = s + em.index + em[0].length; }
  }

  // break [s, e] into non-overlapping segments at the emphasis boundaries
  const bounds = [...new Set([s, e, ...(ee > es && es >= 0 ? [es, ee] : [])])].sort((a, b) => a - b);
  const segments: { a: number; b: number; strong: boolean }[] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const a = bounds[i];
    const b = bounds[i + 1];
    if (a < b) segments.push({ a, b, strong: es >= 0 && a >= es && b <= ee });
  }

  const created: { mark: Element; start: number }[] = [];
  for (const nd of nodes) {
    const ndEnd = nd.start + nd.len;
    if (ndEnd <= s || nd.start >= e) continue;
    // sub-ranges of each segment that fall in this text node, wrapped back-to-front
    const ranges = segments
      .map((seg) => ({ a: Math.max(seg.a, nd.start), b: Math.min(seg.b, ndEnd), strong: seg.strong }))
      .filter((r) => r.a < r.b)
      .sort((x, y) => x.a - y.a);
    for (let i = ranges.length - 1; i >= 0; i--) {
      const r = ranges[i];
      try {
        const range = d.createRange();
        range.setStart(nd.node, r.a - nd.start);
        range.setEnd(nd.node, r.b - nd.start);
        const mark = d.createElement('mark');
        mark.setAttribute('data-pg-mark', '');
        if (r.strong) mark.setAttribute('data-pg-strong', '');
        if (focused) mark.setAttribute('data-pg-sfocus', '');
        range.surroundContents(mark);
        created.push({ mark, start: r.a });
      } catch {
        /* skip this segment */
      }
    }
  }
  if (!created.length) return null;
  created.sort((a, b) => a.start - b.start);
  created[0].mark.setAttribute('data-pg-start', ''); // round the visual start
  created[created.length - 1].mark.setAttribute('data-pg-end', ''); // round the visual end
  return created[created.length - 1].mark; // last in document order
}

// Locate the exact `quote` (whitespace-tolerant) inside a plain-text block and
// split it into before/hit/after so the reader-fallback can wrap just the span.
function splitQuote(text: string, quote?: string): { before: string; hit: string; after: string } | null {
  if (!quote) return null;
  const pattern = quote
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  if (!pattern) return null;
  const m = new RegExp(pattern, 'i').exec(text);
  if (!m) return null;
  return { before: text.slice(0, m.index), hit: text.slice(m.index, m.index + m[0].length), after: text.slice(m.index + m[0].length) };
}

function QuoteSpan({ text, quote, emphasis, focused }: { text: string; quote?: string; emphasis?: string; focused: boolean }) {
  const parts = splitQuote(text, quote);
  if (!parts) return <>{text}</>;
  // One continuous band for the broad quote; a stronger inner mark for the emphasis span.
  const broadCls = focused ? 'rounded-[5px] px-[1px] bg-[#ffd7bb] text-[#43301f]' : 'rounded-[5px] px-[1px] bg-[#ffe7d4] text-[#4a3526]';
  const strongCls = focused ? 'rounded-[3px] bg-[#f3a060] text-[#3f2c1b]' : 'rounded-[3px] bg-[#f7b27a] text-[#3f2c1b]';
  const inner = emphasis ? splitQuote(parts.hit, emphasis) : null;
  return (
    <>
      {parts.before}
      <mark className={broadCls}>
        {inner ? (<>{inner.before}<mark className={strongCls}>{inner.hit}</mark>{inner.after}</>) : parts.hit}
      </mark>
      {parts.after}
    </>
  );
}

export default function PageView({
  doc,
  evidence,
  focusedEvidence,
  guideId,
  fieldValues,
  onBlockClick,
  onNavigate,
  onFieldChange,
  onSelection,
}: {
  doc: PageDoc;
  evidence: Evidence[];
  focusedEvidence: string | null;
  guideId: string | null;
  fieldValues: Record<string, string>;
  clicked: string[];
  onBlockClick: (b: Block) => void;
  onFieldChange: (id: string, v: string) => void;
  onNavigate: (href: string) => void;
  onSelection?: (selection: PageSelection) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const idoc = () => iframeRef.current?.contentDocument || null;

  const onLoad = useCallback(() => {
    const d = idoc();
    if (!d || !d.head) return;
    const style = d.createElement('style');
    style.textContent = HILITE_CSS;
    d.head.appendChild(style);
    d.addEventListener(
      'click',
      (e) => {
        const t = e.target as HTMLElement;
        const tagged = t?.closest?.('[data-pg-id]') as HTMLElement | null;
        const anchor = t?.closest?.('a[href]') as HTMLAnchorElement | null;
        if (anchor && !t.closest('[data-pg-badge]')) {
          e.preventDefault();
          const href = new URL(anchor.getAttribute('href') || '', doc.url);
          const current = new URL(doc.url);
          if (href.hash && href.origin === current.origin && href.pathname === current.pathname) {
            try { d.getElementById(decodeURIComponent(href.hash.slice(1)))?.scrollIntoView({ block: 'start' }); } catch { /* invalid fragment */ }
          } else if (/^https?:$/.test(href.protocol)) onNavigate(href.href);
          return;
        }
        if (tagged) {
          const b = doc.blocks.find((x) => x.id === tagged.getAttribute('data-pg-id'));
          if (b) {
            if (b.type === 'link') e.preventDefault();
            onBlockClick(b);
            return;
          }
        }
      },
      true,
    );
    const captureSelection = () => {
      const selected = d.body && readPageSelection(d.body, doc.url);
      if (selected) onSelection?.(selected);
    };
    let selectionTimer: ReturnType<typeof setTimeout>;
    d.addEventListener('selectionchange', () => { clearTimeout(selectionTimer); selectionTimer = setTimeout(captureSelection, 100); });
    d.addEventListener('mouseup', captureSelection);
    d.addEventListener('keyup', captureSelection);
    d.addEventListener('input', (e) => {
      const el = e.target as HTMLInputElement;
      const id = el.getAttribute('data-pg-id');
      if (id) onFieldChange(id, el.value);
    });
    // Remote snapshots cannot submit real forms; sandbox pages provide safe working forms.
    d.addEventListener('submit', (e) => e.preventDefault());
    setReady(true);
  }, [doc, onBlockClick, onNavigate, onFieldChange, onSelection]);

  // Apply all evidence highlights (persist), focus the clicked one, plus guide target.
  useEffect(() => {
    const d = idoc();
    if (!d) return;
    // clear previous badges, marks + attributes
    d.querySelectorAll('sup[data-pg-badge]').forEach((s) => s.remove());
    d.querySelectorAll('mark[data-pg-mark]').forEach((m) => {
      const parent = m.parentNode;
      if (!parent) return;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
    });
    d.querySelectorAll('[data-pg-ev],[data-pg-focus],[data-pg-gd]').forEach((e) => {
      e.removeAttribute('data-pg-ev');
      e.removeAttribute('data-pg-focus');
      e.removeAttribute('data-pg-gd');
    });

    if (guideId) {
      const el = d.querySelector(`[data-pg-id="${guideId}"],[data-pg-selection-ids~="${guideId}"]`) as HTMLElement | null;
      if (el) {
        el.setAttribute('data-pg-gd', '');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    let focusEl: Element | null = null;
    for (const ev of evidence) {
      const el = d.querySelector(`[data-pg-id="${ev.id}"],[data-pg-selection-ids~="${ev.id}"]`);
      if (!el) continue;
      const focused = ev.id === focusedEvidence;
      const lastMark = ev.quote ? markSpan(el, ev.quote, ev.emphasis, focused) : null;
      if (!lastMark) el.setAttribute(focused ? 'data-pg-focus' : 'data-pg-ev', '');
      // PageGuide annotation badge (the citation marker) on the page
      if (ev.marker) {
        const badge = d.createElement('sup');
        badge.setAttribute('data-pg-badge', '');
        if (focused) badge.setAttribute('data-focused', '');
        badge.textContent = ev.annotation ? `${ev.marker} · ${ev.annotation}` : ev.marker;
        badge.title = ev.annotation || `Evidence ${ev.marker}`;
        if (lastMark) lastMark.after(badge);
        else el.appendChild(badge);
      }
      if (focused) focusEl = lastMark || el;
    }
    if (focusEl) focusEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [evidence, focusedEvidence, guideId, ready]);

  // apply Guide-filled values into the real inputs
  useEffect(() => {
    const d = idoc();
    if (!d) return;
    for (const [id, val] of Object.entries(fieldValues)) {
      const el = d.querySelector(`[data-pg-id="${id}"]`) as HTMLInputElement | null;
      if (el && 'value' in el) el.value = val;
    }
  }, [fieldValues, ready]);

  if (!doc.html)
    return <ReaderFallback doc={doc} evidence={evidence} focusedEvidence={focusedEvidence} guideId={guideId} onBlockClick={onBlockClick} onSelection={onSelection} />;

  return (
    <iframe
      key={doc.url}
      ref={iframeRef}
      onLoad={onLoad}
      srcDoc={doc.html}
      sandbox="allow-same-origin"
      referrerPolicy="no-referrer"
      title={doc.title}
      className="h-full w-full border-0 bg-white"
    />
  );
}

function ReaderFallback({
  doc,
  evidence,
  focusedEvidence,
  guideId,
  onBlockClick,
  onSelection,
}: {
  doc: PageDoc;
  evidence: Evidence[];
  focusedEvidence: string | null;
  guideId: string | null;
  onBlockClick: (b: Block) => void;
  onSelection?: (selection: PageSelection) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const byId = new Map(evidence.map((e) => [e.id, e]));
  useEffect(() => {
    const t = focusedEvidence || guideId;
    if (!t || !ref.current) return;
    ref.current.querySelector(`[data-node-id="${t}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [evidence, focusedEvidence, guideId]);
  return (
    <div ref={ref} onMouseUp={() => { const selected = ref.current && readPageSelection(ref.current, doc.url); if (selected) onSelection?.(selected); }}
      onKeyUp={() => { const selected = ref.current && readPageSelection(ref.current, doc.url); if (selected) onSelection?.(selected); }}
      className="pg-scroll h-full overflow-auto bg-white dark:bg-night-panel">
      <div className="mx-auto max-w-[760px] px-6 py-7">
        {doc.blocks.map((b) => {
          const ev = byId.get(b.id);
          const focused = b.id === focusedEvidence;
          // Highlight just the quoted span when it matches; otherwise fall back to a whole-block class.
          const span = ev && ev.quote && (b.type === 'heading' || !['link', 'image'].includes(b.type)) ? splitQuote(b.text, ev.quote) : null;
          const cls = b.id === guideId ? 'pg-guide' : ev && !span ? (focused ? 'pg-visual' : 'pg-evidence') : '';
          return (
            <div
              key={b.id}
              data-node-id={b.id}
              onClick={() => onBlockClick(b)}
              className={`my-2 text-base leading-7 text-[#555b50] dark:text-[#c3c8ba] ${cls}`}
            >
              {b.type === 'link' ? (
                <button onClick={(e) => { e.stopPropagation(); onBlockClick(b); }} className="text-base text-orange underline underline-offset-4">{b.text}</button>
              ) : b.type === 'heading' ? (
                <h2 className={b.level === 1 ? 'mb-5 mt-3 text-3xl font-semibold text-ink dark:text-night-ink' : 'mb-2 mt-6 text-xl font-semibold text-ink dark:text-night-ink'}>
                  {span ? <QuoteSpan text={b.text} quote={ev?.quote} emphasis={ev?.emphasis} focused={focused} /> : b.text}
                </h2>
              ) : b.type === 'image' && b.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.src} alt={b.text} className="max-h-72 rounded-md border border-line" />
              ) : span ? (
                <QuoteSpan text={b.text} quote={ev?.quote} emphasis={ev?.emphasis} focused={focused} />
              ) : (
                b.text
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
