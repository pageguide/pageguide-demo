import type { Block } from './types';

/** Token offsets let us return the real source span, not a rewritten model quote. */
function tokens(text: string) {
  const references = /\[(?:\d+(?:\s*[,–-]\s*\d+)*|citation needed)\]/gi;
  const clean = text.replace(references, match => ' '.repeat(match.length));
  return [...clean.matchAll(/[\p{L}\p{N}]+/gu)].map(match => ({
    value: match[0].toLowerCase(), start: match.index!, end: match.index! + match[0].length,
  }));
}

export function sourceQuote(text: string, quote: unknown): string | null {
  if (typeof quote !== 'string' || !quote.trim()) return null;
  const exact = quote.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const match = new RegExp(exact, 'i').exec(text);
  if (match) return match[0];
  const wanted = tokens(quote);
  // Short fragments are too ambiguous for punctuation/reference repair.
  if (wanted.length < 6) return null;
  const actual = tokens(text);
  for (let i = 0; i <= actual.length - wanted.length; i++) {
    if (!wanted.every((token, j) => token.value === actual[i + j].value)) continue;
    let end = actual[i + wanted.length - 1].end;
    if (/[.!?;:]/.test(text[end] || ' ')) end++;
    return text.slice(actual[i].start, end);
  }
  return null;
}

export function resolveFindCitations(raw: unknown, blocks: Block[]) {
  const readable = blocks.filter(block => ['heading', 'paragraph', 'listitem', 'quote'].includes(block.type));
  return (Array.isArray(raw) ? raw : []).slice(0, 8).flatMap(citation => {
    if (!citation || typeof citation.id !== 'string') return [];
    const assigned = readable.find(block => block.id === citation.id);
    let quote = assigned ? sourceQuote(assigned.text, citation.quote) : null;
    let block = assigned;
    if (!quote) {
      const matches = readable.flatMap(candidate => {
        const found = sourceQuote(candidate.text, citation.quote);
        return found ? [{ block: candidate, quote: found }] : [];
      });
      // Never guess between multiple possible destinations.
      if (matches.length !== 1) return [];
      ({ block, quote } = matches[0]);
    }
    const emphasis = typeof citation.emphasis === 'string' ? sourceQuote(quote, citation.emphasis) : null;
    return [{ marker: String(citation.marker ?? ''), id: block!.id, quote,
      ...(emphasis ? { emphasis } : {}) }];
  });
}
