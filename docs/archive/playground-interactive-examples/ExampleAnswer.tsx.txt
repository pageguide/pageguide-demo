'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ExampleAnswer({ answer, image, description }: { answer: string; image: string; description: string }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    if (expanded) dialog.current?.showModal();
  }, [expanded]);
  return (
    <div className="relative mt-3 rounded-lg bg-white/60 p-3 text-sm leading-snug text-ink dark:bg-white/5 dark:text-night-ink"
      onMouseLeave={() => setOpen(false)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}>
      <p className="mb-1 text-xs font-semibold text-muted dark:text-night-muted">Example agent answer</p>
      <p>{answer}{' '}
        <button type="button" aria-label={`Preview evidence: ${description}`} aria-describedby={open ? id : undefined}
          aria-haspopup="dialog"
          onMouseEnter={() => { if (!expanded) setOpen(true); }} onFocus={() => { if (!expanded) setOpen(true); }}
          onClick={() => { setOpen(false); setExpanded(true); }}
          className="inline-flex min-h-6 items-center rounded-md bg-orange-soft px-1.5 py-0.5 text-sm font-semibold text-[#8c5a2b] hover:bg-orange/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange">[1]</button>
      </p>
      <p className="mt-1 text-xs text-muted dark:text-night-muted">Hover [1] to preview · Click to enlarge.</p>
      {open && !expanded && <div id={id} role="tooltip" className="absolute bottom-full left-0 z-50 w-full pb-2" onMouseEnter={() => setOpen(true)}>
        <div className="rounded-xl border border-orange-ring bg-white p-2 shadow-xl dark:border-night-line dark:bg-night-panel">
          <img src={image} alt={description} className="block h-auto max-h-80 w-full rounded-lg object-contain" />
          <p className="mt-2 text-xs text-muted dark:text-night-muted">Saved evidence [1] · {description}</p>
        </div>
      </div>}
      {expanded && createPortal(
        <dialog ref={dialog} aria-label="Saved evidence screenshot" onClose={() => setExpanded(false)} onCancel={() => setExpanded(false)}
          onClick={(event) => { if (event.target === event.currentTarget) setExpanded(false); }}
          className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-5xl overflow-auto rounded-2xl border border-line bg-white p-4 text-ink shadow-xl backdrop:bg-black/60 dark:border-night-line dark:bg-night-panel dark:text-night-ink">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold">Saved evidence [1]</h2>
            <button type="button" autoFocus aria-label="Close evidence screenshot" onClick={() => setExpanded(false)} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-orange-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange">✕</button>
          </div>
          <img src={image} alt={description} className="block h-auto max-h-[70dvh] w-full rounded-lg object-contain" />
          <p className="mt-3 text-sm text-muted dark:text-night-muted">{description}</p>
        </dialog>, document.body)}
    </div>
  );
}
