'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Block, PageDoc } from '@/lib/types';

type Evidence = { id: string; quote?: string; marker?: string };

const HILITE_CSS = `
[data-pg-ev], mark[data-pg-ev]{background:#fff2b8 !important;color:#5b531f !important;box-shadow:0 0 0 2px #e9cf86;border-radius:3px}
[data-pg-focus], mark[data-pg-focus]{background:#ffcf7a !important;color:#4a3b16 !important;box-shadow:0 0 0 3px #f0792b !important;border-radius:4px}
[data-pg-gd]{box-shadow:0 0 0 3px #f0792b !important;background:#fff6ee !important;border-radius:6px;scroll-margin:100px}
mark[data-pg-ev],mark[data-pg-focus]{padding:0 1px}
sup[data-pg-badge]{background:#f0792b;color:#fff;border-radius:5px;padding:0 4px;font-size:9px;font-weight:700;margin:0 2px;vertical-align:super;cursor:pointer;line-height:1.4;font-family:ui-sans-serif,system-ui,sans-serif;text-decoration:none}
sup[data-pg-badge][data-focused]{box-shadow:0 0 0 2px #7a3e12}
html{scroll-behavior:smooth}
`;

// Wrap the exact `quote` (whitespace-tolerant) inside `el` in <mark>s — even when
// it spans inline elements (e.g. links). Returns the last <mark> created, or null
// if the quote wasn't found (caller then marks the whole block).
function markSpan(el: Element, quote: string, focused: boolean): Element | null {
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
  const pattern = quote
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+');
  if (!pattern) return null;
  const m = new RegExp(pattern, 'i').exec(full);
  if (!m) return null;
  const s = m.index;
  const e = m.index + m[0].length;
  const attr = focused ? 'data-pg-focus' : 'data-pg-ev';
  // wrap each overlapping text-node segment, back-to-front so offsets stay valid
  const overlaps = nodes.filter((nd) => nd.start < e && nd.start + nd.len > s);
  let lastMark: Element | null = null;
  for (let i = overlaps.length - 1; i >= 0; i--) {
    const nd = overlaps[i];
    const a = Math.max(0, s - nd.start);
    const b = Math.min(nd.len, e - nd.start);
    if (a >= b) continue;
    try {
      const range = d.createRange();
      range.setStart(nd.node, a);
      range.setEnd(nd.node, b);
      const mark = d.createElement('mark');
      mark.setAttribute(attr, '');
      mark.setAttribute('data-pg-mark', '');
      range.surroundContents(mark);
      if (!lastMark) lastMark = mark; // back-to-front: first wrapped is the last in document order
    } catch {
      /* skip this segment */
    }
  }
  return lastMark;
}

export default function PageView({
  doc,
  evidence,
  focusedEvidence,
  guideId,
  fieldValues,
  onBlockClick,
  onNavigate,
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
        if (tagged) {
          const b = doc.blocks.find((x) => x.id === tagged.getAttribute('data-pg-id'));
          if (b) {
            e.preventDefault();
            onBlockClick(b);
            return;
          }
        }
        if (anchor) {
          e.preventDefault();
          if (anchor.href) onNavigate(anchor.href);
        }
      },
      true,
    );
    setReady(true);
  }, [doc, onBlockClick, onNavigate]);

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
      const el = d.querySelector(`[data-pg-id="${guideId}"]`) as HTMLElement | null;
      if (el) {
        el.setAttribute('data-pg-gd', '');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    let focusEl: Element | null = null;
    for (const ev of evidence) {
      const el = d.querySelector(`[data-pg-id="${ev.id}"]`);
      if (!el) continue;
      const focused = ev.id === focusedEvidence;
      const lastMark = ev.quote ? markSpan(el, ev.quote, focused) : null;
      if (!lastMark) el.setAttribute(focused ? 'data-pg-focus' : 'data-pg-ev', '');
      // PageGuide annotation badge (the citation marker) on the page
      if (ev.marker) {
        const badge = d.createElement('sup');
        badge.setAttribute('data-pg-badge', '');
        if (focused) badge.setAttribute('data-focused', '');
        badge.textContent = ev.marker;
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
    return <ReaderFallback doc={doc} evidence={evidence} focusedEvidence={focusedEvidence} guideId={guideId} onBlockClick={onBlockClick} />;

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
}: {
  doc: PageDoc;
  evidence: Evidence[];
  focusedEvidence: string | null;
  guideId: string | null;
  onBlockClick: (b: Block) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const byId = new Map(evidence.map((e) => [e.id, e]));
  useEffect(() => {
    const t = focusedEvidence || guideId;
    if (!t || !ref.current) return;
    ref.current.querySelector(`[data-node-id="${t}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusedEvidence, guideId]);
  return (
    <div ref={ref} className="pg-scroll h-full overflow-auto bg-white dark:bg-night-panel">
      <div className="mx-auto max-w-[760px] px-6 py-7">
        {doc.blocks.map((b) => {
          const ev = byId.get(b.id);
          const cls = b.id === guideId ? 'pg-guide' : ev ? (b.id === focusedEvidence ? 'pg-visual' : 'pg-evidence') : '';
          return (
            <div
              key={b.id}
              data-node-id={b.id}
              onClick={() => onBlockClick(b)}
              className={`my-1 text-[13px] leading-7 text-[#555b50] dark:text-[#c3c8ba] ${cls}`}
            >
              {b.type === 'image' && b.src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.src} alt={b.text} className="max-h-72 rounded-md border border-line" />
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
