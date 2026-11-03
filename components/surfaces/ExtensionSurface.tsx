'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import PageView from '@/components/PageView';
import SidePanel from '@/components/SidePanel';
import type { Block } from '@/lib/types';

function looksLikeUrl(t: string): boolean {
  if (/\s/.test(t.trim())) return false;
  return /^https?:\/\//i.test(t) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(t.trim());
}

export default function ExtensionSurface({ onOpenSettings }: { onOpenSettings: () => void }) {
  const {
    browserView,
    doc,
    results,
    pageError,
    query,
    evidence,
    focusedEvidence,
    guide,
    fieldValues,
    clicked,
    loadUrl,
    search,
    openResult,
    performStep,
    setFieldValue,
    focusEvidence,
  } = useStore();
  const [addr, setAddr] = useState('');

  // Keep the address bar in sync with the page actually loaded (incl. link clicks).
  useEffect(() => {
    if (doc?.url) setAddr(doc.url);
  }, [doc?.url]);

  const go = () => {
    const t = addr.trim();
    if (!t) return;
    if (looksLikeUrl(t)) void loadUrl(t);
    else void search(t);
  };

  const guideTarget = guide && guide.current < guide.steps.length ? guide.steps[guide.current].id : null;

  const evidenceIds = new Set(evidence.map((e) => e.id));
  const onBlockClick = (b: Block) => {
    if (guideTarget && b.id === guideTarget) return performStep();
    if (evidenceIds.has(b.id)) return focusEvidence(b.id); // clicking a highlight focuses it
    if (b.type === 'link' && b.href) void loadUrl(b.href);
  };

  return (
    <div className="grid h-full grid-cols-1 overflow-hidden rounded-2xl border border-line bg-white shadow-panel dark:border-night-line dark:bg-night-panel lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* browser column */}
      <div className="flex min-h-0 flex-col border-b border-line dark:border-night-line lg:border-b-0 lg:border-r">
        {/* chrome */}
        <div className="flex items-center gap-2 border-b border-line bg-[#f8f8f4] px-3 py-2 dark:border-night-line dark:bg-night">
          <div className="flex gap-1.5">
            <i className="h-2.5 w-2.5 rounded-full bg-[#e1b8a6]" />
            <i className="h-2.5 w-2.5 rounded-full bg-[#e0d0a0]" />
            <i className="h-2.5 w-2.5 rounded-full bg-[#bdcdb0]" />
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 dark:border-night-line dark:bg-night-panel">
            <span className="text-[11px] text-muted">🔎</span>
            <input
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && go()}
              placeholder="Enter a URL, or type to search the web…"
              className="w-full bg-transparent text-[12px] text-ink outline-none placeholder:text-muted dark:text-night-ink"
            />
          </div>
          <button
            onClick={go}
            className="rounded-lg bg-ink px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[#45503f] dark:bg-orange"
          >
            Go
          </button>
        </div>

        {/* body */}
        <div className="min-h-0 flex-1">
          {browserView === 'empty' && <EmptyState pageError={pageError} onPick={(u) => void loadUrl(u)} onSearch={(q) => void search(q)} />}
          {browserView === 'loading' && (
            <div className="flex h-full items-center justify-center text-[12px] text-muted">
              <span className="animate-pulse">Loading {query}…</span>
            </div>
          )}
          {browserView === 'results' && (
            <Results results={results || []} query={query} onOpen={(u) => void openResult(u)} />
          )}
          {browserView === 'page' && doc && (
            <PageView
              doc={doc}
              evidence={evidence}
              focusedEvidence={focusedEvidence}
              guideId={guideTarget}
              fieldValues={fieldValues}
              clicked={clicked}
              onBlockClick={onBlockClick}
              onFieldChange={setFieldValue}
              onNavigate={(href) => void loadUrl(href)}
            />
          )}
        </div>
      </div>

      {/* side panel column */}
      <div className="min-h-0">
        <SidePanel onOpenSettings={onOpenSettings} />
      </div>
    </div>
  );
}

function EmptyState({
  pageError,
  onPick,
  onSearch,
}: {
  pageError: string | null;
  onPick: (u: string) => void;
  onSearch: (q: string) => void;
}) {
  const examples = [
    { label: 'Wikipedia: Rayleigh scattering', url: 'https://en.wikipedia.org/wiki/Rayleigh_scattering' },
    { label: 'MDN: fetch()', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API' },
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 text-4xl">🍊</div>
      <h2 className="text-lg font-medium text-ink dark:text-night-ink">Open any page, then ask.</h2>
      <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-muted dark:text-night-muted">
        Paste a URL or search the web in the bar above. PageGuide reads the page so Find can highlight the answer and
        Guide can walk you through a task.
      </p>
      {pageError && (
        <p className="mt-3 rounded-lg bg-[#fff2e9] px-3 py-2 text-[11px] text-[#9b6443] dark:bg-[#3a2a22]">{pageError}</p>
      )}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {examples.map((e) => (
          <button
            key={e.url}
            onClick={() => onPick(e.url)}
            className="rounded-full border border-line bg-white px-3 py-1.5 text-[11px] text-ink hover:border-orange/60 hover:bg-orange-soft/40 dark:border-night-line dark:bg-night-panel dark:text-night-ink"
          >
            {e.label}
          </button>
        ))}
        <button
          onClick={() => onSearch('best hiking trails near a lake')}
          className="rounded-full border border-line bg-white px-3 py-1.5 text-[11px] text-ink hover:border-orange/60 hover:bg-orange-soft/40 dark:border-night-line dark:bg-night-panel dark:text-night-ink"
        >
          🔎 Try a web search
        </button>
      </div>
    </div>
  );
}

function Results({
  results,
  query,
  onOpen,
}: {
  results: { title: string; url: string; snippet: string }[];
  query: string;
  onOpen: (u: string) => void;
}) {
  return (
    <div className="pg-scroll h-full overflow-auto px-5 py-5">
      <p className="mb-3 text-[11px] text-muted dark:text-night-muted">
        Web results for <strong className="text-ink dark:text-night-ink">{query}</strong> — pick one to open and ask about
        it.
      </p>
      <div className="space-y-3">
        {results.length === 0 && <p className="text-[12px] text-muted">No results found.</p>}
        {results.map((r, i) => (
          <button
            key={i}
            onClick={() => onOpen(r.url)}
            className="block w-full rounded-lg border border-line bg-white px-4 py-3 text-left hover:border-orange/60 hover:bg-orange-soft/30 dark:border-night-line dark:bg-night-panel"
          >
            <div className="truncate text-[11px] text-sage">{new URL(r.url).hostname}</div>
            <div className="text-[13px] font-medium text-ink dark:text-night-ink">{r.title}</div>
            <div className="mt-0.5 line-clamp-2 text-[11px] text-muted dark:text-night-muted">{r.snippet}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
