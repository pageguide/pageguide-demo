import { toPng } from 'html-to-image';

type Box = [number, number, number, number];
type Rect = { left: number; top: number; width: number; height: number };

/** Normalize against the rendered capture, clipping targets that cross its edges. */
export function normalizedScreenshotBox(origin: Rect, target: Rect, width: number, height: number, scrollLeft = 0, scrollTop = 0): Box | undefined {
  if (width <= 0 || height <= 0) return;
  const left = target.left - origin.left + scrollLeft;
  const top = target.top - origin.top + scrollTop;
  const x = Math.max(0, left), y = Math.max(0, top);
  const right = Math.min(width, left + target.width), bottom = Math.min(height, top + target.height);
  if (right <= x || bottom <= y) return;
  return [x / width, y / height, (right - x) / width, (bottom - y) / height];
}

export function screenshotBox(id: string, root = document.querySelector<HTMLElement>('[data-sandbox-root]'), width = root?.clientWidth || 0, height = Math.min(root?.scrollHeight || 0, 6000)): Box | undefined {
  if (!root) return;
  const target = Array.from(root.querySelectorAll<HTMLElement | SVGElement>('[data-node-id], [data-pg-id], [id]')).find(el => el.getAttribute('data-node-id') === id || el.getAttribute('data-pg-id') === id || el.id === id);
  if (!target) return;
  return normalizedScreenshotBox(root.getBoundingClientRect(), target.getBoundingClientRect(), width, height, root.scrollLeft, root.scrollTop);
}

/** Capture and measure the same laid-out DOM, not coordinates from a scrolled live page. */
export async function capturePageWithBox(targetId?: string, signal?: AbortSignal): Promise<{ imageUrl: string; box?: Box }> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  else signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(cancel, 12000);
  let wrapper: HTMLDivElement | undefined;
  const stopped = new Promise<never>((_, reject) => {
    const fail = () => reject(new Error('Screenshot capture timed out or was cancelled.'));
    if (controller.signal.aborted) fail();
    else controller.signal.addEventListener('abort', fail, { once: true });
  });
  try {
    return await Promise.race([
      stopped,
      captureSnapshot(targetId, controller.signal, element => { wrapper = element; }),
    ]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
    wrapper?.remove();
  }
}

async function captureSnapshot(targetId: string | undefined, signal: AbortSignal, registerWrapper: (element: HTMLDivElement) => void): Promise<{ imageUrl: string; box?: Box }> {
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  signal.throwIfAborted();
  const sandbox = document.querySelector<HTMLElement>('[data-sandbox-root]');
  const page = document.querySelector<HTMLElement>('[data-pageguide-page]');
  const frame = page?.querySelector('iframe');
  const root = sandbox || frame?.contentDocument?.body || page;
  if (!root) throw new Error('No rendered page is available for a screenshot.');
  const width = root.clientWidth || root.offsetWidth;
  const height = Math.min(root.scrollHeight, 6000);
  if (!width || !height) throw new Error('The rendered page has no capture area.');

  // An offscreen copy avoids moving the user's scroll position. Its full capture-height
  // layout also places sticky headers/players exactly where they appear in the PNG.
  const wrapper = root.ownerDocument.createElement('div');
  registerWrapper(wrapper);
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.setAttribute('inert', '');
  Object.assign(wrapper.style, { position: 'fixed', left: '-100000px', top: '0', width: `${width}px`, height: `${height}px`, opacity: '0', pointerEvents: 'none' });
  const snapshot = root.cloneNode(true) as HTMLElement;
  snapshot.removeAttribute('data-sandbox-root');
  snapshot.removeAttribute('data-pageguide-page');
  Object.assign(snapshot.style, { position: 'relative', left: '0', top: '0', width: `${width}px`, height: `${height}px`, maxWidth: 'none', maxHeight: 'none', margin: '0', overflow: 'hidden' });
  snapshot.querySelectorAll('script').forEach(script => script.remove());
  const originals = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select');
  snapshot.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select').forEach((field, i) => {
    field.value = originals[i].value;
    if (field.tagName === 'INPUT') (field as HTMLInputElement).checked = (originals[i] as HTMLInputElement).checked;
  });
  const canvases = root.querySelectorAll('canvas');
  snapshot.querySelectorAll('canvas').forEach((canvas, i) => { try { canvas.getContext('2d')?.drawImage(canvases[i], 0, 0); } catch { /* Ignore unavailable canvases. */ } });
  wrapper.appendChild(snapshot);
  root.ownerDocument.body.appendChild(wrapper);

  // html-to-image waits for `onload` on detached SVG <image> nodes, which
  // never fires in some browsers. Pre-embed their hrefs so that path is skipped.
  await Promise.all(Array.from(snapshot.querySelectorAll<SVGImageElement>('svg image')).map(async image => {
    const href = image.getAttribute('href') || image.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    if (!href || /^(data:|#)/i.test(href)) return;
    const response = await fetch(new URL(href, root.ownerDocument.baseURI), { signal });
    if (!response.ok) throw new Error('Could not load a screenshot image.');
    const blob = await response.blob();
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Could not embed a screenshot image.'));
      reader.readAsDataURL(blob);
    });
    signal.throwIfAborted();
    image.setAttribute('href', data);
    image.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
  }));
  signal.throwIfAborted();
  const box = targetId ? screenshotBox(targetId, snapshot, width, height) : undefined;
  const scale = Math.min(1, 1600 / width);
  const imageUrl = await toPng(snapshot, {
    pixelRatio: 1, skipFonts: true, backgroundColor: '#ffffff', width, height,
    fetchRequestInit: { signal },
    // Resize the output canvas, never the layout: narrower layout widths reflow
    // navigation and invalidate the annotation's measured coordinates.
    canvasWidth: Math.round(width * scale), canvasHeight: Math.round(height * scale),
  });
  if (!imageUrl.startsWith('data:image/png;base64,')) throw new Error('Screenshot capture failed.');
  return { imageUrl, box };
}

/** Capture the current rendered page without an annotation. */
export async function capturePage(): Promise<string> {
  return (await capturePageWithBox()).imageUrl;
}
