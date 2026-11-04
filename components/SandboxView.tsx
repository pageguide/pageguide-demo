'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import type { Block, PageDoc } from '@/lib/types';
import { readPageSelection } from '@/lib/page-selection';

// No iframe scripts or untrusted HTML: every visible control is backed by the shared state reducer.
export default function SandboxView({ doc }: { doc: PageDoc }) {
  const evidence = useStore((s) => s.evidence);
  const focused = useStore((s) => s.focusedEvidence);
  const guide = useStore((s) => s.guide);
  const act = useStore((s) => s.actOnSandbox);
  const setSelection = useStore((s) => s.setSelection);
  const running = useStore((s) => s.guideRun?.running);
  const root = useRef<HTMLDivElement>(null);
  const guideId = guide?.steps[guide.current]?.id;
  useEffect(() => {
    const id = focused || guideId;
    if (id) root.current?.querySelector(`[data-node-id="${id}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [focused, guideId]);

  const render = (b: Block) => {
    const ev = evidence.find((e) => e.id === b.id);
    const marker = ev?.marker && <span title={ev.annotation || `Evidence ${ev.marker}`} className="ml-2 inline-flex rounded-md bg-[#ec3973] px-2 py-0.5 align-middle text-xs font-semibold text-white">{ev.annotation ? `${ev.marker} · ${ev.annotation}` : `Evidence ${ev.marker}`}</span>;
    const attrs = {
      key: b.id, 'data-node-id': b.id,
      className: `${b.id === guideId ? 'pg-guide' : b.id === focused ? 'pg-visual' : ev ? 'pg-evidence' : ''}`,
    };
    if (b.type === 'button') return (
      <button {...attrs} disabled={running} onClick={() => act({ type: 'click', id: b.id })}
        className={`${attrs.className} sandbox-button ${b.id.startsWith('add-') || ['save-language', 'checkout', 'review-order', 'pay-demo', 'post-question', 'submit-answer'].includes(b.id) ? 'sandbox-primary' : ''}`}>
        {b.text}{marker}
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
  const sandboxLabel = doc.blocks.find((b) => b.id === 'sandbox-label');
  const brand = doc.sandbox === 'amazon' ? 'amazon' : doc.sandbox === 'soundcloud' ? 'SoundCloud' : doc.sandbox === 'met-map' ? 'The Met Map' : 'Quora';

  if (doc.sandbox === 'quora') {
    const search = navigation.find((b) => b.id === 'search');
    const searchSubmit = navigation.find((b) => b.id === 'search-submit');
    const postGroups = groups.filter((group) => group.startsWith('post-'));
    const otherGroups = groups.filter((group) => !group.startsWith('post-') && group !== 'topics');
    const topics = doc.blocks.filter((b) => b.group === 'topics');
    const quoraHome = new URL(doc.url).pathname === '/';
    return (
      <div className="pg-scroll h-full overflow-auto bg-[#f1f2f2]">
        <div ref={root} data-sandbox-root onMouseUp={() => { const selected = root.current && readPageSelection(root.current, doc.url); if (selected) setSelection(selected); }} onKeyUp={() => { const selected = root.current && readPageSelection(root.current, doc.url); if (selected) setSelection(selected); }} className="sandbox-page sandbox-quora min-h-full bg-[#f1f2f2] text-[#262626]">
          <header className="quora-header">
            <div className="quora-header-inner">
              <strong className="quora-logo">Quora</strong>
              <nav aria-label="Quora navigation" className="quora-icons"><span className="active">⌂</span><span>▤</span><span>✎</span><span>♙</span><span>♧</span></nav>
              <div className="quora-search">{search && render(search)}{searchSubmit && render(searchSubmit)}</div>
              <button className="quora-plus" type="button">Try Quora+</button>
              <span className="quora-profile">🍊</span><span className="quora-globe">◎</span>
              {navigation.filter((b) => ['ask-question', 'settings', 'bookmarks'].includes(b.id)).map(render)}
            </div>
          </header>
          <main className="quora-layout">
            <aside className="quora-left">
              <button className="quora-create" type="button">＋ Create Space</button>
              {['Business', 'Movies', 'Technology', 'History', 'Spanish (language)', "PageGuide's Space", 'Cooking'].map((topic, index) => <div className="quora-rail-item" key={topic}><span>{['▦', '▣', '◼', '▤', '🇪🇸', '♧', '🥘'][index]}</span>{topic}</div>)}
              <div className="quora-footer">About Quora<br />Terms<br />Privacy<br />Acceptable Use<br />Careers</div>
            </aside>
            <section className="quora-feed">
              <p className="sr-only">{sandboxLabel?.text}</p>
              <div className="sr-only">{doc.blocks.find((b) => b.id === 'current-state') && render(doc.blocks.find((b) => b.id === 'current-state')!)}</div>
              {doc.blocks.filter((b) => !b.group && !['sandbox-label', 'current-state', 'page-title', 'empty', 'notice'].includes(b.id)).map(render)}
              {doc.blocks.find((b) => b.id === 'page-title') && <div className="quora-page-title">{render(doc.blocks.find((b) => b.id === 'page-title')!)}</div>}
              {doc.blocks.find((b) => b.id === 'notice') && <div className="quora-notice">{render(doc.blocks.find((b) => b.id === 'notice')!)}</div>}
              {quoraHome && <section className="quora-composer"><span className="quora-profile">🍊</span><div>What do you want to ask or share?</div><footer><span>▢ Ask</span><span>✎ Answer</span><span>⌕ Post</span></footer></section>}
              {postGroups.map((group) => <article key={group} className="quora-post-card">{doc.blocks.filter((b) => b.group === group).map(render)}</article>)}
              {otherGroups.map((group) => <section key={group} className="quora-panel">{doc.blocks.filter((b) => b.group === group).map(render)}</section>)}
              {doc.blocks.find((b) => b.id === 'empty') && <div className="quora-empty">{render(doc.blocks.find((b) => b.id === 'empty')!)}</div>}
            </section>
            <aside className="quora-right">
              <div className="quora-ad">Advertisement</div>
              {topics.length > 0 && <section className="quora-topic-panel"><strong>Discover spaces</strong>{topics.map(render)}</section>}
            </aside>
          </main>
        </div>
      </div>
    );
  }
  return (
    <div className="pg-scroll h-full overflow-auto bg-[#f5f5f3]">
      <div ref={root} data-sandbox-root
        onMouseUp={() => { const selected = root.current && readPageSelection(root.current, doc.url); if (selected) setSelection(selected); }}
        onKeyUp={() => { const selected = root.current && readPageSelection(root.current, doc.url); if (selected) setSelection(selected); }} className={`sandbox-page min-h-full bg-[#f5f5f3] text-[#252525] ${doc.sandbox === 'soundcloud' ? 'sandbox-soundcloud' : ''} ${doc.sandbox === 'met-map' ? 'sandbox-met-map' : ''}`}>
        <div className={`px-5 py-4 ${doc.sandbox === 'amazon' || doc.sandbox === 'soundcloud' ? 'bg-[#192633] text-white' : 'border-b border-[#e5d9d5] bg-white'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="text-2xl tracking-tight">{brand}<span className="ml-2 font-sans text-xs font-normal opacity-70">SANDBOX</span></strong>
            <span className="text-xs opacity-75">Local actions · no real account</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">{navigation.map(render)}</div>
        </div>
        <main className="mx-auto max-w-5xl px-5 py-6">
          <p className="mb-4 text-xs text-[#777]">{sandboxLabel?.text}</p>
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
