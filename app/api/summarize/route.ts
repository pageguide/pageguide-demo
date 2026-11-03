import { NextRequest, NextResponse } from 'next/server';
import { PROVIDERS, resolveKey } from '@/lib/providers';
import type { Provider } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SYSTEM = `You are the summarization agent for a web task-automation agent. You are given the task, the journey (actions performed, in order), and the names of evidence screenshots that were saved. Decide whether the task was completed and write a short final answer.

Return ONLY JSON:
{"status": "Completed" | "Incomplete" | "Failed",
 "answer": "<1-2 sentence final answer; reference a saved evidence as [EV:<name>] where helpful>",
 "reasoning": "<2-4 short sentences: what you observed and why you reached this conclusion>"}
- Reference evidence ONLY by its exact provided name inside [EV:...]. Do not invent evidence.
- Plain text. Keep it concise.`;

export async function POST(req: NextRequest) {
  let body: {
    provider?: Provider;
    model?: string;
    task?: string;
    journey?: string[];
    evidence?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const provider = (body.provider === 'openrouter' ? 'openrouter' : 'openai') as Provider;
  const model = (body.model || PROVIDERS[provider].defaultModel).trim();
  const key = resolveKey(provider, req.headers.get('x-provider-key'));
  if (!key) return NextResponse.json({ error: `No ${PROVIDERS[provider].label} API key.` }, { status: 401 });

  const payload = {
    task: String(body.task || '').slice(0, 500),
    journey: (Array.isArray(body.journey) ? body.journey : []).slice(0, 20).map((s) => String(s).slice(0, 300)),
    evidence: (Array.isArray(body.evidence) ? body.evidence : []).slice(0, 20).map((s) => String(s).slice(0, 100)),
  };

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
        max_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: JSON.stringify(payload) },
        ],
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => null);
      return NextResponse.json(
        { error: e?.error?.message ? String(e.error.message).slice(0, 160) : `Summarizer failed (HTTP ${res.status}).` },
        { status: 502 },
      );
    }
    const data = await res.json();
    let parsed: any;
    try {
      parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? '{}');
    } catch {
      return NextResponse.json({ error: 'Summarizer returned an unreadable response.' }, { status: 502 });
    }
    const status = ['Completed', 'Incomplete', 'Failed'].includes(parsed?.status) ? parsed.status : 'Incomplete';
    const answer = typeof parsed?.answer === 'string' ? parsed.answer.slice(0, 1000) : 'Task finished.';
    const reasoning = typeof parsed?.reasoning === 'string' ? parsed.reasoning.slice(0, 2000) : '';
    return NextResponse.json({ status, answer, reasoning });
  } catch (err: unknown) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return NextResponse.json({ error: aborted ? 'Summarizer timed out.' : 'Could not reach the summarizer.' }, { status: 504 });
  } finally {
    clearTimeout(timer);
  }
}
