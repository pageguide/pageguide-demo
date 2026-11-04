'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { articleUrl } from '@/lib/library';
import { sandboxUrl, type SandboxSite } from '@/lib/sandboxes';
import { prefetchSavedPage } from '@/lib/saved-client';

export const SANDBOX_TASKS: Record<SandboxSite, string[]> = {
  amazon: ['Add oranges to my cart', 'Buy oranges using demo checkout', 'Save coffee to my wishlist'],
  quora: ['Change my language to Spanish', 'Find and browse posts about gardening', 'Follow the Gardening topic', 'Publish a demo question about gardening'],
  soundcloud: ['Play Midnight Signals', 'Like Midnight Signals', 'Follow Nova Vale'],
  'met-map': ['Open the Temple of Dendur', 'Find the European Paintings galleries on Floor 2', 'Switch to Floor 2 and open Modern and Contemporary Art'],
};

export default function LibraryShelf() {
  const { library, pageError, loadUrl } = useStore();
  const [url, setUrl] = useState('');
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;
    const timer = setTimeout(() => prefetchSavedPage('fetch-api'), 250);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="pg-scroll h-full overflow-auto bg-[#fffaf6] dark:bg-night">
      <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">
        <p className="text-sm font-medium text-orange">YOUR PAGEGUIDE PLAYGROUND</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink dark:text-night-ink">Navigate a Webpage - Locating Information</h1>
        {pageError && <p role="alert" className="mt-5 rounded-xl border border-orange-ring bg-orange-soft p-4 text-sm text-[#8c4f29]">{pageError}</p>}
        <section className="mt-8" aria-label="Find saved websites">
          <h2 className="text-lg font-semibold text-ink dark:text-night-ink">Find <span className="ml-2 text-sm font-normal text-muted dark:text-night-muted">{library.articles.length} saved real websites</span></h2>
          <div className="mt-3 grid gap-3 xl:grid-cols-3">
            {library.articles.map((article, i) => (
              <button key={article.id} onPointerEnter={() => prefetchSavedPage(article.id)} onFocus={() => prefetchSavedPage(article.id)} onClick={() => void loadUrl(articleUrl(article.id, library))} className="library-card text-left">
                <span className="text-2xl" aria-hidden="true">{['⌘', '☀', '◎', '◷', '▦', '♜'][i]}</span>
                <span className="mt-4 block text-xs font-semibold uppercase tracking-wide text-orange">{article.site}</span>
                <span className="mt-1 block text-lg font-semibold">{article.title}</span>
                <span className="mt-2 block text-sm leading-relaxed text-muted dark:text-night-muted">{article.description}</span>
                <span className="mt-4 block text-xs text-sage">Saved original · no external fetch →</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted dark:text-night-muted">Original website HTML and styles, saved locally for speed. Scripts are removed for safety; these are snapshots, not live sessions.</p>
          <section className="mt-6" aria-label="Custom website">
            <h3 className="text-lg font-semibold text-ink dark:text-night-ink">Bring your own website</h3>
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (url.trim()) void loadUrl(url); }}>
              <input aria-label="Custom website URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-website.com" className="min-w-0 flex-1 rounded-xl border border-line bg-white px-4 py-3 text-base outline-orange dark:border-night-line dark:bg-night-panel dark:text-night-ink" />
              <button className="rounded-xl bg-orange px-4 py-3 text-sm font-medium text-white" disabled={!url.trim()}>Open website</button>
            </form>
            <p className="mt-2 text-xs text-muted dark:text-night-muted">Custom sites use a safe read-only snapshot for Find. Repeat visits are cached for 5 minutes; use Refresh for fresh content.</p>
          </section>
        </section>
        <section className="mt-8" aria-label="Guide interactive websites">
          <h2 className="text-lg font-semibold text-ink dark:text-night-ink">Guide <span className="ml-2 text-sm font-normal text-muted dark:text-night-muted">4 isolated environments</span></h2>
          <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">Guide can work on real websites. For this demonstration, it runs in an isolated environment inspired by real websites, with no login requirements or bot restrictions.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {(['amazon', 'quora', 'soundcloud', 'met-map'] as const).map((site) => (
              <button key={site} onClick={() => void loadUrl(sandboxUrl(site))} className="library-card text-left">
                <span className="text-2xl" aria-hidden="true">{site === 'amazon' ? '🍊' : site === 'quora' ? '💬' : site === 'soundcloud' ? '☁' : '◈'}</span>
                <span className="mt-3 block text-xl font-semibold">{site === 'amazon' ? 'Amazon' : site === 'quora' ? 'Quora' : site === 'soundcloud' ? 'SoundCloud' : 'The Met Map'} sandbox</span>
                <span className="mt-2 block text-sm leading-relaxed text-muted dark:text-night-muted">{site === 'amazon' ? 'Shop, save a wishlist, check out with sample shipping, simulate payment, and manage orders.' : site === 'quora' ? 'Browse fictional questions, answers and comments. Post, reply, vote, save, and follow topics.' : site === 'soundcloud' ? 'Explore fictional artists, play previews, like tracks, and follow creators.' : 'Explore a fictional indoor museum map, switch floors, and open galleries.'}</span>
                <span className="mt-4 block text-xs font-medium text-orange">Open interactive demo →</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
