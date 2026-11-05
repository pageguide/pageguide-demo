export interface DemoCaption { start: number; end: number; text: string }

export function parseDemoCaptions(vtt: string): DemoCaption[] {
  const seconds = (time: string) => time.trim().split(':').reduce((total, value) => total * 60 + Number(value), 0);
  return vtt.trim().split(/\r?\n\s*\r?\n/).flatMap(block => {
    const lines = block.split(/\r?\n/);
    const index = lines.findIndex(line => line.includes(' --> '));
    if (index < 0) return [];
    const [from, to] = lines[index].split(' --> ');
    const start = seconds(from), end = seconds(to.split(/\s+/)[0]);
    const text = lines.slice(index + 1).join(' ').replace(/<[^>]+>/g, '').trim();
    return Number.isFinite(start) && Number.isFinite(end) && end > start && text ? [{ start, end, text }] : [];
  });
}
