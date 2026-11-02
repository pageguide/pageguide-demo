'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Block, PageDoc } from '@/lib/types';

const HILITE_CSS = `
[data-pg-ev]{background:#fff0b3 !important;box-shadow:0 0 0 3px #e1b75d !important;border-radius:4px;scroll-margin:90px}
[data-pg-gd]{box-shadow:0 0 0 3px #f0792b !important;border-radius:6px;background:#fff6ee !important;scroll-margin:100px}
html{scroll-behavior:smooth}
`;

export default function PageView({
  doc,
  highlightId,
  guideId,
  fieldValues,
  clicked,
  onBlockClick,
  onFieldChange,
  onNavigate,
}: {
  doc: PageDoc;
  highlightId: string | null;
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
    // inject highlight styles
    const style = d.createElement('style');
    style.id = 'pg-hilite';
    style.textContent = HILITE_CSS;
    d.head.appendChild(style);
    // intercept clicks: our tagged elements drive Find/Guide; links re-route through the app
    d.addEventListener(
      'click',
      (e) => {
        const t = e.target as HTMLElement;
        const tagged = t?.closest?.('[data-pg-id]') as HTMLElement | null;
        const anchor = t?.closest?.('a[href]') as HTMLAnchorElement | null;
        if (tagged) {
          const id = tagged.getAttribute('data-pg-id')!;
          const b = doc.blocks.find((x) => x.id === id);
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

  // highlight evidence / guide target on the real page
  useEffect(() => {
    const d = idoc();
    if (!d) return;
    d.querySelectorAll('[data-pg-ev],[data-pg-gd]').forEach((el) => {
      el.removeAttribute('data-pg-ev');
      el.removeAttribute('data-pg-gd');
    });
    const id = highlightId || guideId;
    if (!id) return;
    const el = d.querySelector(`[data-pg-id="${id}"]`) as HTMLElement | null;
    if (el) {
      el.setAttribute(guideId === id ? 'data-pg-gd' : 'data-pg-ev', '');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightId, guideId, ready]);

  // apply Guide-filled values into the real inputs
  useEffect(() => {
    const d = idoc();
    if (!d) return;
    for (const [id, val] of Object.entries(fieldValues)) {
      const el = d.querySelector(`[data-pg-id="${id}"]`) as HTMLInputElement | null;
      if (el && 'value' in el) el.value = val;
    }
  }, [fieldValues, ready]);

  if (!doc.html) return <ReaderFallback doc={doc} highlightId={highlightId} guideId={guideId} onBlockClick={onBlockClick} />;

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

// Fallback reader view (used only if a page could not provide display HTML).
function ReaderFallback({
  doc,
  highlightId,
  guideId,
  onBlockClick,
}: {
  doc: PageDoc;
  highlightId: string | null;
  guideId: string | null;
  onBlockClick: (b: Block) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = highlightId || guideId;
    if (!t || !ref.current) return;
    ref.current.querySelector(`[data-node-id="${t}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId, guideId]);
  return (
    <div ref={ref} className="pg-scroll h-full overflow-auto bg-white dark:bg-night-panel">
      <div className="mx-auto max-w-[760px] px-6 py-7">
        {doc.blocks.map((b) => (
          <div
            key={b.id}
            data-node-id={b.id}
            onClick={() => onBlockClick(b)}
            className={`my-1 text-[13px] leading-7 text-[#555b50] dark:text-[#c3c8ba] ${
              b.id === highlightId ? 'pg-evidence' : ''
            } ${b.id === guideId ? 'pg-guide' : ''}`}
          >
            {b.type === 'image' && b.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.src} alt={b.text} className="max-h-72 rounded-md border border-line" />
            ) : (
              b.text
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
