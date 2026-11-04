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
  const act = (id: string, value?: string) => dispatch(value === undefined ? { type: 'click', id } : { type: 'fill', id, value });
  const node = (id: string) => ({ 'data-node-id': id, className: guide?.steps[guide.current]?.id === id ? 'pg-guide' : focused === id ? 'pg-visual' : evidence.some(e => e.id === id) ? 'pg-evidence' : undefined });
  const control = (id: string, children?: ReactNode, className = '') => {
    const block = doc.blocks.find(b => b.id === id);
    if (!block) return null;
    const ev = evidence.find(e => e.id === id);
    return <button key={id} {...node(id)} className={`${className} ${node(id).className || ''}`.trim()} aria-label={block.text} disabled={running} onClick={() => act(id)}>{children ?? block.text}{ev?.marker && <span className="sandbox-evidence-marker">Evidence {ev.marker}</span>}</button>;
  };
  return { act, node, control, running };
}
