'use client';

import { useState } from 'react';
import ExampleMedia from './ExampleMedia';
import { useStore } from '@/lib/store';
import { articleUrl } from '@/lib/library';
import { sandboxUrl, type SandboxSite } from '@/lib/sandboxes';
import { prefetchSavedPage } from '@/lib/saved-client';

export const SANDBOX_TASKS: Record<SandboxSite, string[]> = {
  amazon: ['How do I return the jacket I bought on Amazon last week?', 'Buy oranges using demo checkout', 'Where can I track my order and see when it will arrive?'],
  quora: ['Change language to Spanish', 'How to post a question to Business Space', 'How to check notifications for my content?'],
  soundcloud: ['Change Spotify plan: upgrade to Premium', 'Hide Midnight Signals and block Nova Vale', 'Listen to music on Spotify with friends on Discord'],
  'met-map': ['Open The Great Hall', 'Find the European Paintings galleries on Floor 2', 'Switch to Floor 2 and open Modern and Contemporary Art'],
};

const GUIDE_SITES: { id: SandboxSite; name: string; description: string }[] = [
  { id: 'amazon', name: 'Amazon', description: 'Shop, manage a cart, and check out.' },
  { id: 'quora', name: 'Quora', description: 'Browse questions, post replies, and follow topics.' },
  { id: 'soundcloud', name: 'Spotify', description: 'Explore Premium, listening preferences, and music with friends.' },
  { id: 'met-map', name: 'The Met Map', description: 'Explore galleries and switch museum floors.' },
];

export const FIND_PROMPTS: Record<string, string[]> = {
  'ronaldo': ['Can you summarize the early life of Ronaldo?', 'How did Ronaldo evolve from a winger into a goalscorer?', 'How do Ronaldo’s achievements at Manchester United, Real Madrid, Juventus, and Portugal compare?'],
  'facebook': ['How did Facebook grow from a Harvard student project into a global social network?', 'How did the Cambridge Analytica scandal unfold, and what legal, political, and reputational consequences followed?', 'What major controversies has Facebook faced over privacy, misinformation, political influence, harmful content, and competition, and how has it responded?'],
  'united-states': ['How did the United States grow from thirteen colonies into a continental and global power?', 'How do the Constitution, federalism, and separation of powers shape the US government?', 'How have immigration, religion, and regional differences shaped American culture?'],
  'bible': ['How did the Bible take shape over time, from oral traditions and separate writings to the collections read today?', 'How did the Bible’s original languages, major translations, and printing history help it reach new audiences?', 'How has the Bible influenced politics, social reform, literature, and the arts?'],
};

