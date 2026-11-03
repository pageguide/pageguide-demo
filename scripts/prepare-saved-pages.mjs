// Build local delivery copies from the Git LFS originals. No network calls.
// Uses the same TypeScript sanitizer as custom URL loading.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const source = new URL('../lib/extract-page.ts', import.meta.url);
const compiled = ts.transpileModule(await readFile(source, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', compiled)(createRequire(source), mod, mod.exports);
const { extractPage } = mod.exports;
const files = JSON.parse(await readFile(new URL('../lib/saved-files.json', import.meta.url), 'utf8'));
const manifest = {};
const { articles } = JSON.parse(await readFile(new URL('../lib/library-seed.json', import.meta.url), 'utf8'));
await mkdir(new URL('../public/saved/', import.meta.url), { recursive: true });
for (const [id, filename] of Object.entries(files)) {
  const html = await readFile(new URL(`../save-webpage/${filename}`, import.meta.url), 'utf8');
  if (html.startsWith('version https://git-lfs')) throw new Error('Git LFS originals are missing. Run git lfs pull first.');
  const article = articles.find((a) => a.id === id);
  const doc = { ...extractPage(html, new URL(article.source)), saved: true, sourceFile: `save-webpage/${filename}` };
  // Read the source capture date, rather than inventing a capture timestamp.
  const date = html.match(/saved date:\s*([^\n<]+)/i)?.[1];
  if (date && Number.isFinite(Date.parse(date))) doc.savedAt = new Date(date).toISOString();
  const serialized = JSON.stringify(doc);
  const compressed = gzipSync(serialized);
  await writeFile(new URL(`../public/saved/${id}.json.gz`, import.meta.url), compressed);
  manifest[id] = { version: createHash('sha256').update(serialized).digest('hex').slice(0, 16), sourceFile: doc.sourceFile, bytes: compressed.length };
  console.log(`${id}: original HTML prepared (${Math.round(compressed.length / 1024)} KiB gzip)`);
}
await writeFile(new URL('../lib/saved-manifest.json', import.meta.url), JSON.stringify(manifest, null, 2) + '\n');
