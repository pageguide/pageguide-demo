'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useStore } from '@/lib/store';

/** Address/search UI shown in Admin mode or with NEXT_PUBLIC_SHOW_ADDRESS_BAR=true. */
export default function BrowserAddressBar() {
  const { browserView, doc, query, loadUrl, search } = useStore();
  const location = browserView === 'empty' ? 'PageGuide library' : browserView === 'loading' ? query : browserView === 'results' ? `Search: ${query}` : doc?.url || 'PageGuide library';
  const [address, setAddress] = useState(location);
  useEffect(() => setAddress(location), [location]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = address.trim();
    if (value) void (/^https?:\/\//i.test(value) ? loadUrl(value) : search(value));
  };
  return (
    <form onSubmit={submit} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 dark:border-night-line dark:bg-night-panel">
      <span aria-hidden="true" className="text-xs text-muted">◎</span>
      <input aria-label="Search or enter website URL" value={address} onChange={event => setAddress(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none dark:text-night-ink" />
      <button type="submit" disabled={!address.trim()} className="shrink-0 rounded-md bg-orange px-2 py-1 text-xs font-medium text-white disabled:opacity-40">Go</button>
    </form>
  );
}