export default function LibraryShelf() {
  const { library, pageError, loadUrl, uiMode, setUiMode } = useStore();
  const [showAllFind, setShowAllFind] = useState(false);
  const [showAllGuide, setShowAllGuide] = useState(false);
  const findArticles = ['ronaldo', 'facebook', 'united-states', 'bible'].flatMap((id) => library.articles.filter((article) => article.id === id));

  return (
    <div className="pg-scroll h-full overflow-auto bg-[#fffaf6] dark:bg-night">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col px-5 py-2 md:px-8">
        <p className="text-sm font-medium text-orange">TRY PAGEGUIDE · FIND ANSWERS & COMPLETE TASKS</p>
        {pageError && <p role="alert" className="mt-4 rounded-xl border border-orange-ring bg-orange-soft p-3 text-sm text-[#8c4f29]">{pageError}</p>}
        <div className="mt-3 grid flex-1 gap-5 xl:grid-cols-2 xl:grid-rows-[auto_auto_minmax(0,1fr)_auto_auto] xl:gap-y-0">
          <section aria-label="Find saved websites" className="xl:row-span-5 xl:grid xl:grid-rows-subgrid">
            <h2 className="text-lg font-semibold text-ink dark:text-night-ink">Find</h2>
            <p className="mt-1 text-base font-medium leading-snug text-ink dark:text-night-ink">The agent finds information and returns answer with evidence on the page.</p>
            <FindExample />
            <h3 className="mb-2 mt-2 text-xs font-semibold uppercase tracking-wide text-muted dark:text-night-muted">Or open a page to ask your own question</h3>
            <div>
              <div className="grid auto-rows-fr gap-2 sm:grid-cols-2">
                {(showAllFind ? findArticles : findArticles.slice(0, 2)).map((article) => (
                  <button key={article.id} type="button" onPointerEnter={() => prefetchSavedPage(article.id)} onFocus={() => prefetchSavedPage(article.id)} onClick={() => { setUiMode('find'); void loadUrl(articleUrl(article.id, library)); }} className="library-card library-card--compact text-left">
                      <span className="block text-[11px] font-semibold uppercase tracking-wide text-orange">{article.site}</span>
                      <span className="mt-0.5 block truncate text-sm font-semibold leading-snug" title={article.title}>{article.title}</span>
                      <span className="mt-2 block text-xs font-medium text-orange">Open →</span>
                  </button>
                ))}
              </div>
              {findArticles.length > 2 && <button type="button" aria-expanded={showAllFind} onClick={() => setShowAllFind((shown) => !shown)} className="mt-2 text-xs font-semibold text-orange hover:underline">{showAllFind ? 'Show fewer examples' : 'More examples'}</button>}
            </div>
          </section>
          <section aria-label="Guide interactive websites" className="xl:row-span-5 xl:grid xl:grid-rows-subgrid">
            <h2 className="text-lg font-semibold text-ink dark:text-night-ink">Guide</h2>
            <div className="mt-1">
              <p className="text-base font-medium leading-snug text-ink dark:text-night-ink">The agent navigates the website and completes your goal.</p>
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm leading-relaxed text-muted dark:text-night-muted">
                <div><dt className="inline font-semibold text-ink dark:text-night-ink">Manual</dt>{' · '}<dd className="inline">You approve each step</dd></div>
                <div><dt className="inline font-semibold text-ink dark:text-night-ink">Auto</dt>{' · '}<dd className="inline">Agent runs the steps</dd></div>
              </dl>
            </div>
            <ExampleMedia mode="Guide" query={'Find the nearest cafe to the American Wing\nOn the first floor of the MET Museum'} type="video" src="/demo-media/guide-latest.mp4?v=latest-256058da" gifSrc="/demo-media/guide-latest.gif?v=latest-256058da-15x" gifSeekSrc="/demo-media/guide-gif-seekable.mp4?v=latest-256058da-15x" gifPlaybackRate={1.5} poster="/examples/guide-demo-poster.jpg" captionsSrc="/examples/guide-demo.en.vtt" alt="Guide demonstration video" width={1440} height={1080} />
            <h3 className="mb-2 mt-2 text-xs font-semibold uppercase tracking-wide text-muted dark:text-night-muted">Or open a demo website to try your own task</h3>
            <div>
              <div className="grid auto-rows-fr gap-2 sm:grid-cols-2">
                {(showAllGuide ? GUIDE_SITES : GUIDE_SITES.slice(0, 2)).map((site) => (
                  <button key={site.id} onClick={() => { if (uiMode === 'find') setUiMode('manual'); void loadUrl(sandboxUrl(site.id)); }} className="library-card library-card--compact text-left">
                    <span className="block text-sm font-semibold leading-snug">{site.name}</span>
                    <span className="mt-1 block truncate text-xs leading-snug text-muted dark:text-night-muted" title={site.description}>{site.description}</span>
                    <span className="mt-2 block text-xs font-medium text-orange">Open →</span>
                  </button>
                ))}
              </div>
              <button type="button" aria-expanded={showAllGuide} onClick={() => setShowAllGuide((shown) => !shown)} className="mt-2 text-xs font-semibold text-orange hover:underline">{showAllGuide ? 'Show fewer examples' : 'More examples'}</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function FindExample() {
  const [activeCitation, setActiveCitation] = useState<number | null>(null);
  const highlight = (citations: number[]) => `font-semibold text-[#23549b] ${citations.includes(activeCitation ?? -1) ? 'bg-[#ffe29d] outline outline-2 outline-orange' : 'bg-[#cfe0fb]'}`;

  return (
    <figure className="mt-3 flex min-w-0 self-stretch flex-col gap-3 rounded-xl border border-orange-ring bg-orange-soft p-3 dark:border-night-line dark:bg-night-panel">
      <figcaption className="sr-only">Find example</figcaption>
      <p className="rounded-lg bg-white/80 px-3 py-2 text-sm leading-relaxed text-ink dark:bg-white/5 dark:text-night-ink">
        <span className="font-semibold text-orange">Query:</span>{' '}Which stream emerges from Nevado Mismi before eventually contributing to the Apurimac River system?
      </p>
      <div className="grid min-w-0 flex-1 content-center grid-cols-2 gap-3">
        <div className="flex min-w-0 items-center">
          <p className="min-w-0 text-left text-[clamp(.75rem,1vw,1rem)] leading-snug text-ink dark:text-night-ink">
            <mark className={highlight([1])}>Nevado Mismi</mark> peak, located roughly 160 km (99 mi) west of Lake Titicaca. From that point, <mark className={highlight([2, 3])}>Quebrada Carhuasanta</mark> emerges from Nevado Mismi, ...becomes <mark className={highlight([4, 5])}>Río Hornillos</mark> and eventually joins the <mark className={highlight([6])}>Río Apurímac</mark>.
          </p>
        </div>
        <div className="min-w-0 rounded-lg bg-[#1f2636] text-[clamp(.75rem,1vw,1rem)] leading-snug text-[#e7eaf0]">
          <div className="border-b border-white/80 px-3 py-2 text-sm font-semibold text-orange">🍊 PageGuide</div>
          <p className="p-2">The stream that emerges from <strong className="text-[#9fc5ff]">Nevado Mismi</strong> <Citation number={1} active={activeCitation === 1} onClick={setActiveCitation} /> is <strong className="text-[#9fc5ff]">Quebrada Carhuasanta</strong> <Citation number={2} active={activeCitation === 2} onClick={setActiveCitation} />. It joins <strong className="text-[#9fc5ff]">Quebrada Apacheta</strong> <Citation number={3} active={activeCitation === 3} onClick={setActiveCitation} /> to form the <strong className="text-[#9fc5ff]">Río Lloqueta</strong> <Citation number={4} active={activeCitation === 4} onClick={setActiveCitation} />, which then becomes the <strong className="text-[#9fc5ff]">Río Hornillos</strong> <Citation number={5} active={activeCitation === 5} onClick={setActiveCitation} /> before eventually joining the <strong className="text-[#9fc5ff]">Río Apurímac</strong> <Citation number={6} active={activeCitation === 6} onClick={setActiveCitation} />.</p>
        </div>
      </div>
    </figure>
  );
}

function Citation({ number, active, onClick }: { number: number; active: boolean; onClick: (number: number) => void }) {
  return <button type="button" aria-pressed={active} aria-label={`Highlight source for citation ${number}`} onClick={() => onClick(number)} className={`rounded px-0.5 font-bold text-[#f2b383] transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange ${active ? 'bg-white/20' : ''}`}>[{number}]</button>;
}
