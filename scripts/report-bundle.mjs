import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const root = path.resolve('dist');
const manifest = JSON.parse(await readFile(path.join(root, '.vite', 'manifest.json'), 'utf8'));
const records = new Map();
for (const [key, item] of Object.entries(manifest)) {
  const bytes = await readFile(path.join(root, item.file));
  records.set(key, { key, file: item.file, raw: bytes.byteLength, gzip: gzipSync(bytes, { level: 9 }).byteLength,
    isEntry: Boolean(item.isEntry), isDynamicEntry: Boolean(item.isDynamicEntry),
    imports: item.imports ?? [], dynamicImports: item.dynamicImports ?? [], css: item.css ?? [] });
}
function closure(entryKey, seen = new Set()) {
  if (seen.has(entryKey) || !manifest[entryKey]) return seen;
  seen.add(entryKey);
  for (const dependency of manifest[entryKey].imports ?? []) closure(dependency, seen);
  return seen;
}
function sum(keys, field) { return [...keys].reduce((total, key) => total + (records.get(key)?.[field] ?? 0), 0); }
const entries = [...records.values()].filter((item) => item.isEntry);
const dynamicEntries = [...records.values()].filter((item) => item.isDynamicEntry);
const chunks = [...records.values()].sort((a, b) => b.raw - a.raw);
const report = [
  '# RetailOS production bundle report', '',
  'Generated: ' + new Date().toISOString(), '',
  '## Entry points and static dependency closure', '',
  '| Entry | Raw bytes | Gzip bytes | Static modules |', '|---|---:|---:|---:|',
  ...entries.map((entry) => { const keys = closure(entry.key); return '| ' + entry.file + ' | ' + sum(keys, 'raw') + ' | ' + sum(keys, 'gzip') + ' | ' + keys.size + ' |'; }),
  '', '## Dynamic entry points', '', '| Chunk | Raw bytes | Gzip bytes |', '|---|---:|---:|',
  ...dynamicEntries.map((item) => '| ' + item.file + ' | ' + item.raw + ' | ' + item.gzip + ' |'),
  '', '## Largest emitted files', '', '| File | Raw bytes | Gzip bytes |', '|---|---:|---:|',
  ...chunks.slice(0, 30).map((item) => '| ' + item.file + ' | ' + item.raw + ' | ' + item.gzip + ' |'),
  '', '## Totals', '',
  '- Emitted files: ' + records.size,
  '- Raw bytes: ' + chunks.reduce((total, item) => total + item.raw, 0),
  '- Gzip bytes (per-file sum; not transfer deduplicated): ' + chunks.reduce((total, item) => total + item.gzip, 0),
  '', '> Gzip totals are a per-file estimate. Entry-point static closures include statically imported JS modules. Use browser network traces for actual transfer and parse timing.', ''
].join('\n');
await writeFile(path.join(root, 'bundle-report.md'), report);
await writeFile(path.join(root, 'bundle-report.json'), JSON.stringify({
  entries: entries.map((entry) => ({ ...entry, staticClosure: [...closure(entry.key)] })),
  dynamicEntries, files: chunks
}, null, 2));
console.log(report);
