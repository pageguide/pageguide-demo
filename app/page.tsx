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
      <main className="min-h-0 flex-1 p-3 md:p-4">
        <ExtensionSurface />
      </main>

    </div>
  );
}
