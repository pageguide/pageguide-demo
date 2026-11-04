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

const FIND_DEMOS = 4;

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
      <div className="mx-auto max-w-6xl px-5 py-6 md:px-8">
        <p className="text-sm font-medium text-orange">YOUR PAGEGUIDE PLAYGROUND</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink dark:text-night-ink">Navigate a Webpage - Locating Information</h1>
        {pageError && <p role="alert" className="mt-4 rounded-xl border border-orange-ring bg-orange-soft p-3 text-sm text-[#8c4f29]">{pageError}</p>}
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section aria-label="Find saved websites">
          <h2 className="text-lg font-semibold text-ink dark:text-night-ink">Find <span className="ml-2 text-sm font-normal text-muted dark:text-night-muted">{Math.min(library.articles.length, FIND_DEMOS)} website demos</span></h2>
          <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">In the FIND feature, the agent searches the website and identifies the information needed to reach your goal.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {library.articles.slice(0, FIND_DEMOS).map((article, i) => (
              <button key={article.id} onPointerEnter={() => prefetchSavedPage(article.id)} onFocus={() => prefetchSavedPage(article.id)} onClick={() => void loadUrl(articleUrl(article.id, library))} className="library-card library-card--compact text-left">
                <span className="text-xl" aria-hidden="true">{['⌘', '☀', '◎', '◷', '▦', '♜'][i]}</span>
                <span className="mt-2 block text-[11px] font-semibold uppercase tracking-wide text-orange">{article.site}</span>
                <span className="mt-0.5 block text-base font-semibold leading-snug">{article.title}</span>
                <span className="library-card-description mt-1.5 block text-sm leading-snug text-muted dark:text-night-muted">{article.description}</span>
                <span className="mt-3 block text-xs text-sage">Open saved page →</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted dark:text-night-muted">Saved locally. These snapshots are read-only.</p>
        </section>
        <section aria-label="Guide interactive websites">
          <h2 className="text-lg font-semibold text-ink dark:text-night-ink">Guide <span className="ml-2 text-sm font-normal text-muted dark:text-night-muted">4 interactive demos</span></h2>
          <p className="mt-2 text-sm leading-relaxed text-muted dark:text-night-muted">In the GUIDE feature, the agent navigates step by step on the website to reach your goal.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(['amazon', 'quora', 'soundcloud', 'met-map'] as const).map((site) => (
              <button key={site} onClick={() => void loadUrl(sandboxUrl(site))} className="library-card library-card--compact text-left">
                <span className="text-xl" aria-hidden="true">{site === 'amazon' ? '🍊' : site === 'quora' ? '💬' : site === 'soundcloud' ? '☁' : '◈'}</span>
                <span className="mt-2 block text-base font-semibold leading-snug">{site === 'amazon' ? 'Amazon' : site === 'quora' ? 'Quora' : site === 'soundcloud' ? 'SoundCloud' : 'The Met Map'} sandbox</span>
                <span className="library-card-description mt-1.5 block text-sm leading-snug text-muted dark:text-night-muted">{site === 'amazon' ? 'Shop, save a wishlist, check out with sample shipping, simulate payment, and manage orders.' : site === 'quora' ? 'Browse fictional questions, answers and comments. Post, reply, vote, save, and follow topics.' : site === 'soundcloud' ? 'Explore fictional artists, play previews, like tracks, and follow creators.' : 'Explore a fictional indoor museum map, switch floors, and open galleries.'}</span>
                <span className="mt-3 block text-xs font-medium text-orange">Open demo →</span>
              </button>
            ))}
          </div>
        </section>
        </div>
        <section className="mt-6 flex flex-col gap-3 border-t border-line pt-4 dark:border-night-line sm:flex-row sm:items-center" aria-label="Custom website">
          <div className="shrink-0"><h2 className="text-sm font-semibold text-ink dark:text-night-ink">Try another website</h2><p className="text-xs text-muted dark:text-night-muted">Read-only FIND demo</p></div>
          <form className="flex min-w-0 flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); if (url.trim()) void loadUrl(url); }}>
            <input aria-label="Custom website URL" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-website.com" className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm outline-orange dark:border-night-line dark:bg-night-panel dark:text-night-ink" />
            <button className="shrink-0 rounded-lg bg-orange px-3 py-2 text-sm font-medium text-white" disabled={!url.trim()}>Open website</button>
          </form>
        </section>
      </div>
    </div>
  );
}
