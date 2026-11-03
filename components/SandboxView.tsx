'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import type { Block, PageDoc } from '@/lib/types';

// No iframe scripts or untrusted HTML: every visible control is backed by the shared state reducer.
export default function SandboxView({ doc }: { doc: PageDoc }) {
  const evidence = useStore((s) => s.evidence);
  const focused = useStore((s) => s.focusedEvidence);
  const guide = useStore((s) => s.guide);
  const act = useStore((s) => s.actOnSandbox);
  const running = useStore((s) => s.guideRun?.running);
  const root = useRef<HTMLDivElement>(null);
  const guideId = guide?.steps[guide.current]?.id;
  useEffect(() => {
    const id = focused || guideId;
    if (id) root.current?.querySelector(`[data-node-id="${id}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [focused, guideId]);

  const render = (b: Block) => {
    const ev = evidence.find((e) => e.id === b.id);
    const marker = ev?.marker && <span className="ml-2 inline-flex rounded-md bg-[#f0792b] px-2 py-0.5 align-middle text-xs font-semibold text-white">Evidence {ev.marker}</span>;
    const attrs = {
      key: b.id, 'data-node-id': b.id,
      className: `${b.id === guideId ? 'pg-guide' : b.id === focused ? 'pg-visual' : ev ? 'pg-evidence' : ''}`,
    };
    if (b.type === 'button') return (
      <button {...attrs} disabled={running} onClick={() => act({ type: 'click', id: b.id })}
        className={`${attrs.className} sandbox-button ${b.id.startsWith('add-') || ['save-language', 'checkout', 'review-order', 'pay-demo', 'post-question', 'submit-answer'].includes(b.id) ? 'sandbox-primary' : ''}`}>
        {b.text}
      </button>
    );
    if (b.type === 'input') {
      const style = `${attrs.className} w-full rounded-lg border border-[#d8d8d8] bg-white px-3 py-2.5 text-base text-[#252525] outline-orange`;
      return <label key={b.id} className={b.id === 'search' ? 'min-w-[160px] flex-1' : 'my-2 block w-full'}>
        {b.id !== 'search' && <span className="mb-1 block text-sm font-medium text-[#555]">{b.text}</span>}
        {b.multiline ? <textarea {...attrs} aria-label={b.text} rows={4} placeholder={b.text} value={b.value || ''} disabled={running}
          onChange={(e) => act({ type: 'fill', id: b.id, value: e.target.value })} className={style} />
          : <input {...attrs} type={b.id === 'search' ? 'search' : 'text'} aria-label={b.text} placeholder={b.text} value={b.value || ''} disabled={running}
            onChange={(e) => act({ type: 'fill', id: b.id, value: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter' && b.id === 'search') act({ type: 'click', id: 'search-submit' }); }} className={style} />}
      </label>;
    }
    if (b.type === 'heading') return b.level === 1
      ? <h1 {...attrs} className={`${attrs.className} mb-5 text-2xl font-semibold`}>{b.text}</h1>
      : <h2 {...attrs} className={`${attrs.className} text-xl font-semibold leading-snug`}>{b.text}</h2>;
    if (b.id === 'notice') return <p {...attrs} role="status" className={`${attrs.className} mb-5 rounded-xl border border-[#b8d9b4] bg-[#edf7e9] p-3 text-[#2e542b]`}>{b.text}{marker}</p>;
    if (b.id === 'current-state') return <p {...attrs} className={`${attrs.className} mb-5 text-sm text-[#626262]`}>{b.text}{marker}</p>;
    return <p {...attrs} className={`${attrs.className} my-3 text-base leading-relaxed`}>{b.text}{marker}</p>;
  };
  const navigation = doc.blocks.filter((b) => b.group === 'navigation');
  const groups = Array.from(new Set(doc.blocks.map((b) => b.group).filter((g): g is string => Boolean(g && g !== 'navigation'))));
  return (
    <div className="pg-scroll h-full overflow-auto bg-[#f5f5f3]">
      <div ref={root} data-sandbox-root className={`sandbox-page min-h-full bg-[#f5f5f3] text-[#252525] ${doc.sandbox === 'quora' ? 'sandbox-quora' : ''}`}>
        <div className={`px-5 py-4 ${doc.sandbox === 'amazon' ? 'bg-[#192633] text-white' : 'border-b border-[#e5d9d5] bg-white'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className={`text-2xl tracking-tight ${doc.sandbox === 'quora' ? 'font-serif text-[#a32721]' : ''}`}>{doc.sandbox === 'amazon' ? 'amazon' : 'Quora'}<span className="ml-2 font-sans text-xs font-normal opacity-70">SANDBOX</span></strong>
            <span className="text-xs opacity-75">Local actions · no real account</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">{navigation.map(render)}</div>
        </div>
        <main className="mx-auto max-w-5xl px-5 py-6">
          <p className="mb-4 text-xs text-[#777]">{doc.blocks.find((b) => b.id === 'sandbox-label')?.text}</p>
          {doc.blocks.filter((b) => !b.group && !['sandbox-label', 'subtotal', 'save-language', 'checkout'].includes(b.id)).map(render)}
          <div className={`grid gap-4 ${doc.sandbox === 'amazon' ? 'xl:grid-cols-2' : ''}`}>
            {groups.map((group) => <section key={group} className="flex flex-col items-start gap-1 rounded-2xl border border-[#e2e0dc] bg-white p-5 shadow-sm">{doc.blocks.filter((b) => b.group === group).map(render)}</section>)}
          </div>
          {doc.blocks.filter((b) => ['subtotal', 'save-language', 'checkout'].includes(b.id)).map(render)}
        </main>
      </div>
    </div>
  );
}
