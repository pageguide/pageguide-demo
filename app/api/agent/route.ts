import { NextRequest, NextResponse } from 'next/server';
import { PROVIDERS, resolveKey } from '@/lib/providers';
import type { Block, PageDoc, Provider } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BLOCKS = 160;

const SYSTEM = `You are an autonomous web agent completing a task across web pages. Each turn you OBSERVE the current page (a list of blocks with ids) and your history, then emit ONE next action for the browser to perform. You may also navigate to other pages.

Return ONLY JSON:
{"thought": "<brief reasoning>",
 "instruction": "<one concise human-readable sentence describing this step>",
 "action": {"type": "navigate" | "click" | "fill" | "finish", "id": "<block id, for click/fill or a link to navigate>", "url": "<absolute http(s) url, for navigate>", "value": "<text, for fill>"},
 "evidence": {"name": "<short-kebab-id>", "imageId": "<page IMAGE block id to capture>", "annotate": "<what to highlight>"}}

Rules:
- "navigate": go to a page. Provide either a link block "id" (has control:true, type link) or an absolute "url". Use this to reach the right site/page for the task.
- "click": press a button/link with that control "id". "fill": type "value" into an input "id".
- "finish": the task is complete (or cannot proceed). Emit this when done.
- Only use ids that exist in the CURRENT page blocks. Control actions need control:true blocks.
- "evidence" is optional: save a screenshot as proof. "imageId" must be a page IMAGE block id; "annotate" describes what to box. Save evidence at key moments, especially the final confirmation.
- Prefer the fewest steps. Do not repeat an action already in your history.`;

export async function POST(req: NextRequest) {
  let body: {
    provider?: Provider;
    model?: string;
    task?: string;
    doc?: PageDoc;
    history?: { instruction: string; action: string }[];
    evidence?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const provider = (body.provider === 'openrouter' ? 'openrouter' : 'openai') as Provider;
  const model = (body.model || PROVIDERS[provider].defaultModel).trim();
  const task = String(body.task || '').slice(0, 500);
  const doc = body.doc;
  if (!task) return NextResponse.json({ error: 'A task is required.' }, { status: 400 });
  if (!doc || !Array.isArray(doc.blocks)) return NextResponse.json({ error: 'No page is loaded.' }, { status: 400 });

  const key = resolveKey(provider, req.headers.get('x-provider-key'));
  if (!key) return NextResponse.json({ error: `No ${PROVIDERS[provider].label} API key.` }, { status: 401 });

  const blocks: Block[] = doc.blocks.slice(0, MAX_BLOCKS);
  const controlIds = new Set(blocks.filter((b) => b.control).map((b) => b.id));
  const imageIds = new Set(blocks.filter((b) => b.type === 'image' && b.src).map((b) => b.id));
  const compact = blocks.map((b) => ({
    id: b.id,
    type: b.type,
    text: b.text,
    ...(b.control ? { control: true } : {}),
    ...(b.type === 'link' && b.href ? { href: b.href } : {}),
  }));
  const userJson = JSON.stringify({
    task,
    page: { title: doc.title, url: doc.url, blocks: compact },
    history: (body.history || []).slice(-10),
    savedEvidence: body.evidence || [],
  });
  const imageBlocks = blocks.filter((b) => b.type === 'image' && b.src && /\.(png|jpe?g|gif|webp)(\?|#|$)/i.test(b.src!)).slice(0, 3);
  const userMessage = imageBlocks.length
    ? {
        role: 'user' as const,
        content: [
          { type: 'text', text: userJson },
          ...imageBlocks.flatMap((img) => [
            { type: 'text', text: `IMAGE ${img.id}:` },
            { type: 'image_url', image_url: { url: img.src as string, detail: 'low' } },
          ]),
        ],
      }
    : { role: 'user' as const, content: userJson };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);
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
        messages: [{ role: 'system', content: SYSTEM }, userMessage],
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => null);
      return NextResponse.json(
        { error: e?.error?.message ? String(e.error.message).slice(0, 160) : `Agent request failed (HTTP ${res.status}).` },
        { status: 502 },
      );
    }
    const data = await res.json();
    let parsed: any;
    try {
      parsed = JSON.parse(data?.choices?.[0]?.message?.content ?? '{}');
    } catch {
      const mm = (data?.choices?.[0]?.message?.content ?? '').match(/\{[\s\S]*\}/);
      parsed = mm ? JSON.parse(mm[0]) : {};
    }

    const a = parsed?.action || {};
    let type = ['navigate', 'click', 'fill', 'finish'].includes(a.type) ? a.type : 'finish';
    const action: any = { type };
    if (type === 'navigate') {
      if (typeof a.url === 'string' && /^https?:\/\//i.test(a.url)) action.url = a.url.slice(0, 2000);
      else if (typeof a.id === 'string' && controlIds.has(a.id)) action.id = a.id;
      else type = action.type = 'finish'; // nothing valid to navigate to
    } else if (type === 'click') {
      if (typeof a.id === 'string' && controlIds.has(a.id)) action.id = a.id;
      else action.type = 'finish';
    } else if (type === 'fill') {
      if (typeof a.id === 'string' && controlIds.has(a.id)) {
        action.id = a.id;
        action.value = typeof a.value === 'string' ? a.value.slice(0, 200) : '';
      } else action.type = 'finish';
    }

    let evidence: { name: string; imageId?: string; annotate?: string } | undefined;
    const ev = parsed?.evidence;
    if (ev && typeof ev.name === 'string' && ev.name.trim()) {
      evidence = {
        name: ev.name.trim().replace(/[^a-z0-9-]+/gi, '-').toLowerCase().slice(0, 60),
        ...(typeof ev.imageId === 'string' && imageIds.has(ev.imageId) ? { imageId: ev.imageId } : {}),
        ...(typeof ev.annotate === 'string' ? { annotate: ev.annotate.slice(0, 200) } : {}),
      };
    }

    return NextResponse.json({
      thought: typeof parsed?.thought === 'string' ? parsed.thought.slice(0, 500) : '',
      instruction: typeof parsed?.instruction === 'string' ? parsed.instruction.slice(0, 300) : action.type,
      action,
      ...(evidence ? { evidence } : {}),
    });
  } catch (err: unknown) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return NextResponse.json({ error: aborted ? 'Agent timed out.' : 'Could not reach the agent.' }, { status: 504 });
  } finally {
    clearTimeout(timer);
  }
}
