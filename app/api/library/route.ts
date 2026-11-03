import { NextResponse } from 'next/server';
import { LOCAL_LIBRARY, parseLibrary } from '@/lib/library';

export const dynamic = 'force-dynamic';

// Optional database catalog. Never block startup or require a secret/service-role key.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/pageguide_libraries?id=eq.demo&published=eq.true&select=catalog&limit=1`, {
        headers: { apikey: key }, signal: controller.signal, cache: 'no-store',
      });
      if (res.ok) {
        const rows = await res.json();
        const library = parseLibrary(rows?.[0]?.catalog);
        if (library) return NextResponse.json({ library, source: 'supabase' });
      }
    } catch { /* Missing table, policy, or network: bundled catalog remains usable. */ }
    finally { clearTimeout(timer); }
  }
  return NextResponse.json({ library: LOCAL_LIBRARY, source: 'bundled' });
}
