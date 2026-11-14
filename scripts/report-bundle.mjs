import { readFile, readdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const root = path.resolve(process.env.REPORT_DIST_DIR || 'dist');
const files = [];
async function walk(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) await walk(path.join(directory, entry.name), relative);
    else if (entry.isFile()) files.push(relative);
  }
}
await walk(root);
const fileStats = new Map();
for (const file of files) {
  const bytes = await readFile(path.join(root, file));
  fileStats.set(file, { file, raw: bytes.byteLength, gzip: gzipSync(bytes, { level: 9 }).byteLength });
}

let manifest = null;
try { manifest = JSON.parse(await readFile(path.join(root, '.vite', 'manifest.json'), 'utf8')); }
catch { /* Baseline builds before manifest instrumentation are analyzed from index.html imports. */ }

const records = new Map();
const entries = [];
const dynamicEntries = [];
let entrypointRawBytes = 0;
let entrypointGzipBytes = 0;

if (manifest) {
  for (const [key, item] of Object.entries(manifest)) {
    const stats = fileStats.get(item.file) || { raw: 0, gzip: 0 };
    records.set(key, { key, file: item.file, ...stats, isEntry: Boolean(item.isEntry),
      isDynamicEntry: Boolean(item.isDynamicEntry), imports: item.imports ?? [],
      dynamicImports: item.dynamicImports ?? [], css: item.css ?? [] });
  }
  function closure(entryKey, seen = new Set()) {
    if (seen.has(entryKey) || !manifest[entryKey]) return seen;
    seen.add(entryKey);
    for (const dependency of manifest[entryKey].imports ?? []) closure(dependency, seen);
    return seen;
  }
  function measureStaticClosure(entry) {
    const keys = closure(entry.key);
    const css = new Set([...keys].flatMap((key) => manifest[key]?.css ?? []));
    const raw = [...keys].reduce((n, key) => n + (records.get(key)?.raw ?? 0), 0)
      + [...css].reduce((n, file) => n + (fileStats.get(file)?.raw ?? 0), 0);
    const gzip = [...keys].reduce((n, key) => n + (records.get(key)?.gzip ?? 0), 0)
      + [...css].reduce((n, file) => n + (fileStats.get(file)?.gzip ?? 0), 0);
    return { file: entry.file, raw, gzip, staticModules: keys.size,
      cssFiles: [...css], moduleKeys: [...keys] };
  }
  const initialStaticKeys = new Set();
  const initialCssFiles = new Set();
  for (const entry of [...records.values()].filter((item) => item.isEntry)) {
    const measured = measureStaticClosure(entry);
    measured.moduleKeys.forEach((key) => initialStaticKeys.add(key));
    measured.cssFiles.forEach((file) => initialCssFiles.add(file));
    entries.push({
      file: measured.file, raw: measured.raw, gzip: measured.gzip,
      staticModules: measured.staticModules, cssFiles: measured.cssFiles,
    });
  }
  // Show both the complete closure and bytes added beyond the eager app entry.
  // Shared dependencies already downloaded at startup must not be counted twice
  // when estimating the incremental cost of opening a lazy feature.
  dynamicEntries.push(...[...records.values()]
    .filter((item) => item.isDynamicEntry)
    .map((entry) => {
      const measured = measureStaticClosure(entry);
      const incrementalKeys = measured.moduleKeys.filter((key) => !initialStaticKeys.has(key));
      const incrementalCss = measured.cssFiles.filter((file) => !initialCssFiles.has(file));
      return {
        file: measured.file,
        raw: measured.raw,
        gzip: measured.gzip,
        staticModules: measured.staticModules,
        cssFiles: measured.cssFiles,
        incrementalRaw: incrementalKeys.reduce((n, key) => n + (records.get(key)?.raw ?? 0), 0)
          + incrementalCss.reduce((n, file) => n + (fileStats.get(file)?.raw ?? 0), 0),
        incrementalGzip: incrementalKeys.reduce((n, key) => n + (records.get(key)?.gzip ?? 0), 0)
          + incrementalCss.reduce((n, file) => n + (fileStats.get(file)?.gzip ?? 0), 0),
        chunkRaw: entry.raw,
        chunkGzip: entry.gzip,
      };
    }));
} else {
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  const entryPaths = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)]
    .map((match) => new URL(match[1], 'https://retailos.invalid').pathname)
    .map((pathname) => pathname.replace(/^.*?(?=assets\/)/, ''))
    .filter((file) => fileStats.has(file));
  const jsQueue = entryPaths.filter((file) => file.endsWith('.js'));
  const seen = new Set(entryPaths);
  while (jsQueue.length) {
    const current = jsQueue.pop();
    const source = await readFile(path.join(root, current), 'utf8');
    const imports = [...source.matchAll(/(?:from\s*|import\s*)["'](\.\.?\/[^"']+\.js)["']/g)];
    for (const match of imports) {
      const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(current), match[1]));
      if (fileStats.has(dependency) && !seen.has(dependency)) {
        seen.add(dependency);
        jsQueue.push(dependency);
      }
    }
  }
  const jsFiles = [...seen].filter((file) => file.endsWith('.js'));
  const cssFiles = [...seen].filter((file) => file.endsWith('.css'));
  const raw = [...seen].reduce((n, file) => n + fileStats.get(file).raw, 0);
  const gzip = [...seen].reduce((n, file) => n + fileStats.get(file).gzip, 0);
  entries.push({ file: 'index.html entry closure (legacy baseline)', raw, gzip, staticModules: jsFiles.length, cssFiles });
}

