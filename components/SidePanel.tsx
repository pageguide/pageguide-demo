'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useStore, type GuideRun } from '@/lib/store';
import type { Evidence, PageSelection } from '@/lib/types';
import { evidenceForAnswer } from '@/lib/evidence';

export default function SidePanel() {
  const {
    settings,
    doc,
    selection,
    setSelection,
    messages,
    busy,
    ask,
    loadUrl,
    search,
    clearChat,
    toggleDark,
    admin,
    unlockAdmin,
    lockAdmin,
    guideRun,
    scratchpad,
    toggleJourney,
  } = useStore();
  const [input, setInput] = useState('');
  const [openEv, setOpenEv] = useState<string | null>(null);
  const [adminNotice, setAdminNotice] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, guideRun]);

  const usages = messages.flatMap((m) => m.result?.usage ? [m.result.usage] : []);
  const tokens = usages.reduce((sum, usage) => sum + usage.total, 0);
  const cost = usages.reduce((sum, usage) => sum + (usage.cost ?? 0), 0);
  const costUnknown = usages.some((usage) => usage.cost === null);
  const estimated = usages.some((usage) => usage.estimated);

  const submit = () => {
    const t = input.trim();
    if (!t || busy) return;
    setInput('');
    // Keep admin access without adding another toolbar button or sending credentials to the model.
    if (/^\/admin(?:\s|$)/i.test(t)) {
      const password = t.replace(/^\/admin\s*/i, '');
      if (password === 'off') {
        lockAdmin();
        setAdminNotice('Admin mode off.');
      } else {
        setAdminNotice(unlockAdmin(password) ? 'Admin mode on.' : 'Could not unlock admin mode.');
      }
      return;
    }
    setAdminNotice('');
    if (/^\/open\s+/i.test(t)) return void loadUrl(t);
    if (/^\/search\s+/i.test(t)) return void search(t);
    if (/^\/clear\b/i.test(t)) return clearChat();
    void ask(t);
  };

  return (
    <section aria-label="PageGuide chat" className="pg-chat relative flex h-full min-w-0 flex-col overflow-hidden">
      {/* header */}
      <header className="flex shrink-0 items-center justify-between gap-3 px-5 py-4">
        <div className="text-lg font-semibold tracking-tight text-ink dark:text-night-ink">PageGuide</div>
        <div className="flex items-center gap-1">
          <IconBtn label={settings.dark ? 'Light mode' : 'Dark mode'} onClick={toggleDark}>
            {settings.dark ? '☀' : '☾'}
          </IconBtn>
          <IconBtn label="Clear chat" onClick={() => { clearChat(); setOpenEv(null); setAdminNotice(''); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconBtn>
        </div>
      </header>

      {/* conversation */}
      <div ref={logRef} className={`pg-chat-log pg-scroll min-h-0 min-w-0 flex-1 overflow-y-auto px-5 py-5 ${messages.length === 0 && !guideRun ? 'flex flex-col justify-center' : 'space-y-6'}`}>
        {messages.length === 0 && !guideRun && (
          <div className="pb-8 text-center">
            <div aria-hidden="true" className="mx-auto mb-5 text-5xl">🍊</div>
            <h1 className="text-[28px] font-medium leading-tight tracking-tight text-ink dark:text-night-ink">Your next move?</h1>
            <p className="mx-auto mt-3 max-w-[260px] text-base leading-relaxed text-muted dark:text-night-muted">
              {doc ? 'Ask about this page, or let me guide you through a task.' : 'Open a page. Find an answer. Get things done.'}
            </p>
          </div>
        )}
        {messages.map((m) => (
          <Message key={m.id} m={m} />
        ))}
        {guideRun && (
          <GuideCard
            key={guideRun.id}
            run={guideRun}
            scratchpad={scratchpad}
            openEv={openEv}
            setOpenEv={setOpenEv}
            onToggleJourney={toggleJourney}
          />
        )}
        {busy && !guideRun && (
          <div role="status" className="flex items-center gap-2 text-base text-muted dark:text-night-muted">
            <span className="pg-spinner" /> Thinking…
          </div>
        )}
      </div>

      {selection && <aside aria-label="Selected text context" className="mx-3 mb-2 flex shrink-0 items-start gap-2 rounded-2xl border border-orange-ring bg-white/70 px-4 py-3 dark:border-night-line dark:bg-white/5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#a85024] dark:text-orange">Selected text</p>
          <blockquote title={selection.text} className="mt-1 line-clamp-2 break-words text-sm leading-relaxed text-muted dark:text-night-muted">“{selection.text}”</blockquote>
        </div>
        <button aria-label="Remove selected text" onClick={() => {
          document.querySelector<HTMLIFrameElement>('[data-pageguide-page] iframe')?.contentDocument?.getSelection()?.removeAllRanges();
          window.getSelection()?.removeAllRanges();
          setSelection(null);
        }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#a85024] hover:bg-orange-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange dark:text-orange">✕</button>
      </aside>}

      {/* Read-only page context, tucked above the composer. */}
      {doc && (
        <div className="shrink-0 px-4 pb-2">
          <div title={doc.title} className="flex min-w-0 items-center gap-2 rounded-full border border-white/70 bg-white/50 px-4 py-2.5 text-sm text-ink dark:border-white/10 dark:bg-white/5 dark:text-night-ink">
            <span aria-hidden="true">◎</span>
            <span className="truncate">{doc.title}</span>
          </div>
        </div>
      )}

      {/* composer */}
      <div className="shrink-0 px-3 pb-3 pt-1">
        <div className="pg-chat-composer rounded-[28px] border border-white/80 bg-white/90 px-5 pb-3 pt-4 shadow-soft dark:border-white/10 dark:bg-[#29221f]/95">
          <textarea
            suppressHydrationWarning
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={3}
            aria-label="Message PageGuide"
            placeholder="Ask PageGuide…"
            className="composer-input min-h-[84px] w-full resize-none overflow-y-auto bg-transparent text-base leading-7 text-ink outline-none placeholder:text-muted dark:text-night-ink dark:placeholder:text-night-muted"
          />
          <div className="mt-1 flex items-center justify-end">
            <button
              onClick={submit}
              disabled={busy || !input.trim()}
              title="Send"
              className="pg-chat-send flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 19V5m-6 6 6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        {adminNotice && <p role="status" className="mt-2 text-center text-sm text-muted dark:text-night-muted">{adminNotice}</p>}
        {admin && (
          <p data-testid="admin-usage" className="mt-2 text-center text-xs tabular-nums text-muted dark:text-night-muted">
            {tokens.toLocaleString()} tokens · {estimated ? '≈ ' : ''}${cost.toFixed(5)}{costUnknown ? ' + unpriced usage' : ''}
            <span className="block">Recorded usage · Guide usage not available</span>
          </p>
        )}
        <p className="mt-2 text-center text-xs text-muted dark:text-night-muted">PageGuide can make mistakes. Check important details.</p>
      </div>
    </section>
  );
}

function GuideCard({
  run,
  scratchpad,
  openEv,
  setOpenEv,
  onToggleJourney,
}: {
  run: GuideRun;
  scratchpad: Evidence[];
  openEv: string | null;
  setOpenEv: (n: string | null) => void;
  onToggleJourney: () => void;
}) {
  const [openStep, setOpenStep] = useState<number | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const evidenceId = useId();
  const citedEvidence = evidenceForAnswer(run.final?.answer || '', scratchpad);
  const stepEvidence = (i: number): Evidence => ({ name: `journey-step-${i}`, label: i === 0 ? 'Initial state' : `Step ${i}`, index: i, imageUrl: run.journey[i].screenshot!, caption: run.journey[i].instruction, capturedAt: run.journey[i].capturedAt });
  const dot = (s: string) =>
    s === 'done' ? 'bg-sage' : s === 'failed' ? 'bg-red-500' : s === 'running' ? 'bg-orange animate-pulse' : 'bg-line dark:bg-night-line';
  // Verification stays internal; only a genuinely verified completion gets a green badge.
  const statusPill = run.final?.status === 'Completed' && run.final.verification?.completed === true
    ? 'border-green-600 bg-green-50 text-green-700 dark:border-green-400 dark:bg-green-950 dark:text-green-300'
    : 'border-gray-300 bg-gray-100 text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300';
  const current = run.journey.find((j) => j.status === 'running');

  return (
    <div className="pg-guide-card min-w-0 max-w-full space-y-2">
      {/* task card */}
      <div className="rounded-xl border border-line bg-white px-3 py-2.5 shadow-soft dark:border-night-line dark:bg-night-panel">
        <div className="flex items-start justify-between gap-2">
          <div className="text-base font-semibold text-ink dark:text-night-ink">{run.task}</div>

        </div>
        <button aria-label="View Journey" aria-expanded={run.journeyOpen} onClick={onToggleJourney} className="mt-2 flex min-h-10 items-center gap-1 text-sm font-medium text-muted dark:text-night-muted">
          <span className={`transition-transform ${run.journeyOpen ? 'rotate-90' : ''}`}>▸</span> View Journey
        </button>
        {run.journeyOpen && (
          <div className="mt-2 space-y-2 border-t border-line pt-2 dark:border-night-line">
            {run.journey.map((j, i) => (
              <div key={i} className="text-sm leading-relaxed">
                {j.screenshot ? (
                  <EvidenceBadge ev={stepEvidence(i)} ariaLabel={`View step ${i}: ${j.instruction}`} onOpen={() => setOpenStep(i)}>
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot(j.status)}`} />
                    <span><span className="text-xs text-muted dark:text-night-muted">{i === 0 ? 'Initial state' : `Step ${i}`} · </span>{j.instruction}<span aria-hidden="true" className="ml-1 text-orange">▧</span></span>
                  </EvidenceBadge>
                ) : <div className="flex items-start gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot(j.status)}`} /><span>{j.instruction}{j.screenshotError && <span className="block text-xs text-muted">{j.screenshotError}</span>}</span></div>}
              </div>
            ))}
          </div>
        )}
        {run.running && current && (
          <div className="mt-2 flex items-center gap-2 border-t border-line pt-2 text-[11px] text-[#8c5a2b] dark:border-night-line dark:text-orange">
            <span className="pg-spinner" /> {current.instruction}
          </div>
        )}
      </div>

      {/* answer card */}
      {run.final && (
        <div className="min-w-0 max-w-full rounded-xl border border-orange-ring bg-white px-3 py-2.5 dark:border-night-line dark:bg-night-panel">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wide text-orange">Answer</span>
            <span data-testid="guide-status" className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusPill}`}>
              {run.final.status}
            </span>
          </div>
          <p className="mt-2 text-base leading-7 text-ink dark:text-night-ink">
            {renderAnswerWithEvidence(run.final.answer, scratchpad, setOpenEv)}
          </p>
          {citedEvidence.length > 0 && (
            <section aria-label="Saved evidence" className="mt-4 min-w-0 border-t border-orange-ring pt-2 dark:border-night-line">
              <button aria-expanded={evidenceOpen} aria-controls={evidenceId} onClick={() => setEvidenceOpen((open) => !open)}
                className="flex min-h-11 w-full items-center gap-2 rounded-lg text-left text-sm font-semibold text-ink hover:text-orange dark:text-night-ink">
                <span aria-hidden="true" className={`shrink-0 transition-transform ${evidenceOpen ? 'rotate-90' : ''}`}>▸</span>
                Saved evidence ({citedEvidence.length})
              </button>
              <div id={evidenceId} hidden={!evidenceOpen}>
                {evidenceOpen && <div className="pg-evidence-grid pt-2">
                  {citedEvidence.map((ev) => <div key={ev.name} className="min-w-0 rounded-xl border border-line bg-cream p-2 dark:border-night-line dark:bg-night">
                    <button onClick={() => setOpenEv(ev.name)} aria-label={`Enlarge screenshot ${ev.index}`} className="block w-full overflow-hidden rounded-lg bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ev.imageUrl} alt={ev.caption || ev.label || 'Agent-selected evidence'} className="h-28 w-full object-contain" />
                    </button>
                    <div className="mt-2 flex min-w-0 items-start gap-1">
                      <EvidenceBadge ev={ev} onOpen={() => setOpenEv(ev.name)} />
                      <span className="min-w-0 flex-1 text-sm leading-relaxed text-ink dark:text-night-ink">{ev.label || ev.caption}</span>
                    </div>
                  </div>)}
                </div>}
              </div>
            </section>
          )}

        </div>
      )}

      {openEv && <EvidenceViewer ev={scratchpad.find((e) => e.name === openEv)} onClose={() => setOpenEv(null)} />}
      {openStep !== null && <EvidenceViewer ev={stepEvidence(openStep)} onClose={() => setOpenStep(null)} />}
    </div>
  );
}

function renderAnswerWithEvidence(answer: string, scratchpad: Evidence[], setOpenEv: (n: string | null) => void) {
  const parts: ReactNode[] = [];
  const re = /\[EV:([a-z0-9-]+)\]/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(answer))) {
    if (m.index > last) parts.push(answer.slice(last, m.index));
    const ev = scratchpad.find((e) => e.name === m![1].toLowerCase());
    if (ev) {
      parts.push(
        <EvidenceBadge key={`ev${k++}`} ev={ev} onOpen={() => setOpenEv(ev.name)} />,
      );
    } else {
      parts.push(m[0]);
    }
    last = re.lastIndex;
  }
  if (last < answer.length) parts.push(answer.slice(last));
  return parts;
}

function EvidenceBadge({ ev, onOpen, children, ariaLabel }: { ev: Evidence; onOpen: () => void; children?: ReactNode; ariaLabel?: string }) {
  const previewId = useId();
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const keepOpen = () => clearTimeout(timer.current);
  const hide = () => { timer.current = setTimeout(() => setPosition(null), 180); };
  const show = () => {
    keepOpen();
    const rect = button.current!.getBoundingClientRect();
    window.dispatchEvent(new CustomEvent('pageguide-preview', { detail: previewId }));
    // Put the preview beside the panel on wide screens, never over other step controls.
    const beside = rect.left >= 340;
    const top = beside ? rect.top - 100 : rect.top >= 330 ? rect.top - 320 : rect.bottom + 10;
    setPosition({ left: beside ? rect.left - 336 : Math.max(8, Math.min(rect.left, window.innerWidth - 336)), top: Math.max(8, Math.min(top, window.innerHeight - 320)) });
  };
  useEffect(() => {
    const exclusive = (event: Event) => { if ((event as CustomEvent).detail !== previewId) setPosition(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setPosition(null); };
    window.addEventListener('pageguide-preview', exclusive);
    window.addEventListener('keydown', escape);
    return () => { clearTimeout(timer.current); window.removeEventListener('pageguide-preview', exclusive); window.removeEventListener('keydown', escape); };
  }, [previewId]);
  return (
    <>
      <button ref={button} aria-label={ariaLabel || `Screenshot evidence ${ev.index}`} aria-describedby={position ? previewId : undefined}
        onClick={() => { setPosition(null); onOpen(); }} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}
        onKeyDown={(e) => { if (e.key === 'Escape') setPosition(null); }}
        className={children ? 'flex w-full items-start gap-2 rounded-lg px-1 py-1 text-left text-sm text-ink hover:bg-orange-soft/40 dark:text-night-ink' : 'mx-1 inline-flex min-h-8 items-center gap-1 rounded-lg bg-orange-soft px-2 py-1 align-baseline text-sm font-semibold text-[#8c5a2b] hover:bg-orange/20'}>
        {children || <>📷 {ev.index}</>}
      </button>
      {position && createPortal(
        <div role="tooltip" id={previewId} onMouseEnter={keepOpen} onMouseLeave={hide}
          className="fixed z-[60] w-80 max-w-[calc(100vw-1rem)] rounded-2xl border border-orange-ring bg-white p-3 text-ink shadow-panel dark:border-night-line dark:bg-night-panel dark:text-night-ink"
          style={position}>
          <p className="mb-2 text-sm font-semibold">{ev.label || ev.caption || 'Saved screenshot'}</p>
          <EvidenceImage ev={ev} compact />
          {children && <p className="mt-2 text-xs">{ev.caption}</p>}
          <p className="mt-2 text-xs text-muted dark:text-night-muted">Click the badge to enlarge.</p>
        </div>, document.body,
      )}
    </>
  );
}

function EvidenceImage({ ev, compact = false }: { ev: Evidence; compact?: boolean }) {
  const b = ev.box;
  return <div className={`overflow-auto rounded-lg border border-line ${compact ? 'max-h-56' : 'max-h-[75vh]'}`}>
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ev.imageUrl} alt={ev.caption || ev.name} className="block h-auto w-full" />
      {b && <span className="pointer-events-none absolute rounded-sm border-2 border-orange bg-orange/10" style={{ left: `${b[0] * 100}%`, top: `${b[1] * 100}%`, width: `${b[2] * 100}%`, height: `${b[3] * 100}%` }}>
        {ev.annotation && <span className="absolute left-0 top-full mt-1 whitespace-nowrap rounded bg-orange px-2 py-1 text-xs text-white">{ev.annotation}</span>}
      </span>}
    </div>
  </div>;
}

function EvidenceViewer({ ev, onClose }: { ev: Evidence | undefined; onClose: () => void }) {
  if (!ev) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog" aria-label="Saved screenshot" aria-modal="true" tabIndex={-1}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        className="w-full max-w-4xl rounded-2xl border border-line bg-white p-3 shadow-panel dark:border-night-line dark:bg-night-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-[#8c5a2b]">📷 {ev.label || ev.name.replace(/-/g, ' ')}</span>
          <button aria-label="Close screenshot" autoFocus onClick={onClose} className="flex h-10 w-10 items-center justify-center text-muted hover:text-ink dark:text-night-muted">
            ✕
          </button>
        </div>
        <EvidenceImage ev={ev} />
        {ev.caption && <p className="mt-2 text-[11px] text-muted dark:text-night-muted">{ev.caption}</p>}
      </div>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
  active,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <div className="group relative flex items-center">
      <button
        onClick={onClick}
        aria-label={label}
        title={label}
        className={`flex h-11 w-11 items-center justify-center rounded-full text-[23px] leading-none transition-colors hover:bg-orange/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange ${
          active ? 'text-orange' : 'text-muted hover:text-ink dark:text-night-muted dark:hover:text-night-ink'
        }`}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute right-0 top-full z-40 mt-1.5 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-soft transition-opacity duration-150 group-hover:opacity-100">
        {label}
      </span>
    </div>
  );
}

function Message({
  m,
}: {
  m: { id: number; role: string; text: string; error?: boolean; action?: boolean; result?: any; selection?: PageSelection };
}) {
  if (m.role === 'user') {
    return (
      <div className="ml-6 whitespace-pre-wrap break-words rounded-3xl rounded-br-md bg-white/75 px-4 py-3 text-base leading-7 text-ink dark:bg-white/10 dark:text-night-ink">
        {m.selection && <blockquote className="mb-2 border-l-2 border-orange-ring pl-3 text-sm leading-relaxed text-muted dark:text-night-muted">“{m.selection.text}”</blockquote>}
        {m.text}
      </div>
    );
  }
  if (m.role === 'system') {
    return <div className="text-center text-sm leading-relaxed text-muted dark:text-night-muted">{m.text}</div>;
  }
  if (m.action) {
    return <div className="font-mono text-[11px] text-sage">{m.text}</div>;
  }
  const isFind = m.result?.kind === 'find';
  const citations = isFind ? m.result.citations || [] : [];
  const visual = isFind ? m.result.visual : null;
  return (
    <div className={`break-words text-base leading-7 ${m.error ? 'text-[#9b6443]' : 'text-ink dark:text-night-ink'}`}>
      {!m.error && (
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink dark:text-night-ink">
          <span>🍊</span> PageGuide
        </div>
      )}
      <p className={`whitespace-pre-wrap ${m.error ? 'rounded-lg bg-[#fff2e9] px-3 py-2 dark:bg-[#3a2a22]' : ''}`}>
        {isFind ? renderAnswer(m.text, citations, visual) : m.text}
      </p>
      {visual && <VisualEvidence v={visual} />}

    </div>
  );
}

// Render the answer text, turning [1], [2], [V1] tokens into clickable citation chips.
function renderAnswer(
  text: string,
  citations: { marker: string; id: string }[],
  visual: { marker: string; id: string } | null,
) {
  const parts: ReactNode[] = [];
  const re = /\[([A-Za-z]{0,2}\d+)\]/g;
  let last = 0;
  let mm: RegExpExecArray | null;
  let k = 0;
  while ((mm = re.exec(text))) {
    if (mm.index > last) parts.push(text.slice(last, mm.index));
    const marker = mm[1];
    const cite = citations.find((c) => c.marker === marker);
    if (cite) {
      parts.push(
        <button
          key={`c${k++}`}
          onClick={() => useStore.getState().focusEvidence(cite.id)}
          title="Show source on the page"
          className="align-super text-[9px] font-semibold text-[#6366f1] hover:underline dark:text-[#a5a1f5]"
        >
          [{marker}]
        </button>,
      );
    } else if (visual && visual.marker === marker) {
      parts.push(
        <button
          key={`v${k++}`}
          onClick={() => useStore.getState().focusEvidence(visual.id)}
          title="Show the image on the page"
          className="align-super text-[9px] font-semibold text-[#b7791f] hover:underline"
        >
          📎[{marker}]
        </button>,
      );
    } else {
      parts.push(mm[0]);
    }
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function VisualEvidence({
  v,
}: {
  v: { marker: string; id: string; src: string; box: [number, number, number, number]; caption?: string };
}) {
  const [x, y, w, h] = v.box;
  return (
    <div className="mt-2 rounded-lg border border-line bg-cream p-1.5 dark:border-night-line dark:bg-night">
      <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-[#b7791f]">
        📎 Visual evidence [{v.marker}]
      </div>
      <button
        onClick={() => useStore.getState().focusEvidence(v.id)}
        className="relative block w-full overflow-hidden rounded-md"
        title="Show this image on the page"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={v.src} alt={v.caption || 'Visual evidence'} className="block max-h-44 w-auto rounded-md" />
        <span
          className="pointer-events-none absolute rounded-sm border-2 border-[#3b82f6] bg-[#3b82f6]/15"
          style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }}
        />
      </button>
      {v.caption && <div className="mt-1 text-[10px] text-muted dark:text-night-muted">{v.caption}</div>}
    </div>
  );
}
