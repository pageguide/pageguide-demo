/** Assemble each model-authored claim with its own validated citations; never move them to a footer. */
export function composeFindAnswer(claims: unknown, fallback: string, allowed: Set<string>): string {
  if (!Array.isArray(claims) || !claims.length) {
    const markers = [...fallback.matchAll(/\[([A-Za-z]{0,2}\d+)\]/g)].map((match) => match[1]);
    return markers.some((marker) => !allowed.has(marker))
      ? 'I couldn’t verify an answer in the provided page passages.'
      : fallback;
  }
  const parts = claims.slice(0, 12).flatMap((claim) => {
    if (typeof claim?.text !== 'string' || !claim.text.trim()) return [];
    const text = claim.text.replace(/\[(?:[A-Za-z]{0,2})\d+\]/g, '').trim();
    const requested = Array.isArray(claim.markers) ? claim.markers : [];
    const markers = [...new Set<string>(requested.filter((m: unknown): m is string => typeof m === 'string' && allowed.has(m)))];
    // Preserve the model's answer, but never present a failed source check as verified.
    const unverified = requested.some((marker: unknown) => typeof marker !== 'string' || !allowed.has(marker));
    const warning = unverified ? (markers.length ? ' (Additional source not verified.)' : ' (Source not verified.)') : '';
    return [`${text}${markers.length ? ' ' + markers.map((m) => `[${m}]`).join(' ') : ''}${warning}`];
  });
  return parts.join(' ').slice(0, 4000) || 'I couldn’t verify an answer in the provided page passages.';
}
