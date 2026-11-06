'use client';

import { useStore } from '@/lib/store';
import type { SandboxSite } from '@/lib/sandboxes';
import { SANDBOX_TASKS } from './LibraryShelf';

export default function SandboxTaskBar({ site }: { site: SandboxSite }) {
  const { busy, guideRun, uiMode, stageExampleRequest, resetSandbox } = useStore();
  const running = busy || !!guideRun?.running;

  return <div role="toolbar" aria-label="Sandbox tasks" className="flex shrink-0 items-center gap-2 border-b border-orange-ring bg-orange-soft/50 px-3 py-2 dark:border-night-line dark:bg-night">
    <div className="pg-scroll flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
      {SANDBOX_TASKS[site].map(task => <button key={task} disabled={running} onClick={() => stageExampleRequest(task, uiMode === 'find' ? 'manual' : uiMode)} className="shrink-0 whitespace-nowrap rounded-full border border-orange-ring bg-white px-3 py-1.5 text-xs text-[#885029] disabled:opacity-50 dark:border-night-line dark:bg-night-panel dark:text-orange">Guide: {task}</button>)}
    </div>
    <button onClick={resetSandbox} className="ml-auto shrink-0 whitespace-nowrap px-2 py-1 text-xs text-muted dark:text-night-muted">Reset sandbox</button>
  </div>;
}
