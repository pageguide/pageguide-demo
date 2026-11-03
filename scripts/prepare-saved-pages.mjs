// Build local delivery copies from the Git LFS originals. No network calls.
// Uses the same TypeScript sanitizer as custom URL loading.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { gzipSync } from 'node:zlib';
import ts from 'typescript';
const source = new URL('../lib/extract-page.ts', import.meta.url);
const compiled = ts.transpileModule(await readFile(source, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', compiled)(createRequire(source), mod, mod.exports);
const { extractPage } = mod.exports;
const files = {
  'cold-war': 'Cold War - Wikipedia (11_3_2026 11：37：00 AM).html',
  manhattan: 'Manhattan - Wikipedia (11_3_2026 11：36：47 AM).html',
  'roman-empire': 'Roman Empire - Wikipedia (11_3_2026 11：36：36 AM).html',
};
const { articles } = JSON.parse(await readFile(new URL('../lib/library-seed.json', import.meta.url), 'utf8'));
await mkdir(new URL('../public/saved/', import.meta.url), { recursive: true });
for (const [id, filename] of Object.entries(files)) {
  const html = await readFile(new URL(`../save-webpage/${filename}`, import.meta.url), 'utf8');
  if (html.startsWith('version https://git-lfs')) throw new Error('Git LFS originals are missing. Run git lfs pull first.');
  const article = articles.find((a) => a.id === id);
  const doc = { ...extractPage(html, new URL(article.source)), saved: true };
  // Read the source capture date, rather than inventing a capture timestamp.
  const date = html.match(/saved date:\s*([^\n<]+)/i)?.[1];
  if (date && Number.isFinite(Date.parse(date))) doc.savedAt = new Date(date).toISOString();
  const compressed = gzipSync(JSON.stringify(doc));
  await writeFile(new URL(`../public/saved/${id}.json.gz`, import.meta.url), compressed);
  console.log(`${id}: original HTML prepared (${Math.round(compressed.length / 1024)} KiB gzip)`);
}
