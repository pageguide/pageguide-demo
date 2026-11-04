'use client';
import type { ReactNode } from 'react';
import type { PageDoc } from '@/lib/types';
import { useStore } from '@/lib/store';

export function useSandboxControls(doc: PageDoc) {
  const dispatch = useStore(s => s.actOnSandbox);
  const evidence = useStore(s => s.evidence);
  const focused = useStore(s => s.focusedEvidence);
  const guide = useStore(s => s.guide);
  const running = useStore(s => s.guideRun?.running);
  const pending = useStore(s => s.pendingConfirm);
  const resolveConfirm = useStore(s => s.resolveConfirm);
  const targetId = guide?.steps[guide.current]?.id;
  const isAwaiting = (id: string) => !!pending && targetId === id;
  const act = (id: string, value?: string) => {
    const state = useStore.getState();
    if (state.guideRun?.running) {
      if (state.pendingConfirm && state.guide?.steps[state.guide.current]?.id === id) state.resolveConfirm(true);
      return;
    }
    return dispatch(value === undefined ? { type: 'click', id } : { type: 'fill', id, value });
  };
  const node = (id: string) => ({ 'data-node-id': id, className: guide?.steps[guide.current]?.id === id ? 'pg-guide' : focused === id ? 'pg-visual' : evidence.some(e => e.id === id) ? 'pg-evidence' : undefined });
  const control = (id: string, children?: ReactNode, className = '') => {
    const block = doc.blocks.find(b => b.id === id);
    if (!block) return null;
    const ev = evidence.find(e => e.id === id);
    // In manual mode, the highlighted step control is clickable to approve/advance the step.
    const awaiting = !!pending && targetId === id;
    return <button key={id} {...node(id)} className={`${className} ${node(id).className || ''}`.trim()} aria-label={block.text} disabled={running && !awaiting} onClick={() => awaiting ? resolveConfirm(true) : act(id)}>{children ?? block.text}{ev?.marker && <span className="sandbox-evidence-marker">Evidence {ev.marker}</span>}</button>;
  };
  return { act, node, control, running, targetId, isAwaiting };
}
