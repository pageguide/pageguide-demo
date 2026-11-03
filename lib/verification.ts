import type { PageDoc } from './types';

export interface VerificationResult {
  completed: boolean;
  reason: string;
  answer: string;
  source: 'sandbox-state' | 'page-evidence' | 'unavailable';
}
export interface PageVerdict {
  completed?: boolean;
  kind?: 'read' | 'navigate' | 'mutate';
  reason?: string;
  answer?: string;
  expectedUrl?: string;
  checks?: { id: string; quote: string }[];
}

/** The reviewer judges relevance; the runtime independently checks its supporting quotes/URL. */
export function validatePageVerdict(value: unknown, doc: PageDoc): VerificationResult {
  const v = value as PageVerdict | null;
  const reject = (reason: string): VerificationResult => ({ completed: false, reason, answer: reason, source: 'page-evidence' });
  if (!v || v.completed !== true) return reject(typeof v?.reason === 'string' ? v.reason.slice(0, 500) : 'The observed page does not demonstrate that the requested task is complete.');
  if (v.kind !== 'read' && v.kind !== 'navigate') return reject('A page screenshot cannot verify a purchase, account change, or other unsupported state-changing task.');
  if (typeof v.answer !== 'string' || !v.answer.trim()) return reject('No grounded answer was produced for this task.');
  if (!Array.isArray(v.checks) || !v.checks.length || v.checks.length > 8) return reject('The completion check did not provide supporting page quotations.');
  const grounded = v.checks.every((c) => {
    if (typeof c?.id !== 'string' || typeof c.quote !== 'string' || c.quote.trim().length < 4) return false;
    const block = doc.blocks.find((b) => b.id === c.id && ['heading', 'paragraph', 'listitem', 'quote'].includes(b.type));
    return Boolean(block?.text.includes(c.quote));
  });
  if (!grounded) return reject('The completion check cited text that does not exist on the observed page.');
  if (v.kind === 'navigate') {
    try {
      const expected = new URL(v.expectedUrl || ''), actual = new URL(doc.url);
      expected.hash = ''; actual.hash = '';
      if (expected.href !== actual.href) return reject('The requested destination does not match the current page URL.');
    } catch { return reject('No valid destination URL was provided for navigation verification.'); }
  }
  return { completed: true, source: 'page-evidence', reason: 'Page evidence checked: supporting quotations exist on the observed page' + (v.kind === 'navigate' ? ' and the destination URL matches.' : '.'), answer: v.answer.trim().slice(0, 1500) };
}
