import type { Evidence } from './types';

/** Only named, agent-selected evidence actually cited in this answer belongs in its gallery. */
export function evidenceForAnswer(answer: string, saved: Evidence[]): Evidence[] {
  const byName = new Map(saved.map((item) => [item.name.toLowerCase(), item]));
  const seen = new Set<string>();
  const result: Evidence[] = [];
  for (const match of answer.matchAll(/\[EV:([a-z0-9-]+)\]/gi)) {
    const name = match[1].toLowerCase();
    const item = byName.get(name);
    if (item && !seen.has(name)) { seen.add(name); result.push(item); }
  }
  return result;
}
