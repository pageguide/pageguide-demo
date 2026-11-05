export const dynamic = 'force-dynamic';

// Backwards compatibility for old cached demo URLs. Real media is served by
// the static host/CDN, not a serverless function or a runtime Git LFS read.
export function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get('format');
  const extension = format === 'gif' ? 'gif' : format === 'webm' ? 'webm' : 'mp4';
  const target = new URL(`/demo-media/guide-latest.${extension}`, url);
  const version = url.searchParams.get('v');
  if (version) target.searchParams.set('v', version);
  return Response.redirect(target, 307);
}

export const HEAD = GET;
