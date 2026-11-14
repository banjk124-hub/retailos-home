import { readFile, writeFile } from 'node:fs/promises';

const current = JSON.parse(await readFile('dist/bundle-report.json', 'utf8'));
const baseline = JSON.parse(await readFile('baseline/dist/bundle-report.json', 'utf8'));
const delta = (next, previous) => next - previous;
const percent = (next, previous) => previous > 0 ? ((next - previous) / previous) * 100 : 0;
const fields = ['entrypointRawBytes', 'entrypointGzipBytes', 'rawBytes', 'gzipBytes'];
const lines = [
  '# RetailOS bundle comparison',
  '',
  '| Metric | Baseline | Current | Delta | Change |',
  '|---|---:|---:|---:|---:|',
  ...fields.map((field) => '| ' + field + ' | ' + baseline.summary[field] + ' | ' + current.summary[field]
    + ' | ' + delta(current.summary[field], baseline.summary[field])
    + ' | ' + percent(current.summary[field], baseline.summary[field]).toFixed(1) + '% |'),
  '',
  'Baseline manifest available: ' + baseline.summary.hasViteManifest,
  'Current manifest available: ' + current.summary.hasViteManifest,
  ''
];
const output = lines.join('\n');
await writeFile('dist/bundle-comparison.md', output);
console.log(output);
