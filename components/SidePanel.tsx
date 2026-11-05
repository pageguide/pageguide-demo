'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useStore, type GuideRun } from '@/lib/store';
import type { AskDebug, Evidence, PageSelection, Usage } from '@/lib/types';
import { evidenceForAnswer } from '@/lib/evidence';

const MODES = [
  { id: 'find', label: 'Find', desc: 'Answer a question about this page, with the sources highlighted. Read-only — takes no actions.' },
  { id: 'auto', label: 'Auto', desc: 'Let the agent complete a task on this page automatically, performing each step itself.' },
  { id: 'manual', label: 'Manual', desc: 'Follow the on-page arrow and click each highlighted control to advance one step at a time.' },
] as const;

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
    pendingConfirm,
    resolveConfirm,
    uiMode,
    setUiMode,
    composerDraft,
    composerFocusRevision,
  } = useStore();
  const [modeMenu, setModeMenu] = useState(false);
  const [modeInfo, setModeInfo] = useState(false);
  const [input, setInput] = useState('');
  const [adminNotice, setAdminNotice] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setInput(composerDraft);
    inputRef.current?.focus();
  }, [composerDraft, composerFocusRevision]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, guideRun, pendingConfirm]);

  const guideRuns = [...messages.flatMap((m) => m.guide ? [m.guide.run] : []), ...(guideRun ? [guideRun] : [])];
  const usages: Usage[] = [
    ...messages.flatMap((m) => m.result?.usage ? [m.result.usage] : []),
    ...guideRuns.flatMap((run) => run.admin?.usages || []),
  ];
  const diagnostics: AskDebug[] = [
    ...messages.flatMap((m) => m.result?.debug ? [m.result.debug] : []),
    ...guideRuns.flatMap((run) => run.admin?.requests || []),
  ];
  const latestDiagnostic = diagnostics[diagnostics.length - 1];
  const tokens = usages.reduce((sum, usage) => sum + usage.total, 0);
  const cost = usages.reduce((sum, usage) => sum + (usage.cost ?? 0), 0);
  const costUnknown = usages.some((usage) => usage.cost === null);
  const estimated = usages.some((usage) => usage.estimated);

  const pickMode = (m: 'find' | 'auto' | 'manual') => { setUiMode(m); setModeMenu(false); setModeInfo(false); if (input.trim() === '/') setInput(''); };

  const submit = () => {
    const t = input.trim();
    if (!t || busy) return;
    // "/" alone opens the mode menu instead of sending.
    if (t === '/') { setModeMenu(true); return; }
    // Quick mode switch: /find, /auto, /manual.
    const modeCmd = t.match(/^\/(find|auto|manual)\b/i);
    if (modeCmd) { pickMode(modeCmd[1].toLowerCase() as 'find' | 'auto' | 'manual'); setInput(''); return; }
    setInput('');
    setModeMenu(false);
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
    void ask(t, uiMode === 'find' ? 'find' : 'guide');
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
          <IconBtn label="Clear chat" onClick={() => { clearChat(); setAdminNotice(''); }}>
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
          m.guide
            ? <GuideCard key={m.id} run={m.guide.run} scratchpad={m.guide.scratchpad} />
            : <Message key={m.id} m={m} />
        ))}
        {guideRun && <GuideCard key={`run-${guideRun.id}`} run={guideRun} scratchpad={scratchpad} />}
        {pendingConfirm && (
          <div role="alertdialog" aria-label={pendingConfirm.mode === 'step' ? 'Next step' : 'Confirm action'} className="rounded-2xl border-2 border-orange bg-white px-4 py-3 shadow-soft dark:border-orange dark:bg-night-panel">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#a85024] dark:text-orange">
              <span aria-hidden="true">{pendingConfirm.mode === 'step' ? '→' : '⚠'}</span> {pendingConfirm.title}
            </div>
            <p className="mt-2 text-sm text-ink dark:text-night-ink"><span className="italic">“{pendingConfirm.instruction}”</span></p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted dark:text-night-muted">
              {pendingConfirm.detail}
              {pendingConfirm.mode === 'step'
                ? ' The target is highlighted on the page.'
                : ' This action can’t be undone.'}
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => resolveConfirm(true)} className="flex-1 rounded-xl bg-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange">{pendingConfirm.mode === 'step' ? 'Do this step' : 'Approve'}</button>
              <button onClick={() => resolveConfirm(false)} className="flex-1 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-orange-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange dark:border-night-line dark:text-night-ink dark:hover:bg-white/5">{pendingConfirm.mode === 'step' ? 'Stop' : 'Deny'}</button>
            </div>
          </div>
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
            ref={inputRef}
            suppressHydrationWarning
            value={input}
            onChange={(e) => { const v = e.target.value; setInput(v); setModeMenu(v.trim() === '/'); if (v) setModeInfo(false); }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setModeMenu(false); setModeInfo(false); return; }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={3}
            aria-label="Message PageGuide"
            placeholder="Ask PageGuide…  (type / to pick a mode)"
            className="composer-input min-h-[84px] w-full resize-none overflow-y-auto bg-transparent text-base leading-7 text-ink outline-none placeholder:text-muted dark:text-night-ink dark:placeholder:text-night-muted"
          />
          <div className="relative mt-1 flex items-center justify-between gap-2">
            {(modeMenu || modeInfo) && (
              <div className="absolute bottom-full left-0 z-30 mb-2 w-72 rounded-2xl border border-line bg-white p-1.5 shadow-panel dark:border-night-line dark:bg-night-panel" role="listbox" aria-label="Choose a mode">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-orange">{modeMenu ? 'Choose a mode' : 'What the modes do'}</p>
                {MODES.map((m) => (
                  <button key={m.id} type="button" onClick={() => pickMode(m.id)} role="option" aria-selected={uiMode === m.id}
                    className={`block w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-orange-soft dark:hover:bg-white/5 ${uiMode === m.id ? 'bg-orange-soft dark:bg-white/5' : ''}`}>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-ink dark:text-night-ink">{m.label}{uiMode === m.id && <span className="text-[10px] font-medium text-orange">· current</span>}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted dark:text-night-muted">{m.desc}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div role="group" aria-label="Mode" className="flex items-center rounded-full border border-line p-0.5 text-xs font-medium dark:border-night-line">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => pickMode(m.id)}
                    aria-pressed={uiMode === m.id}
                    title={m.desc}
                    className={`rounded-full px-2.5 py-1 transition-colors ${uiMode === m.id ? 'bg-orange text-white' : 'text-muted hover:text-ink dark:text-night-muted dark:hover:text-night-ink'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <button type="button" aria-label="What do the modes mean?" aria-expanded={modeInfo} onClick={() => { setModeInfo((o) => !o); setModeMenu(false); }}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-line text-[11px] font-bold text-muted transition-colors hover:text-ink dark:border-night-line dark:text-night-muted dark:hover:text-night-ink">ⓘ</button>
            </div>
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
          <div className="mt-2 text-center text-xs tabular-nums text-muted dark:text-night-muted">
            <p data-testid="admin-usage">
              {tokens.toLocaleString()} tokens · {estimated ? '≈ ' : ''}${cost.toFixed(5)}{costUnknown ? ' + unpriced usage' : ''}
              <span className="block">Recorded model usage</span>
            </p>
            <AdminInspector debug={latestDiagnostic} />
          </div>
        )}
        <p className="mt-2 text-center text-xs text-muted dark:text-night-muted">PageGuide can make mistakes. Check important details.</p>
      </div>
    </section>
  );
}

function AdminInspector({ debug }: { debug: AskDebug | undefined }) {
  if (!debug) return <p data-testid="admin-inspector-empty" className="mt-2">No model request has been recorded yet.</p>;
  return (
    <details data-testid="admin-inspector" className="mt-2 rounded-lg border border-line bg-white/60 p-2 text-left dark:border-night-line dark:bg-white/5">
      <summary className="cursor-pointer text-center font-semibold text-ink dark:text-night-ink">Latest model request</summary>
      <p className="mt-2 text-center">{debug.provider} · {debug.model}</p>
      <PromptBlock label="System prompt" value={debug.system} />
      <PromptBlock label="Input prompt" value={debug.input} />
      <PromptBlock label="Raw response" value={debug.rawOutput} />
    </details>
  );
}

function PromptBlock({ label, value }: { label: string; value: string }) {
  return <details className="mt-2 rounded border border-line/70 p-1.5 dark:border-night-line">
    <summary className="cursor-pointer font-medium text-ink dark:text-night-ink">{label}</summary>
    <pre className="pg-scroll mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-relaxed text-muted dark:text-night-muted">{value}</pre>
  </details>;
}

function GuideCard({
  run,
  scratchpad,
}: {
  run: GuideRun;
  scratchpad: Evidence[];
}) {
  const [openEv, setOpenEv] = useState<string | null>(null);
  const [journeyOpen, setJourneyOpen] = useState(true);
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
        <button aria-label="View Journey" aria-expanded={journeyOpen} onClick={() => setJourneyOpen((o) => !o)} className="mt-2 flex min-h-10 items-center gap-1 text-sm font-medium text-muted dark:text-night-muted">
          <span className={`transition-transform ${journeyOpen ? 'rotate-90' : ''}`}>▸</span> View Journey
        </button>
        {journeyOpen && (
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
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-orange">Answer</span>
            <div className="flex items-center gap-1">
              <span data-testid="guide-status" className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusPill}`}>
                {run.final.status}
              </span>
              {run.final.answer.trim() && <CopyButton text={cleanAnswer(run.final.answer)} />}
            </div>
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
                    {ev.imageUrl && <button onClick={() => setOpenEv(ev.name)} aria-label={`Enlarge screenshot ${ev.index}`} className="block w-full overflow-hidden rounded-lg bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ev.imageUrl} alt={ev.caption || ev.label || 'Agent-selected evidence'} className="h-28 w-full object-contain" />
                    </button>}
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
  const alignRight = b ? b[0] + b[2] / 2 > .5 : false;
  const labelAbove = b ? b[1] + b[3] > .8 && b[1] > .12 : false;
  const labelInside = b ? b[1] + b[3] > .8 && !labelAbove : false;
  const scrollRef = useRef<HTMLDivElement>(null);
  // Scroll a tall full-page capture so the highlighted target region is centered, not the page top.
  const focusBox = (img: HTMLImageElement) => {
    const cont = scrollRef.current;
    if (!cont || !b || !img.clientHeight) return;
    const centerY = (b[1] + b[3] / 2) * img.clientHeight;
    cont.scrollTop = Math.max(0, Math.min(centerY - cont.clientHeight / 2, cont.scrollHeight - cont.clientHeight));
  };
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => { const img = imgRef.current; if (img?.complete) focusBox(img); }); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={scrollRef} className={`overflow-auto rounded-lg border border-line ${compact ? 'max-h-56' : 'max-h-[75vh]'}`}>
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imgRef} onLoad={(e) => focusBox(e.currentTarget)} src={ev.imageUrl} alt={ev.caption || ev.name} className="block h-auto w-full" />
      {b && <span data-testid="evidence-box" className="pointer-events-none absolute rounded-sm border-2 border-orange bg-orange/10" style={{ left: `${b[0] * 100}%`, top: `${b[1] * 100}%`, width: `${b[2] * 100}%`, height: `${b[3] * 100}%` }} />}
      {b && ev.annotation && <span data-testid="evidence-annotation" className="pointer-events-none absolute break-words rounded bg-orange px-2 py-1 text-xs text-white [overflow-wrap:anywhere]" style={{
        ...(alignRight ? { right: `${(1 - b[0] - b[2]) * 100}%` } : { left: `${b[0] * 100}%` }),
        ...(labelAbove ? { bottom: `${(1 - b[1]) * 100}%`, marginBottom: 4 } : { top: `${(labelInside ? b[1] : b[1] + b[3]) * 100}%`, marginTop: 4 }),
        maxWidth: `min(18rem, calc(${(alignRight ? b[0] + b[2] : 1 - b[0]) * 100}% - 8px))`,
      }}>{ev.annotation}</span>}
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

// Strip inline citation/evidence markers so copied text reads naturally.
function cleanAnswer(text: string): string {
  return text
    .replace(/\[([A-Za-z]{0,2}\d+)\]/g, '') // Find markers: [1], [V1]
    .replace(/\[EV:[a-z0-9-]+\]/gi, '') // Guide markers: [EV:name]
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([.,;:!?])/g, '$1')
    .trim();
}

// Small inline "copy to clipboard" button with a transient confirmation.
function CopyButton({ text, label = 'Copy answer' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const copy = async () => {
    const value = text.trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Clipboard unavailable (insecure context / denied): fail silently. */
    }
  };
  return (
    <button
      onClick={copy}
      aria-label={label}
      title={copied ? 'Copied' : label}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-orange/10 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange dark:text-night-muted dark:hover:text-night-ink"
    >
      {copied ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M5 12l4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
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
        <div className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold text-ink dark:text-night-ink">
          <span className="flex items-center gap-2"><span>🍊</span> PageGuide</span>
          {m.text.trim() && <CopyButton text={cleanAnswer(m.text)} />}
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
  citations: { marker: string; id: string; quote?: string }[],
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
          title={cite.quote ? `“${cite.quote}”` : 'Show source on the page'}
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
