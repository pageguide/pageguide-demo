// Run after changing the source demo assets. Commit public/demo-media too:
// deployments serve these real-byte copies without requiring Git LFS support.
import { readFile, mkdir, copyFile } from 'node:fs/promises';

const copies = [
  ['latest.gif', 'guide-latest.gif'],
  ['guide-demo-browser.mp4', 'guide-latest.mp4'],
  ['guide-demo-browser.webm', 'guide-latest.webm'],
  ['guide-gif-seekable.mp4', 'guide-gif-seekable.mp4'],
  ['guide-gif-seekable.webm', 'guide-gif-seekable.webm'],
];
for (const [source] of copies) {
  const data = await readFile(new URL(`../demo-video/${source}`, import.meta.url));
  if (data.subarray(0, 128).toString().startsWith('version https://git-lfs')) {
    throw new Error(`${source} is an LFS pointer. Run git lfs pull before refreshing delivery assets.`);
  }
}
await mkdir(new URL('../public/demo-media/', import.meta.url), { recursive: true });
for (const [source, target] of copies) {
  await copyFile(new URL(`../demo-video/${source}`, import.meta.url), new URL(`../public/demo-media/${target}`, import.meta.url));
  console.log(`Prepared public/demo-media/${target}`);
}
