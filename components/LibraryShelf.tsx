'use client';

import { useEffect } from 'react';
import ExampleAnswer from './ExampleAnswer';
import { useStore } from '@/lib/store';
import { articleUrl } from '@/lib/library';
import { sandboxUrl, type SandboxSite } from '@/lib/sandboxes';
import { prefetchSavedPage } from '@/lib/saved-client';

export const SANDBOX_TASKS: Record<SandboxSite, string[]> = {
  amazon: ['Add oranges to my cart', 'Buy oranges using demo checkout', 'Save coffee to my wishlist'],
  quora: ['Change my language to Spanish', 'Find and browse posts about gardening', 'Follow the Gardening topic', 'Publish a demo question about gardening'],
  soundcloud: ['Play Midnight Signals', 'Like Midnight Signals', 'Follow Nova Vale'],
  'met-map': ['Open Arms and Armor', 'Find the European Paintings galleries on Floor 2', 'Switch to Floor 2 and open Modern and Contemporary Art'],
};

const FIND_EXAMPLE = 'When did the Berlin Wall fall?';
const GUIDE_EXAMPLE = 'Add oranges to my cart';
const GUIDE_SITES: { id: SandboxSite; name: string; description: string }[] = [
  { id: 'amazon', name: 'Amazon', description: 'Shop, manage a cart, and check out.' },
  { id: 'quora', name: 'Quora', description: 'Browse questions, post replies, and follow topics.' },
  { id: 'soundcloud', name: 'SoundCloud', description: 'Play previews, like tracks, and follow artists.' },
  { id: 'met-map', name: 'The Met Map', description: 'Explore galleries and switch museum floors.' },
];

export default function LibraryShelf() {
  const { library, pageError, loadUrl, stageExampleRequest } = useStore();
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;
    const timer = setTimeout(() => prefetchSavedPage('cold-war'), 250);
    return () => clearTimeout(timer);
  }, []);

  async function tryExample(mode: 'find' | 'auto') {
    await loadUrl(mode === 'find' ? articleUrl('cold-war', library) : sandboxUrl('amazon'));
    const state = useStore.getState();
    if (state.browserView !== 'page' || state.pageError) return;
    stageExampleRequest(mode === 'find' ? FIND_EXAMPLE : GUIDE_EXAMPLE, mode);
  }

  return (
    <div className="pg-scroll h-full overflow-auto bg-[#fffaf6] dark:bg-night">
      <div className="mx-auto max-w-6xl px-5 py-4 md:px-8">
        <p className="text-sm font-medium text-orange">TRY PAGEGUIDE · FIND ANSWERS & COMPLETE TASKS</p>
        {pageError && <p role="alert" className="mt-4 rounded-xl border border-orange-ring bg-orange-soft p-3 text-sm text-[#8c4f29]">{pageError}</p>}
        <div className="mt-3 grid gap-5 xl:grid-cols-2 xl:gap-y-0">
          <section aria-label="Find saved websites" className="xl:row-span-5 xl:grid xl:grid-rows-subgrid">
            <h2 className="text-lg font-semibold text-ink dark:text-night-ink">Find</h2>
            <p className="mt-1 text-base font-medium leading-snug text-ink dark:text-night-ink">The agent finds information and returns answer with evidence on the page.</p>
            <div className="mt-3 flex flex-col rounded-xl border border-orange-ring bg-orange-soft p-4 dark:border-night-line dark:bg-night-panel">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-orange">Example · Wikipedia · Cold War</h3>
              <p className="mt-3 text-base font-semibold text-ink dark:text-night-ink">“{FIND_EXAMPLE}”</p>
              <ol className="mt-3 list-inside list-decimal space-y-1 text-sm leading-snug text-ink dark:text-night-ink">
                <li>Search the long Cold War article.</li>
                <li>Locate the Berlin Wall passage.</li>
                <li>Answer with a saved evidence screenshot.</li>
              </ol>
              <ExampleAnswer answer="The Berlin Wall fell in November 1989." image="/examples/cold-war-berlin-wall-evidence.png" description="Cold War article passage highlighting the fall of the Berlin Wall in November 1989." />
              <button onClick={() => void tryExample('find')} className="mt-auto self-start pt-3 text-sm font-semibold text-orange hover:underline">Try this Find example →</button>
            </div>
            <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted dark:text-night-muted">Or open a page to ask your own question</h3>
            <div className="grid auto-rows-fr gap-2 sm:grid-cols-2">
              {['roman-empire', 'blue-sky', 'web-accessibility', 'cold-war'].flatMap((id) => library.articles.filter((article) => article.id === id)).map((article) => (
                <button key={article.id} onPointerEnter={() => prefetchSavedPage(article.id)} onFocus={() => prefetchSavedPage(article.id)} onClick={() => void loadUrl(articleUrl(article.id, library))} className="library-card library-card--compact text-left">
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
            <div className="mt-3 flex flex-col rounded-xl border border-orange-ring bg-orange-soft p-4 dark:border-night-line dark:bg-night-panel">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-orange">Example · Amazon</h3>
              <p className="mt-3 text-base font-semibold text-ink dark:text-night-ink">“{GUIDE_EXAMPLE}”</p>
              <ol className="mt-3 list-inside list-decimal space-y-1 text-sm leading-snug text-ink dark:text-night-ink">
                <li>Locate oranges in the Amazon store.</li>
                <li>Click “Add to cart” for the oranges.</li>
                <li>Open the cart and confirm oranges were added.</li>
              </ol>
              <ExampleAnswer answer="I’ve added fresh oranges to your cart. Quantity: 1. Subtotal: $4.99." image="/examples/amazon-oranges-cart-evidence.png" description="Amazon cart showing fresh oranges, quantity 1, and a $4.99 subtotal." />
              <button onClick={() => void tryExample('auto')} className="mt-auto self-start pt-3 text-sm font-semibold text-orange hover:underline">Try this Guide example →</button>
            </div>
            <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-muted dark:text-night-muted">Or open a demo website to try your own task</h3>
            <div className="grid auto-rows-fr gap-2 sm:grid-cols-2">
              {GUIDE_SITES.map((site) => (
                <button key={site.id} onClick={() => void loadUrl(sandboxUrl(site.id))} className="library-card library-card--compact text-left">
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
