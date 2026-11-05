import type { Block } from './types';

const STOP = new Set('a an the is are was were be been being do does did when where what which who why how in on at of to for from with and or it its this that page article please tell me about'.split(' '));
const words = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];

/** Search the entire document before budgeting context; retain original block IDs and order. */
export function selectFindPassages(blocks: Block[], question: string, selectionId?: string, limit = 180): Block[] {
  if (blocks.length <= limit) return blocks;
  const terms = [...new Set(words(question).filter((word) => !STOP.has(word)))];
  const documents = blocks.map((block) => new Set(words(block.text)));
  const weights = new Map(terms.map((term) => [term, Math.log(1 + blocks.length / (1 + documents.filter((doc) => doc.has(term)).length))]));
  const ranked = blocks.map((block, index) => {
    const matches = terms.filter((term) => documents[index].has(term));
    const text = ['paragraph', 'listitem', 'quote', 'heading'].includes(block.type);
    return { index, score: matches.reduce((score, term) => score + weights.get(term)!, 0) * (1 + matches.length) * (text ? 2 : 1) };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = new Set<number>();
  const add = (index: number) => { if (index >= 0 && index < blocks.length && selected.size < limit) selected.add(index); };
  const selection = blocks.findIndex((block) => block.id === selectionId);
  if (selection >= 0) { add(selection); add(selection - 1); add(selection + 1); }
  // A little opening context, then the strongest hits anywhere in the page.
  for (let i = 0; i < Math.min(12, limit); i++) add(i);
  for (const { index } of ranked) { add(index); add(index - 1); add(index + 1); }
  for (let i = 0; i < blocks.length && selected.size < limit; i++) add(i);
  return [...selected].sort((a, b) => a - b).map((index) => blocks[index]);
}

/** Never silently turn an invented/misassigned quote into a whole-block citation. */
export function validCitationQuote(blockText: string, quote: unknown): quote is string {
  const norm = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();
  return typeof quote === 'string' && norm(quote).length > 0 && norm(blockText).includes(norm(quote));
}
