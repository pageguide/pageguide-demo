'use client';

import ExampleMedia from './ExampleMedia';
import { useStore } from '@/lib/store';
import { articleUrl } from '@/lib/library';
import { sandboxUrl, type SandboxSite } from '@/lib/sandboxes';
import { prefetchSavedPage } from '@/lib/saved-client';

export const SANDBOX_TASKS: Record<SandboxSite, string[]> = {
  amazon: ['Add oranges to my cart', 'Buy oranges using demo checkout', 'Save coffee to my wishlist'],
  quora: ['Change my language to Spanish', 'Find and browse posts about gardening', 'Follow the Gardening topic', 'Publish a demo question about gardening'],
  soundcloud: ['Play Midnight Signals', 'Like Midnight Signals', 'Follow Nova Vale'],
  'met-map': ['Open The Great Hall', 'Find the European Paintings galleries on Floor 2', 'Switch to Floor 2 and open Modern and Contemporary Art'],
};

const GUIDE_SITES: { id: SandboxSite; name: string; description: string }[] = [
  { id: 'amazon', name: 'Amazon', description: 'Shop, manage a cart, and check out.' },
  { id: 'quora', name: 'Quora', description: 'Browse questions, post replies, and follow topics.' },
  { id: 'soundcloud', name: 'SoundCloud', description: 'Play previews, like tracks, and follow artists.' },
  { id: 'met-map', name: 'The Met Map', description: 'Explore galleries and switch museum floors.' },
];

export default function LibraryShelf() {
  const { library, pageError, loadUrl, uiMode, setUiMode } = useStore();

  return (
    <div className="pg-scroll h-full overflow-auto bg-[#fffaf6] dark:bg-night">
      <div className="mx-auto max-w-6xl px-5 py-4 md:px-8">
        <p className="text-sm font-medium text-orange">TRY PAGEGUIDE · FIND ANSWERS & COMPLETE TASKS</p>
        {pageError && <p role="alert" className="mt-4 rounded-xl border border-orange-ring bg-orange-soft p-3 text-sm text-[#8c4f29]">{pageError}</p>}
        <div className="mt-3 grid gap-5 xl:grid-cols-2 xl:gap-y-0">
          <section aria-label="Find saved websites" className="xl:row-span-5 xl:grid xl:grid-rows-subgrid">
            <h2 className="text-lg font-semibold text-ink dark:text-night-ink">Find</h2>
            <p className="mt-1 text-base font-medium leading-snug text-ink dark:text-night-ink">The agent finds information and returns answer with evidence on the page.</p>
            <ExampleMedia mode="Find" src="/examples/find-anchored-evidence.png" alt="Find example: a question about the stream emerging from Nevado Mismi, answered with numbered citations and highlighted source spans." width={2300} height={1324} />
            <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted dark:text-night-muted">Or open a page to ask your own question</h3>
            <div className="grid auto-rows-fr gap-2 sm:grid-cols-2">
              {['roman-empire', 'blue-sky', 'web-accessibility', 'cold-war'].flatMap((id) => library.articles.filter((article) => article.id === id)).map((article) => (
                <button key={article.id} onPointerEnter={() => prefetchSavedPage(article.id)} onFocus={() => prefetchSavedPage(article.id)} onClick={() => { setUiMode('find'); void loadUrl(articleUrl(article.id, library)); }} className="library-card library-card--compact text-left">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-orange">{article.site}</span>
                  <span className="mt-0.5 block truncate text-sm font-semibold leading-snug" title={article.title}>{article.title}</span>
                  <span className="mt-2 block text-xs font-medium text-orange">Open →</span>
                </button>
              ))}
            </div>
          </section>
          <section aria-label="Guide interactive websites" className="xl:row-span-5 xl:grid xl:grid-rows-subgrid">
            <h2 className="text-lg font-semibold text-ink dark:text-night-ink">Guide</h2>
            <div className="mt-1">
              <p className="text-base font-medium leading-snug text-ink dark:text-night-ink">The agent navigates the website and completes your goal.</p>
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm leading-relaxed text-muted dark:text-night-muted">
                <div><dt className="inline font-semibold text-ink dark:text-night-ink">Auto</dt>{' · '}<dd className="inline">Agent runs the steps</dd></div>
                <div><dt className="inline font-semibold text-ink dark:text-night-ink">Manual</dt>{' · '}<dd className="inline">You approve each step</dd></div>
              </dl>
            </div>
            <ExampleMedia mode="Guide" type="video" src="/demo-media/guide-latest.mp4?v=latest-256058da" gifSrc="/demo-media/guide-latest.gif?v=latest-256058da-15x" gifSeekSrc="/demo-media/guide-gif-seekable.mp4?v=latest-256058da-15x" gifPlaybackRate={1.5} poster="/examples/guide-demo-poster.jpg" captionsSrc="/examples/guide-demo.en.vtt" alt="Guide demonstration video" width={1440} height={1080} />
            <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted dark:text-night-muted">Or open a demo website to try your own task</h3>
            <div className="grid auto-rows-fr gap-2 sm:grid-cols-2">
              {GUIDE_SITES.map((site) => (
                <button key={site.id} onClick={() => { if (uiMode === 'find') setUiMode('auto'); void loadUrl(sandboxUrl(site.id)); }} className="library-card library-card--compact text-left">
                  <span className="block text-sm font-semibold leading-snug">{site.name}</span>
                  <span className="mt-1 block truncate text-xs leading-snug text-muted dark:text-night-muted" title={site.description}>{site.description}</span>
                  <span className="mt-2 block text-xs font-medium text-orange">Open →</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