entrypointRawBytes = entries.reduce((n, item) => n + item.raw, 0);
entrypointGzipBytes = entries.reduce((n, item) => n + item.gzip, 0);
const allFiles = [...fileStats.values()].sort((a, b) => b.raw - a.raw);
const summary = {
  fileCount: allFiles.length,
  rawBytes: allFiles.reduce((n, item) => n + item.raw, 0),
  gzipBytes: allFiles.reduce((n, item) => n + item.gzip, 0),
  entrypointRawBytes,
  entrypointGzipBytes,
  hasViteManifest: Boolean(manifest)
};
const report = [
  '# RetailOS production bundle report', '',
  'Generated: ' + new Date().toISOString(),
  'Manifest-based analysis: ' + summary.hasViteManifest, '',
  '## Initial entrypoint static closure', '',
  '| Entry | Raw bytes | Gzip bytes | Static modules |',
  '|---|---:|---:|---:|',
  ...entries.map((item) => '| ' + item.file + ' | ' + item.raw.toLocaleString('en-US') + ' | ' + item.gzip.toLocaleString('en-US') + ' | ' + item.staticModules + ' |'),
  '', '## Dynamic entry points', '',
  '| Dynamic boundary | Entry chunk raw | Entry chunk gzip | Incremental raw | Incremental gzip | Full closure raw | Full closure gzip | Static modules |',
  '|---|---:|---:|---:|---:|---:|---:|---:|',
  ...dynamicEntries.map((item) => '| ' + item.file + ' | ' + item.chunkRaw.toLocaleString('en-US') + ' | ' + item.chunkGzip.toLocaleString('en-US') + ' | ' + item.incrementalRaw.toLocaleString('en-US') + ' | ' + item.incrementalGzip.toLocaleString('en-US') + ' | ' + item.raw.toLocaleString('en-US') + ' | ' + item.gzip.toLocaleString('en-US') + ' | ' + item.staticModules + ' |'),
  '', '## Largest emitted files', '',
  '| File | Raw bytes | Gzip bytes |',
  '|---|---:|---:|',
  ...allFiles.slice(0, 35).map((item) => '| ' + item.file + ' | ' + item.raw.toLocaleString('en-US') + ' | ' + item.gzip.toLocaleString('en-US') + ' |'),
  '', '## Totals', '',
  '- Files: ' + summary.fileCount,
  '- Total raw bytes: ' + summary.rawBytes.toLocaleString('en-US'),
  '- Total gzip bytes (per-file sum): ' + summary.gzipBytes.toLocaleString('en-US'),
  '- Initial entrypoint raw bytes: ' + summary.entrypointRawBytes.toLocaleString('en-US'),
  '- Initial entrypoint gzip bytes: ' + summary.entrypointGzipBytes.toLocaleString('en-US'),
  '', '> Gzip is a per-file estimate. Legacy baseline closure is reconstructed from index.html and static relative JS imports. Browser Network/Performance traces remain authoritative for actual transfer and parse timing.', ''
].join('\n');
await writeFile(path.join(root, 'bundle-report.md'), report);
await writeFile(path.join(root, 'bundle-report.json'), JSON.stringify({ summary, entries, dynamicEntries, files: allFiles }, null, 2));
console.log(report);
