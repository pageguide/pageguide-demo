'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore, currentModel } from '@/lib/store';
import { PROVIDERS, prettyModel } from '@/lib/providers';

export default function SidePanel({ onOpenSettings }: { onOpenSettings: () => void }) {
  const {
    settings,
    auto,
    setAuto,
    doc,
    messages,
    busy,
    guide,
    ask,
    loadUrl,
    search,
    clearChat,
    toggleDark,
    guideNext,
    reset,
    saveChat,
    history,
    historyOpen,
    toggleHistory,
    loadChat,
    deleteChat,
    devMode,
    toggleDev,
    admin,
    unlockAdmin,
    lockAdmin,
  } = useStore();
  const [input, setInput] = useState('');
  const [autoOpen, setAutoOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [adminPw, setAdminPw] = useState('');
  const [adminErr, setAdminErr] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, guide]);

  const providerLabel = PROVIDERS[settings.provider].label;
  const modelLabel = prettyModel(currentModel(settings));

  const submit = () => {
    const t = input.trim();
    if (!t) return;
    setInput('');
    if (/^\/open\s+/i.test(t)) return void loadUrl(t);
    if (/^\/search\s+/i.test(t)) return void search(t);
    if (/^\/clear\b/i.test(t)) return clearChat();
    void ask(t);
  };

  const guideActive = guide && guide.current < guide.steps.length;

  return (
    <div className="relative flex h-full flex-col bg-white dark:bg-night-panel">
      {/* header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3 dark:border-night-line">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-ink dark:text-night-ink">
          <span>🍊</span> PageGuide
        </div>
        <div className="flex items-center gap-4">
          <IconBtn label={settings.dark ? 'Light mode' : 'Dark mode'} onClick={toggleDark}>
            {settings.dark ? '☀' : '☾'}
          </IconBtn>
          <IconBtn label="Chat history" onClick={() => toggleHistory()}>
            ⟲
          </IconBtn>
          <IconBtn label="New chat" onClick={reset}>
            ✎
          </IconBtn>
          <IconBtn label="Save chat" onClick={saveChat}>
            ⤓
          </IconBtn>
          {admin && (
            <IconBtn label={devMode ? 'Dev inspector: on' : 'Dev inspector'} onClick={toggleDev} active={devMode}>
              🔧
            </IconBtn>
          )}
          {admin && (
            <IconBtn label="Settings" onClick={onOpenSettings}>
              ⚙
            </IconBtn>
          )}
        </div>
      </div>

      {historyOpen && (
        <HistoryPanel
          history={history}
          onLoad={loadChat}
          onDelete={deleteChat}
          onSave={saveChat}
          onClose={() => toggleHistory(false)}
        />
      )}

      {/* provider badge */}
      <div className="flex justify-center px-4 pt-3">
        <div className="rounded-full border border-sage-soft bg-sage-soft/60 px-3 py-1 text-[11px] text-sage dark:border-night-line dark:bg-night dark:text-[#a9bb95]">
          🤖 Using <strong className="font-semibold text-ink dark:text-night-ink">{providerLabel}</strong> · {modelLabel}
        </div>
      </div>

      {/* conversation */}
      <div ref={logRef} className="pg-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="mt-6 text-center text-[12px] leading-relaxed text-muted dark:text-night-muted">
            <p className="mb-2 text-[13px] font-medium text-ink dark:text-night-ink">Ask about the page.</p>
            <p>
              Open a URL or search in the address bar, then ask to <strong>Find</strong> the answer, or ask how to do
              something to <strong>Guide</strong> you. Tip: start with <code>/find</code> or <code>/guide</code> to force
              a mode.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <Message key={m.id} m={m} />
        ))}
        {guideActive && (
          <div className="rounded-lg border border-orange-ring bg-orange-soft/60 px-3 py-2.5 text-[11px] dark:border-night-line dark:bg-[#3a2c1f]">
            <div className="mb-1 flex items-center gap-2 font-semibold text-[#8c5a2b] dark:text-orange">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange text-[9px] text-white">
                {guide!.current + 1}
              </span>
              Step {guide!.current + 1} of {guide!.steps.length}
            </div>
            <p className="text-[#7a5a34] dark:text-[#e2c4a2]">{guide!.steps[guide!.current].instruction}</p>
            <p className="mt-1 text-[10px] text-muted dark:text-night-muted">
              {auto === 'noask'
                ? 'PageGuide is performing this step…'
                : 'Click the outlined control, or press “Do this step”.'}
            </p>
            {auto === 'ask' && (
              <button
                onClick={guideNext}
                className="mt-2 rounded-md border border-sage/40 bg-sage-soft px-2.5 py-1 text-[10px] font-medium text-sage"
              >
                ▶ Do this step
              </button>
            )}
          </div>
        )}
        {busy && <div className="animate-pulse text-[11px] text-muted dark:text-night-muted">Reading the page…</div>}
      </div>

      {/* context chip */}
      {doc && (
        <div className="px-3 pb-1">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-orange-ring bg-orange-soft/50 px-3 py-2 text-[11px] dark:border-night-line dark:bg-night">
            <span className="flex items-center gap-2 truncate text-ink dark:text-night-ink">
              {doc.favicon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={doc.favicon} alt="" width={14} height={14} />
              )}
              Working on <strong className="truncate font-semibold">“{doc.title}”</strong>
            </span>
            <button onClick={reset} className="text-muted hover:text-ink dark:text-night-muted" aria-label="Clear page">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* composer */}
      <div className="border-t border-line px-3 py-3 dark:border-night-line">
        <div
          suppressHydrationWarning
          className="rounded-xl border border-line bg-cream px-3 py-2 dark:border-night-line dark:bg-night"
        >
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
            rows={4}
            placeholder="Ask anything… (type / for commands)"
            className="composer-input min-h-[88px] w-full resize-none overflow-y-auto bg-transparent text-[13px] leading-6 text-ink outline-none placeholder:text-muted dark:text-night-ink dark:placeholder:text-night-muted"
          />
          <div className="mt-1 flex items-center gap-2">
            <button title="Attach (coming soon)" className="text-muted hover:text-ink dark:text-night-muted">
              📎
            </button>
            <button
              onClick={clearChat}
              className="flex items-center gap-1 text-[11px] text-muted hover:text-ink dark:text-night-muted"
            >
              ✎ Clear
            </button>
            <div className="relative">
              <button
                onClick={() => setAutoOpen((v) => !v)}
                className="flex items-center gap-1 rounded-full border border-orange-ring px-2.5 py-1 text-[11px] font-medium text-[#8c5a2b] dark:border-night-line dark:text-orange"
              >
                ⚡ Auto: {auto === 'noask' ? 'No Ask' : 'Ask'} ▾
              </button>
              {autoOpen && (
                <div className="absolute bottom-8 left-0 z-10 w-44 rounded-lg border border-line bg-white p-1 text-[11px] shadow-panel dark:border-night-line dark:bg-night-panel">
                  {(['noask', 'ask'] as const).map((a) => (
                    <button
                      key={a}
                      onClick={() => {
                        setAuto(a);
                        setAutoOpen(false);
                      }}
                      className="block w-full rounded px-2 py-1.5 text-left hover:bg-cream dark:hover:bg-night"
                    >
                      {a === 'noask' ? 'No Ask — agent performs steps' : 'Ask — confirm each step'}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setMoreOpen((v) => !v)}
                aria-label="More"
                className="px-1 text-muted hover:text-ink dark:text-night-muted"
              >
                ···
              </button>
              {moreOpen && (
                <div className="absolute bottom-8 left-0 z-20 w-56 rounded-lg border border-line bg-white p-2 text-[11px] shadow-panel dark:border-night-line dark:bg-night-panel">
                  {admin ? (
                    <button
                      onClick={() => {
                        lockAdmin();
                        setMoreOpen(false);
                      }}
                      className="block w-full rounded px-2 py-1.5 text-left hover:bg-cream dark:hover:bg-night"
                    >
                      🔓 Admin mode on — click to lock
                    </button>
                  ) : (
                    <div>
                      <div className="mb-1 font-medium text-ink dark:text-night-ink">🔒 Admin mode</div>
                      <input
                        type="password"
                        value={adminPw}
                        autoComplete="off"
                        placeholder="Password"
                        onChange={(e) => {
                          setAdminPw(e.target.value);
                          setAdminErr(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (unlockAdmin(adminPw)) {
                              setMoreOpen(false);
                              setAdminPw('');
                            } else setAdminErr(true);
                          }
                        }}
                        className="w-full rounded border border-line bg-cream px-2 py-1 text-[11px] text-ink outline-none focus:border-orange dark:border-night-line dark:bg-night dark:text-night-ink"
                      />
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (unlockAdmin(adminPw)) {
                              setMoreOpen(false);
                              setAdminPw('');
                              setAdminErr(false);
                            } else setAdminErr(true);
                          }}
                          className="rounded bg-ink px-2 py-1 text-[10px] font-medium text-white dark:bg-orange"
                        >
                          Unlock
                        </button>
                        {adminErr && <span className="text-[10px] text-[#9b6443]">Wrong password</span>}
                      </div>
                      <p className="mt-1.5 text-[9px] leading-snug text-muted dark:text-night-muted">
                        Unlocks Settings and the developer inspector.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={submit}
              disabled={busy}
              title="Send"
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-orange text-white disabled:opacity-50"
              aria-label="Send"
            >
              ➤
            </button>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted dark:text-night-muted">
          PageGuide can make mistakes ⓘ
          {(() => {
            const total = messages.reduce((a, m) => a + (m.result?.usage?.cost || 0), 0);
            return total > 0 ? ` · session ${total < 0.01 ? `$${total.toFixed(5)}` : `$${total.toFixed(4)}`}` : '';
          })()}
        </p>
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
        className={`text-[20px] leading-none transition-colors ${
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

function HistoryPanel({
  history,
  onLoad,
  onDelete,
  onSave,
  onClose,
}: {
  history: { id: string; title: string; savedAt: number; url: string | null }[];
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-x-0 top-[49px] z-20 mx-3 max-h-[70%] overflow-auto rounded-xl border border-line bg-white p-2 shadow-panel dark:border-night-line dark:bg-night-panel">
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-[12px] font-semibold text-ink dark:text-night-ink">Saved chats</span>
        <div className="flex items-center gap-2">
          <button onClick={onSave} className="rounded-md bg-orange px-2 py-1 text-[10px] font-medium text-white">
            ⤓ Save current
          </button>
          <button onClick={onClose} className="text-muted hover:text-ink dark:text-night-muted">
            ✕
          </button>
        </div>
      </div>
      {history.length === 0 && (
        <p className="px-2 py-3 text-center text-[11px] text-muted dark:text-night-muted">
          No saved chats yet. Press “Save current” to keep this one.
        </p>
      )}
      {history.map((c) => (
        <div
          key={c.id}
          className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-cream dark:hover:bg-night"
        >
          <button onClick={() => onLoad(c.id)} className="min-w-0 flex-1 text-left">
            <div className="truncate text-[12px] text-ink dark:text-night-ink">{c.title}</div>
            <div className="truncate text-[10px] text-muted dark:text-night-muted">
              {new Date(c.savedAt).toLocaleString()} {c.url ? `· ${safeHost(c.url)}` : ''}
            </div>
          </button>
          <button
            onClick={() => onDelete(c.id)}
            className="text-[11px] text-muted hover:text-[#9b6443]"
            aria-label="Delete"
          >
            🗑
          </button>
        </div>
      ))}
    </div>
  );
}

function UsageLine({
  usage,
}: {
  usage: { prompt: number; completion: number; total: number; cost: number | null; estimated: boolean };
}) {
  const cost =
    usage.cost == null
      ? null
      : usage.cost < 0.01
        ? `$${usage.cost.toFixed(5)}`
        : `$${usage.cost.toFixed(4)}`;
  return (
    <div className="mt-1 font-mono text-[9.5px] text-muted dark:text-night-muted">
      {usage.total.toLocaleString()} tokens ({usage.prompt.toLocaleString()} in / {usage.completion.toLocaleString()} out)
      {cost && (
        <>
          {' · '}
          <span className="text-sage">{cost}</span> {usage.estimated ? '(est.)' : '(reported)'}
        </>
      )}
    </div>
  );
}

function safeHost(u: string): string {
  try {
    return new URL(u).hostname;
  } catch {
    return u;
  }
}

function Message({
  m,
}: {
  m: { id: number; role: string; text: string; error?: boolean; action?: boolean; result?: any };
}) {
  if (m.role === 'user') {
    return (
      <div className="ml-6 rounded-xl rounded-br-sm bg-sage-soft px-3 py-2 text-[12px] text-[#4e5945] dark:bg-night dark:text-night-ink">
        {m.text}
      </div>
    );
  }
  if (m.role === 'system') {
    return <div className="text-center text-[10.5px] italic text-muted dark:text-night-muted">{m.text}</div>;
  }
  if (m.action) {
    return <div className="font-mono text-[11px] text-sage">{m.text}</div>;
  }
  const isFind = m.result?.kind === 'find';
  const citations = isFind ? m.result.citations || [] : [];
  const visual = isFind ? m.result.visual : null;
  const devMode = useStore((s) => s.devMode);
  return (
    <div className={`text-[12px] leading-relaxed ${m.error ? 'text-[#9b6443]' : 'text-[#5a6350] dark:text-[#c3c8ba]'}`}>
      {!m.error && (
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold text-ink dark:text-night-ink">
          <span>🍊</span> PageGuide
        </div>
      )}
      <p className={m.error ? 'rounded-lg bg-[#fff2e9] px-3 py-2 dark:bg-[#3a2a22]' : ''}>
        {isFind ? renderAnswer(m.text, citations, visual) : m.text}
      </p>
      {visual && <VisualEvidence v={visual} />}
      {m.result?.usage && <UsageLine usage={m.result.usage} />}
      {devMode && m.result?.debug && <DebugPanel debug={m.result.debug} />}
    </div>
  );
}

function DebugPanel({ debug }: { debug: import('@/lib/types').AskDebug }) {
  const Block = ({ title, body }: { title: string; body: string }) => (
    <div className="mt-1.5">
      <div className="text-[9px] font-semibold uppercase tracking-wide text-[#8c6b3b]">{title}</div>
      <pre className="pg-scroll mt-0.5 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-[#1b1e1a] px-2 py-1.5 text-[9.5px] leading-snug text-[#c9e2cb]">
        {body || '(empty)'}
      </pre>
    </div>
  );
  return (
    <details className="mt-2 rounded-lg border border-[#e1d8bf] bg-[#faf7ef] px-2 py-1.5 dark:border-night-line dark:bg-night">
      <summary className="cursor-pointer text-[10px] font-semibold text-[#8c6b3b]">
        🔧 Inspect ({debug.provider} · {debug.model})
      </summary>
      <Block title="System prompt" body={debug.system} />
      <Block title="Input (page blocks + question)" body={debug.input} />
      {debug.images.length > 0 && <Block title={`Input images (${debug.images.length})`} body={debug.images.join('\n')} />}
      <Block title="Raw model output" body={debug.rawOutput} />
    </details>
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
          onClick={() => useStore.setState({ highlightId: cite.id })}
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
          onClick={() => useStore.setState({ highlightId: visual.id })}
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
        onClick={() => useStore.setState({ highlightId: v.id })}
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
