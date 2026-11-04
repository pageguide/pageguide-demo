'use client';

import { useStore } from '@/lib/store';
import type { SandboxSite } from '@/lib/sandboxes';
import { SANDBOX_TASKS } from './LibraryShelf';
import { manualTasksFor, manualTaskUnavailableReason, type ManualTask } from '@/lib/manual-tasks';

export default function SandboxTaskBar({ site }: { site: SandboxSite }) {
  const { busy, guideRun, sandboxSessions, library, ask, resetSandbox } = useStore();
  const running = busy || !!guideRun?.running;
  const session = sandboxSessions[site];
  const startManual = (task: ManualTask) => {
    const state = useStore.getState();
    const current = state.sandboxSessions[site];
    if (state.busy || state.guideRun?.running || state.doc?.sandbox !== site || !current || manualTaskUnavailableReason(task, current, state.library)) return;
    state.setUiMode('manual');
    void state.ask(task.prompt, 'guide');
  };

  return <div role="toolbar" aria-label="Sandbox tasks" className="flex shrink-0 items-center gap-2 border-b border-orange-ring bg-orange-soft/50 px-3 py-2 dark:border-night-line dark:bg-night">
    <div className="pg-scroll flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
      {SANDBOX_TASKS[site].map(task => <button key={task} disabled={running} onClick={() => void ask(task, 'guide')} className="shrink-0 whitespace-nowrap rounded-full border border-orange-ring bg-white px-3 py-1.5 text-xs text-[#885029] disabled:opacity-50 dark:border-night-line dark:bg-night-panel dark:text-orange">Guide: {task}</button>)}
      {manualTasksFor(site).map(task => {
        const unavailable = session ? manualTaskUnavailableReason(task, session, library) : 'Open this sandbox first.';
        const description = `${task.goal} Why Manual? ${task.whyManual}${unavailable ? ` ${unavailable}` : ''}`;
        return <button key={task.id} type="button" data-manual-task={task.id} aria-label={`Manual: ${task.shortLabel}`} aria-describedby={`manual-task-${task.id}`} title={description} disabled={running || !!unavailable} onClick={() => startManual(task)} className="shrink-0 whitespace-nowrap rounded-full border border-orange-ring bg-white px-3 py-1.5 text-xs font-medium text-[#885029] disabled:cursor-not-allowed disabled:opacity-40 dark:border-night-line dark:bg-night-panel dark:text-orange">
          Manual: {task.shortLabel}<span id={`manual-task-${task.id}`} className="sr-only">{description}</span>
        </button>;
      })}
    </div>
    <button onClick={resetSandbox} className="ml-auto shrink-0 whitespace-nowrap px-2 py-1 text-xs text-muted dark:text-night-muted">Reset sandbox</button>
  </div>;
}
