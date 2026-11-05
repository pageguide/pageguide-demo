import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Serve the browser-compatible Git LFS asset without duplicating it under public/.
// Byte ranges are required for browser playback and seeking.
async function serve(request: Request, head = false) {
  const requested = new URL(request.url).searchParams.get('format');
  const format = requested === 'gif' ? 'gif' : requested === 'webm' ? 'webm' : 'mp4';
  const filename = path.join(process.cwd(), 'demo-video', format === 'gif' ? 'latest.gif' : `guide-demo-browser.${format}`);
  let size: number;
  try { size = (await stat(filename)).size; }
  catch { return new Response('Demo video is unavailable.', { status: 404 }); }
  if (size < 1024) return new Response('Download the demo video with git lfs pull.', { status: 503 });

  const headers = new Headers({
    'Content-Type': format === 'gif' ? 'image/gif' : `video/${format}`,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=3600',
  });
  let start = 0, end = size - 1;
  const range = request.headers.get('range');
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    if (!match[1]) {
      const suffix = Number(match[2]);
      start = Math.max(0, size - suffix);
      if (!suffix) start = size;
    } else {
      start = Number(match[1]);
      end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    }
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  }
  headers.set('Content-Length', String(end - start + 1));
  const body = head ? null : Readable.toWeb(createReadStream(filename, { start, end, signal: request.signal })) as ReadableStream<Uint8Array>;
  return new Response(body, { status: range ? 206 : 200, headers });
}

export const GET = (request: Request) => serve(request);
export const HEAD = (request: Request) => serve(request, true);
