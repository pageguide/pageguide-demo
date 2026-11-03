import { NextResponse } from 'next/server';
import { loadSavedGzip } from '@/lib/saved-pages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const responses = new Map<string, Buffer>();

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    let body = responses.get(params.id);
    if (!body) {
      body = await loadSavedGzip(params.id);
      responses.set(params.id, body);
    }
    return new Response(body, { headers: {
      'Content-Type': 'application/json', 'Content-Encoding': 'gzip',
      'Cache-Control': 'public, max-age=3600', 'X-PageGuide-Cache': 'SAVED',
    } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Saved page could not be loaded.' }, { status: 404 });
  }
}
