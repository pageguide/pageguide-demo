'use client';

import { useStore } from '@/lib/store';
import { snapshotId } from '@/lib/library';
import { FIND_PROMPTS } from './LibraryShelf';

export default function FindTaskBar({ url }: { url: string }) {
  const { library, busy, guideRun, stageExampleRequest } = useStore();
  const id = snapshotId(url, library);
  const prompts = id ? FIND_PROMPTS[id] : null;
  if (!prompts) return null;

  return <div role="toolbar" aria-label="Find example requests" className="pg-scroll flex shrink-0 items-center gap-2 overflow-x-auto border-b border-orange-ring bg-orange-soft/50 px-3 py-2 dark:border-night-line dark:bg-night">
    {prompts.map((prompt) => <button key={prompt} type="button" disabled={busy || !!guideRun?.running} onClick={() => stageExampleRequest(prompt, 'find')} className="shrink-0 whitespace-nowrap rounded-full border border-orange-ring bg-white px-3 py-1.5 text-xs text-[#885029] disabled:opacity-50 dark:border-night-line dark:bg-night-panel dark:text-orange">Find: {prompt}</button>)}
  </div>;
}
