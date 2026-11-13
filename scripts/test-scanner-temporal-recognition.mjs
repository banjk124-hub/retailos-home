import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = await mkdtemp(path.join(root, '.scanner-temporal-contract-'));

try {
  const source = await readFile(
    path.join(root, 'src/platform/scanner/scannerTemporalRecognition.ts'),
    'utf8',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const output = path.join(tempRoot, 'scannerTemporalRecognition.js');
  await writeFile(output, compiled, 'utf8');
  const { SCANNER_TEMPORAL_POLICY } = await import(pathToFileURL(output).href);

  assert.equal(SCANNER_TEMPORAL_POLICY.maxBufferedFrames, 3);
  assert.equal(SCANNER_TEMPORAL_POLICY.maxFrameAgeMs, 700);
  assert.equal(SCANNER_TEMPORAL_POLICY.maxSnapshotPixels, 640 * 360);
  assert.equal(SCANNER_TEMPORAL_POLICY.minObservationIntervalMs, 70);
  assert.equal(SCANNER_TEMPORAL_POLICY.requireMatchingGeneration, true);

  assert.match(source, /Only copied grayscale snapshots may be retained/);
  assert.match(source, /one session generation and one ROI/);
  assert.match(source, /must never override a validator rejection/);
  assert.match(source, /does not delay them/);

  console.log('Scanner temporal T1 contract tests passed: bounded snapshots, freshness, generation/ROI isolation and validation precedence.');
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
