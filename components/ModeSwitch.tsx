'use client';

import { useStore } from '@/lib/store';

export default function ModeSwitch() {
  const surface = useStore((s) => s.surface);
  const setSurface = useStore((s) => s.setSurface);
  return (
    <div className="inline-flex rounded-lg border border-line bg-white p-0.5 text-[12px] font-medium shadow-soft dark:border-night-line dark:bg-night-panel">
      {(['browser', 'terminal'] as const).map((m) => (
        <button
          key={m}
          onClick={() => setSurface(m)}
          className={`rounded-md px-3 py-1.5 transition-colors ${
            surface === m
              ? 'bg-ink text-white dark:bg-orange'
              : 'text-muted hover:text-ink dark:text-night-muted'
          }`}
        >
          {m === 'browser' ? '🧩 Browser' : '▌ Terminal'}
        </button>
      ))}
    </div>
  );
}
