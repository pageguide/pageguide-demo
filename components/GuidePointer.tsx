'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/lib/store';

type PointerLayout = { left: number; top: number; width: number; height: number; path: string; tipX: number; tipY: number };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** A live callout, not part of the screenshot or an overlay over the actual control. */
export default function GuidePointer() {
  const pending = useStore(s => s.pendingConfirm);
  const manual = useStore(s => s.uiMode === 'manual');
  const running = useStore(s => s.guideRun?.running);
  const targetId = useStore(s => s.guide?.steps[s.guide.current]?.id);
  const url = useStore(s => s.doc?.url);
  const resolveConfirm = useStore(s => s.resolveConfirm);
  const [layout, setLayout] = useState<PointerLayout | null>(null);
  const markerId = `guide-arrow-${useId().replace(/:/g, '')}`;
  const active = manual && running && !!pending && !!targetId;

  useEffect(() => {
    setLayout(null);
    if (!active || !targetId) return;
    const page = document.querySelector<HTMLElement>('[data-pageguide-page]');
    if (!page) return;
    let target: Element | null = null;
    let frame: HTMLIFrameElement | null = null;
    let eventWindow: Window | null = null;
    let raf = 0;
    let reveal = true;
    const approveTarget = (event: Event) => {
      const state = useStore.getState();
      if (state.uiMode !== 'manual' || !state.pendingConfirm || state.guide?.steps[state.guide.current]?.id !== targetId) return;
      if (target && event.target && target.contains(event.target as Node)) {
        // Approve the queued action, never also dispatch the native action. This keeps
        // purchases/posts behind the same confirmation and prevents double clicks.
        event.preventDefault();
        event.stopImmediatePropagation();
        state.resolveConfirm(true);
      }
    };
    const observer = new ResizeObserver(() => schedule());
    const getTarget = () => {
      frame = page.querySelector('iframe');
      const source: ParentNode = frame?.contentDocument || page;
      const candidates = Array.from(source.querySelectorAll('[data-node-id], [data-pg-id]')).filter(el => el.getAttribute('data-node-id') === targetId || el.getAttribute('data-pg-id') === targetId);
      // Ignore hidden proxy controls (e.g. museum floor buttons) and choose the
      // visible copy when a track has both a player and a list-row control.
      const visible = candidates.filter(el => { const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4; });
      return visible.find(el => { const r = screenRect(el); const a = page.getBoundingClientRect(); return r.bottom > a.top && r.top < a.bottom && r.right > a.left && r.left < a.right; })
        || visible[0]
        || (/^floor-[12]$/.test(targetId) ? page.querySelector('[aria-label="Museum floor"]') : null);
    };
    const screenRect = (el: Element) => {
      const r = el.getBoundingClientRect();
      if (!frame || el.ownerDocument === document) return r;
      const f = frame.getBoundingClientRect();
      const scaleX = f.width / (frame.offsetWidth || f.width), scaleY = f.height / (frame.offsetHeight || f.height);
      return { left: f.left + (frame.clientLeft + r.left) * scaleX, top: f.top + (frame.clientTop + r.top) * scaleY, right: f.left + (frame.clientLeft + r.right) * scaleX, bottom: f.top + (frame.clientTop + r.bottom) * scaleY, width: r.width * scaleX, height: r.height * scaleY };
    };
    const measure = () => {
      raf = 0;
      const found = getTarget();
      if (found !== target) {
        if (target) observer.unobserve(target);
        eventWindow?.removeEventListener('click', approveTarget, true);
        eventWindow?.removeEventListener('scroll', schedule, true);
        target = found;
        eventWindow = target?.ownerDocument.defaultView || null;
        eventWindow?.addEventListener('click', approveTarget, true);
        eventWindow?.addEventListener('scroll', schedule, true);
        if (target) observer.observe(target);
      }
      if (!target) { setLayout(null); return; }
      if (reveal) { reveal = false; target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }); }
      const a = page.getBoundingClientRect(), b = screenRect(target);
      const bounds = { left: Math.max(8, a.left + 8), top: Math.max(8, a.top + 8), right: Math.min(window.innerWidth - 8, a.right - 8), bottom: Math.min(window.innerHeight - 8, a.bottom - 8) };
      if (b.right <= bounds.left || b.left >= bounds.right || b.bottom <= bounds.top || b.top >= bounds.bottom) { setLayout(null); return; }
      const width = Math.min(260, bounds.right - bounds.left), height = Math.min(88, bounds.bottom - bounds.top);
      if (width < 100 || height < 60) { setLayout(null); return; }
      const cx = clamp((b.left + b.right) / 2, bounds.left, bounds.right);
      const left = clamp(cx - width / 2, bounds.left, bounds.right - width);
      const above = b.top - bounds.top >= height + 45 || (b.top - bounds.top > bounds.bottom - b.bottom);
      const top = clamp(above ? b.top - height - 48 : b.bottom + 48, bounds.top, bounds.bottom - height);
      const sx = clamp(cx, left + 20, left + width - 20), sy = above ? top + height : top;
      const tipY = clamp(above ? b.top - 8 : b.bottom + 8, bounds.top, bounds.bottom);
      const bend = above ? 28 : -28;
      // Stop the round-capped shaft inside the head, not at its point. Otherwise
      // both shaft strokes protrude past the head as a second, rounded tip.
      const shaftY = tipY - (above ? 15 : -15);
      const next = { left, top, width, height, tipX: cx, tipY, path: `M${sx},${sy} C${sx},${sy + bend} ${cx},${shaftY - bend} ${cx},${shaftY}` };
      setLayout(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    function schedule() { if (!raf) raf = requestAnimationFrame(measure); }
    const onResize = () => { reveal = true; schedule(); };
    observer.observe(page);
    const mutations = new MutationObserver(schedule);
    mutations.observe(page, { childList: true, subtree: true, attributes: true, characterData: true });
    document.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', onResize);
    page.addEventListener('load', schedule, true);
    schedule();
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      mutations.disconnect();
      document.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', onResize);
      page.removeEventListener('load', schedule, true);
      eventWindow?.removeEventListener('click', approveTarget, true);
      eventWindow?.removeEventListener('scroll', schedule, true);
    };
  }, [active, targetId, pending, url]);

  if (!active || !layout) return null;
  return createPortal(<div data-guide-pointer data-target-id={targetId} className="pointer-events-none fixed inset-0 z-[45]" role="region" aria-label="Current manual step">
    <svg className="h-full w-full overflow-visible" aria-hidden="true" style={{ filter: 'drop-shadow(0 2px 3px #0004)' }}>
      <defs><marker id={markerId} markerUnits="userSpaceOnUse" markerWidth="25" markerHeight="25" viewBox="0 0 25 25" refX="8" refY="12.5" orient="auto"><path d="M2 2L23 12.5L2 23L6 12.5Z" fill="#e96d2c" stroke="white" strokeWidth="2" strokeLinejoin="round" /></marker></defs>
      <path d={layout.path} fill="none" stroke="white" strokeWidth="12" strokeLinecap="round" />
      <path data-testid="manual-guide-arrow" data-tip-x={layout.tipX} data-tip-y={layout.tipY} d={layout.path} fill="none" stroke="#e96d2c" strokeWidth="7" strokeLinecap="round" markerEnd={`url(#${markerId})`} />
    </svg>
    <button type="button" aria-label="Perform highlighted step" onClick={() => resolveConfirm(true)} className="pointer-events-auto fixed flex flex-col justify-center rounded-2xl border-2 border-white bg-[#e96d2c] px-3 py-2 text-left text-white shadow-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-orange" style={{ left: layout.left, top: layout.top, width: layout.width, height: layout.height }}>
      <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">Your next step</span>
      <span className="line-clamp-2 text-sm font-semibold leading-tight">{pending?.instruction}</span>
      <span className="mt-1 text-[10px] leading-tight">Click here or the highlighted control</span>
    </button>
  </div>, document.body);
}
