/** Assemble each model-authored claim with its own validated citations; never move them to a footer. */
export function composeFindAnswer(claims: unknown, fallback: string, allowed: Set<string>): string {
  if (!Array.isArray(claims) || !claims.length) return fallback;
  const parts = claims.slice(0, 12).flatMap((claim) => {
    if (typeof claim?.text !== 'string' || !claim.text.trim()) return [];
    const text = claim.text.replace(/\[(?:[A-Za-z]{0,2})\d+\]/g, '').trim();
    const markers = [...new Set<string>((Array.isArray(claim.markers) ? claim.markers : []).filter((m: unknown): m is string => typeof m === 'string' && allowed.has(m)))];
    return [`${text}${markers.length ? ' ' + markers.map((m) => `[${m}]`).join(' ') : ''}`];
  });
  return parts.join(' ').slice(0, 4000) || fallback;
}
