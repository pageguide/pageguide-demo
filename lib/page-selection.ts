import type { PageDoc, PageSelection } from './types';

/** Read a real browser selection inside the page, not arbitrary text in the assistant UI. */
export function readPageSelection(root: HTMLElement, url: string): PageSelection | null {
  const selection = root.ownerDocument.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount || !selection.anchorNode || !selection.focusNode
    || !root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return null;
  const text = selection.toString().trim().slice(0, 4000);
  if (!text) return null;
  let hash = 2166136261;
  for (const c of text) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  const generatedId = `pg-selection-${(hash >>> 0).toString(16)}`;
  const node = selection.getRangeAt(0).commonAncestorContainer;
  const element = node.nodeType === 1 ? node as HTMLElement : node.parentElement;
  if (!element || !root.contains(element)) return null;
  const source = element.closest<HTMLElement>('[data-pg-id],[data-node-id]');
  const sourceId = source && !source.matches('a,button,input,textarea,select,[role="button"]') ? source.getAttribute('data-pg-id') || source.getAttribute('data-node-id') : null;
  const id = sourceId || generatedId;
  // Keep original grounding IDs intact; extra selection anchors cover unextracted regions too.
  const ids = new Set((element.getAttribute('data-pg-selection-ids') || '').split(' ').filter(Boolean));
  ids.add(id);
  element.setAttribute('data-pg-selection-ids', [...ids].join(' '));
  return { id, text, url };
}

export function pageWithSelection(doc: PageDoc, selection: PageSelection | null | undefined): PageDoc {
  if (!selection || selection.url !== doc.url || !selection.text.trim()) return doc;
  return { ...doc, blocks: [{ id: selection.id, type: 'quote', text: selection.text.slice(0, 4000) }, ...doc.blocks.filter((b) => b.id !== selection.id)] };
}
