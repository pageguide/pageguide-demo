import { toPng } from 'html-to-image';

export function screenshotBox(id: string): [number, number, number, number] | undefined {
  const root = document.querySelector<HTMLElement>('[data-sandbox-root]');
  const target = Array.from(root?.querySelectorAll<HTMLElement>('[data-node-id]') || []).find((el) => el.dataset.nodeId === id);
  if (!root || !target) return;
  const a = root.getBoundingClientRect(), b = target.getBoundingClientRect();
  const width = Math.min(root.scrollWidth, 1600), height = Math.min(root.scrollHeight, 6000);
  const x = Math.max(0, (b.left - a.left) / width), y = Math.max(0, (b.top - a.top) / height);
  if (x >= 1 || y >= 1) return;
  return [x, y, Math.min(b.width / width, 1 - x), Math.min(b.height / height, 1 - y)];
}

/** Capture the actual currently rendered page, never substitute a stock page image. */
export async function capturePage(): Promise<string> {
  // Give React a chance to commit the action and let the browser paint its result.
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const sandbox = document.querySelector<HTMLElement>('[data-sandbox-root]');
  const page = document.querySelector<HTMLElement>('[data-pageguide-page]');
  const frame = page?.querySelector('iframe');
  const root = sandbox || frame?.contentDocument?.body || page;
  if (!root) throw new Error('No rendered page is available for a screenshot.');
  const image = await toPng(root, {
    pixelRatio: 1, skipFonts: true, backgroundColor: '#ffffff',
    // Bound capture size for unusually tall remote pages. Sandbox pages are short.
    height: Math.min(root.scrollHeight, 6000),
    width: Math.min(root.scrollWidth, 1600),
  });
  if (!image.startsWith('data:image/png;base64,')) throw new Error('Screenshot capture failed.');
  return image;
}
