'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useStore } from '@/lib/store';
import PageView from '@/components/PageView';
import SidePanel from '@/components/SidePanel';
import LibraryShelf from '@/components/LibraryShelf';
import SandboxView from '@/components/SandboxView';
import GuidePointer from '@/components/GuidePointer';
import SandboxTaskBar from '@/components/SandboxTaskBar';
import type { Block } from '@/lib/types';

export default function ExtensionSurface() {
  const {
    browserView,
    doc,
    results,
    query,
    evidence,
    focusedEvidence,
    guide,
    guideRun,
    fieldValues,
    clicked,
    loadUrl,
    search,
    goBack,
    goForward,
    navStack,
    navIndex,
    openResult,
    setFieldValue,
    setSelection,
    focusEvidence,
    showLibrary,
  } = useStore();
  const location = browserView === 'empty' ? 'PageGuide library' : browserView === 'loading' ? query : browserView === 'results' ? `Search: ${query}` : doc?.url || 'PageGuide library';
  const [address, setAddress] = useState(location);

  useEffect(() => setAddress(location), [location]);

  const submitAddress = (event: FormEvent) => {
    event.preventDefault();
    const value = address.trim();
    if (!value) return;
    void (/^https?:\/\//i.test(value) ? loadUrl(value) : search(value));
  };

  const guideTarget = guide && guide.current < guide.steps.length ? guide.steps[guide.current].id : null;

  const evidenceIds = new Set(evidence.map((e) => e.id));
  const onBlockClick = (b: Block) => {
    if (guideRun?.running) return; // the agent is driving — ignore manual clicks
    if (evidenceIds.has(b.id)) return focusEvidence(b.id); // clicking a highlight focuses it
    if (b.type === 'link' && b.href) void loadUrl(b.href);
  };

  return (
    <div className="grid h-full grid-cols-1 grid-rows-[minmax(140px,0.6fr)_minmax(0,1fr)] overflow-hidden rounded-2xl border border-line bg-white shadow-panel dark:border-night-line dark:bg-night-panel lg:grid-cols-[minmax(0,1fr)_clamp(320px,32vw,460px)] lg:grid-rows-1">
      {/* browser column */}
      <div className="flex min-h-0 min-w-0 flex-col border-b border-line dark:border-night-line lg:border-b-0 lg:border-r">
        {/* chrome */}
        <div className="flex items-center gap-2 border-b border-line bg-[#f8f8f4] px-3 py-2 dark:border-night-line dark:bg-night">
          <button aria-label="Open library" title="Open library" onClick={showLibrary} className="rounded-lg px-2 py-1.5 text-lg text-orange hover:bg-orange-soft">⌂</button>
          <div className="hidden gap-1.5 xl:flex">
            <i className="h-2.5 w-2.5 rounded-full bg-[#e1b8a6]" />
            <i className="h-2.5 w-2.5 rounded-full bg-[#e0d0a0]" />
            <i className="h-2.5 w-2.5 rounded-full bg-[#bdcdb0]" />
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={goBack}
              disabled={browserView === 'empty'}
              title="Back"
              aria-label="Back"
              className="flex h-6 w-6 items-center justify-center rounded-md text-[15px] text-muted enabled:hover:bg-line/50 enabled:hover:text-ink disabled:opacity-30 dark:text-night-muted dark:enabled:hover:text-night-ink"
            >
              ‹
            </button>
            <button
              onClick={goForward}
              disabled={navIndex >= navStack.length - 1}
              title="Forward"
              aria-label="Forward"
              className="flex h-6 w-6 items-center justify-center rounded-md text-[15px] text-muted enabled:hover:bg-line/50 enabled:hover:text-ink disabled:opacity-30 dark:text-night-muted dark:enabled:hover:text-night-ink"
            >
              ›
            </button>
          </div>
          <form onSubmit={submitAddress} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 dark:border-night-line dark:bg-night-panel">
            <span aria-hidden="true" className="text-xs text-muted">◎</span>
            <input aria-label="Search or enter website URL" value={address} onChange={(event) => setAddress(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none dark:text-night-ink" />
            <button type="submit" disabled={!address.trim()} className="shrink-0 rounded-md bg-orange px-2 py-1 text-xs font-medium text-white disabled:opacity-40">Go</button>
          </form>
          {doc && <button aria-label="Refresh page" title="Refresh page" onClick={() => void loadUrl(doc.url, { push: false, refresh: true })} className="px-1 text-xl text-muted">↻</button>}
        </div>

        {doc?.sandbox && browserView === 'page' && <SandboxTaskBar site={doc.sandbox} />}
        {doc && !doc.sandbox && browserView === 'page' && <p className="border-b border-line px-3 py-2 text-xs text-muted dark:border-night-line dark:text-night-muted">{doc.saved ? `Original website HTML · saved ${doc.savedAt ? new Date(doc.savedAt).toLocaleDateString() : 'locally'} · scripts disabled` : 'External snapshot · links and text fields work; site scripts and form submissions are disabled'}</p>}
        {/* body */}
        <div data-pageguide-page className="min-h-0 flex-1">
          {browserView === 'empty' && <LibraryShelf />}
          {browserView === 'loading' && (
            <div role="status" className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-base text-muted">
              <span className="pg-spinner" />
              <span className="max-w-full break-all">Fetching {query}…</span>
              <button onClick={showLibrary} className="rounded-full border border-orange-ring px-4 py-2 text-sm text-orange">Cancel and open library</button>
            </div>
          )}
          {browserView === 'results' && (
            <Results results={results || []} query={query} onOpen={(u) => void openResult(u)} />
          )}
          {browserView === 'page' && doc?.sandbox && <SandboxView doc={doc} />}
          {browserView === 'page' && doc && !doc.sandbox && (
            <PageView
              doc={doc}
              evidence={evidence}
              focusedEvidence={focusedEvidence}
              guideId={guideTarget}
              fieldValues={fieldValues}
              clicked={clicked}
              onBlockClick={onBlockClick}
              onFieldChange={setFieldValue}
              onSelection={setSelection}
              onNavigate={(href) => void loadUrl(href)}
            />
          )}
        </div>
        <GuidePointer />
      </div>

      {/* side panel column */}
      <div className="min-h-0 min-w-0">
        <SidePanel />
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
