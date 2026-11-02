import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Tells the client which providers already have a server-side key (Vercel env),
// so the UI can show that no key is needed. Never returns the keys themselves.
export async function GET() {
  return NextResponse.json({
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    openrouter: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
  });
}
