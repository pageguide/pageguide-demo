import manifest from './saved-manifest.json';
import type { PageDoc } from './types';

const versions: Record<string, { version: string }> = manifest;
const pending = new Map<string, Promise<PageDoc>>();

/** Static, compressed, versioned delivery: no serverless function or upstream website needed. */
export function savedPageRequest(id: string, refresh = false): Promise<PageDoc> {
  const version = versions[id]?.version;
  if (!version) return Promise.reject(new Error('Unknown saved page.'));
  if (refresh) pending.delete(id);
  if (!pending.has(id)) {
    const request = fetch(`/saved/${id}.json.gz?v=${version}`, { cache: refresh ? 'reload' : 'default', signal: AbortSignal.timeout(20000) })
      .then(async (response) => {
        if (!response.ok) throw new Error('The packaged saved page is unavailable.');
        const doc = await response.json() as PageDoc;
        if (!doc.saved || !doc.html || !Array.isArray(doc.blocks)) throw new Error('Invalid saved page.');
        return doc;
      }).catch((error) => { pending.delete(id); throw error; });
    pending.set(id, request);
  }
  return pending.get(id)!;
}

export function prefetchSavedPage(id: string): void {
  void savedPageRequest(id).catch(() => { /* A hover must never surface a page error. */ });
}

export async function loadSavedPage(id: string, signal: AbortSignal, refresh = false): Promise<PageDoc> {
  if (signal.aborted) throw new DOMException('Navigation cancelled.', 'AbortError');
  let cancel: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    cancel = () => reject(new DOMException('Navigation cancelled.', 'AbortError'));
    signal.addEventListener('abort', cancel, { once: true });
  });
  try { return await Promise.race([savedPageRequest(id, refresh), aborted]); }
  finally { signal.removeEventListener('abort', cancel); }
}
