import { NextRequest, NextResponse } from 'next/server';
import { PROVIDERS, resolveKey } from '@/lib/providers';
import type { Provider } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM = `You annotate a single image for a web agent's evidence. Given the image and an instruction describing what to locate, return ONLY JSON:
{"box": [x, y, w, h], "caption": "<short caption>"}
- "box" is the region that matches the instruction, as normalized [x, y, width, height] each 0..1 from the top-left. If nothing matches, use null.
- Keep "caption" under 15 words. Plain text.`;

export async function POST(req: NextRequest) {
  let body: { provider?: Provider; model?: string; imageUrl?: string; prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const provider = (body.provider === 'openrouter' ? 'openrouter' : 'openai') as Provider;
  const model = (body.model || PROVIDERS[provider].defaultModel).trim();
  const imageUrl = String(body.imageUrl || '').trim();
  const prompt = String(body.prompt || 'the relevant region').trim().slice(0, 500);
  if (!/^https?:\/\//i.test(imageUrl)) return NextResponse.json({ error: 'A valid image URL is required.' }, { status: 400 });

  const key = resolveKey(provider, req.headers.get('x-provider-key'));
  if (!key) return NextResponse.json({ error: 'No API key.' }, { status: 401 });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://pageguide.vercel.app';
      headers['X-Title'] = 'PageGuide Demo';
    }
    const res = await fetch(PROVIDERS[provider].endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers,
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 300,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Locate: ${prompt}` },
              { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return NextResponse.json({ box: null }); // annotation is best-effort
    const data = await res.json();
    let parsed: any;
    try {
      parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? '{}');
    } catch {
      return NextResponse.json({ box: null });
    }
    const v = parsed?.box;
    const clamp = (x: number) => Math.max(0, Math.min(1, x));
    const box =
      Array.isArray(v) && v.length === 4 && v.every((n: any) => typeof n === 'number')
        ? ([clamp(v[0]), clamp(v[1]), clamp(v[2]), clamp(v[3])] as [number, number, number, number])
        : null;
    return NextResponse.json({ box, caption: typeof parsed?.caption === 'string' ? parsed.caption.slice(0, 160) : undefined });
  } catch {
    return NextResponse.json({ box: null });
  } finally {
    clearTimeout(timer);
  }
}
