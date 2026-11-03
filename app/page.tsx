'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import ExtensionSurface from '@/components/surfaces/ExtensionSurface';

export default function Home() {
  const hydrate = useStore((s) => s.hydrate);
  const loadConfig = useStore((s) => s.loadConfig);

  useEffect(() => {
    hydrate();
    void loadConfig();
  }, [hydrate, loadConfig]);

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="flex items-center justify-between border-b border-line bg-cream px-4 py-3 dark:border-night-line dark:bg-night md:px-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">🍊</span>
          <span className="text-[17px] font-semibold tracking-tight text-ink dark:text-night-ink">PageGuide</span>
          <span className="ml-1 rounded border border-line px-1.5 py-0.5 text-[9px] tracking-widest text-muted dark:border-night-line dark:text-night-muted">
            DEMO
          </span>
          <span className="ml-2 hidden text-[11px] text-muted dark:text-night-muted sm:inline">
            Find &amp; Guide on any page
          </span>
        </div>
      </header>

      <main className="min-h-0 flex-1 p-3 md:p-4">
        <ExtensionSurface />
      </main>

    </div>
  );
}
