'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, currentModel } from '@/lib/store';
import { PROVIDERS, prettyModel } from '@/lib/providers';

export default function TerminalSurface({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { settings, doc, results, messages, guide, busy, pageError, loadUrl, search, openResult, ask, guideNext } =
    useStore();
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, results, guide, busy, pageError]);

  const blockText = useMemo(() => {
    const map = new Map<string, string>();
    doc?.blocks.forEach((b) => map.set(b.id, b.text));
    return map;
  }, [doc]);

  const run = () => {
    const t = input.trim();
    if (!t) return;
    setInput('');
    const [cmd, ...rest] = t.split(/\s+/);
    const arg = rest.join(' ');
    switch (cmd.toLowerCase()) {
      case 'open':
        if (/^\d+$/.test(arg) && results && results[Number(arg) - 1]) return void openResult(results[Number(arg) - 1].url);
        return void loadUrl(arg || t);
      case 'search':
        return void search(arg);
      case 'find':
        return void ask(arg, 'find');
      case 'guide':
        return void ask(arg, 'guide');
      case 'next':
        return guideNext();
      case 'help':
        return; // help is always shown in the banner
      default:
        return void ask(t);
    }
  };

  const guideActive = guide && guide.current < guide.steps.length;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#2b3b2f] bg-[#0f1511] font-mono text-[12.5px] text-[#c9e2cb] shadow-panel">
      {/* title bar */}
      <div className="flex items-center justify-between border-b border-[#223027] bg-[#0b100d] px-4 py-2">
        <div className="flex items-center gap-2 text-[#8fcaa0]">
          <span className="text-orange">🍊</span> pageguide — terminal
        </div>
        <div className="flex items-center gap-3 text-[#5f7a66]">
          <span>
            {PROVIDERS[settings.provider].label.toLowerCase()}:{prettyModel(currentModel(settings))}
          </span>
          <button onClick={onOpenSettings} className="hover:text-[#c9e2cb]" title="Settings">
            [cfg]
          </button>
        </div>
      </div>

      {/* log */}
      <div className="pg-scroll flex-1 overflow-auto px-4 py-3 leading-relaxed">
        <pre className="whitespace-pre-wrap text-[#5f7a66]">{BANNER}</pre>
        {doc && (
          <div className="mt-1 text-[#6f9a79]">
            ● loaded <span className="text-[#cfe9d2]">{doc.title}</span>{' '}
            <span className="text-[#48604f]">({doc.blocks.length} blocks · {doc.url})</span>
          </div>
        )}
        {pageError && <div className="mt-1 text-[#d98b6a]">! {pageError}</div>}

        {results && (
          <div className="mt-2">
            <div className="text-[#6f9a79]">search results — type "open &lt;n&gt;" to load one:</div>
            {results.map((r, i) => (
              <div key={i} className="mt-1">
                <span className="text-orange">[{i + 1}]</span> <span className="text-[#cfe9d2]">{r.title}</span>
                <div className="pl-7 text-[#4e6755]">{new URL(r.url).hostname} — {r.snippet}</div>
              </div>
            ))}
          </div>
        )}

        {messages.map((m) => (
          <TermLine key={m.id} m={m} blockText={blockText} />
        ))}

        {guideActive && (
          <div className="mt-2 border-l-2 border-orange pl-3">
            <div className="text-orange">
              step {guide!.current + 1}/{guide!.steps.length}: {guide!.steps[guide!.current].instruction}
            </div>
            <div className="text-[#4e6755]">target ► {blockText.get(guide!.steps[guide!.current].id) || guide!.steps[guide!.current].id}</div>
            <div className="text-[#48604f]">type "next" to advance</div>
          </div>
        )}

        {busy && <div className="mt-1 animate-pulse text-[#6f9a79]">… reading the page</div>}
        <div ref={endRef} />
      </div>

      {/* input */}
      <div className="flex items-center gap-2 border-t border-[#223027] bg-[#0b100d] px-4 py-2.5">
        <span className="text-orange">pg ▸</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          autoFocus
          spellCheck={false}
          placeholder='open <url> · search <q> · find "…" · guide "…" · next'
          className="w-full bg-transparent text-[#c9e2cb] outline-none placeholder:text-[#3f5445]"
        />
      </div>
    </div>
  );
}

const BANNER = `PageGuide terminal — Find & Guide on any page
commands: open <url|n>, search <query>, find "question", guide "task", next, help`;

function TermLine({
  m,
  blockText,
}: {
  m: { id: number; role: string; text: string; error?: boolean; result?: any };
  blockText: Map<string, string>;
}) {
  if (m.role === 'user') return <div className="mt-2 text-[#9fd3ab]">▸ {m.text}</div>;
  if (m.role === 'system') return <div className="mt-1 text-[#4e6755]">• {m.text}</div>;
  const ev = m.result?.kind === 'find' ? m.result.citations?.[0]?.id : null;
  return (
    <div className={`mt-1 ${m.error ? 'text-[#d98b6a]' : 'text-[#c9e2cb]'}`}>
      <span className="text-orange">🍊</span> {m.text}
      {ev && blockText.get(ev) && (
        <div className="mt-1 border-l-2 border-[#b9933f] bg-[#2a2614] px-2 py-1 text-[#f0e2b4]">
          ► {blockText.get(ev)}
        </div>
      )}
    </div>
  );
}
