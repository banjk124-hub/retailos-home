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
  const { SCANNER_TEMPORAL_POLICY, ScannerTemporalFrameBuffer } = await import(pathToFileURL(output).href);

  assert.equal(SCANNER_TEMPORAL_POLICY.maxBufferedFrames, 3);
  assert.equal(SCANNER_TEMPORAL_POLICY.maxFrameAgeMs, 700);
  assert.equal(SCANNER_TEMPORAL_POLICY.maxSnapshotPixels, 640 * 360);
  assert.equal(SCANNER_TEMPORAL_POLICY.minObservationIntervalMs, 70);
  assert.equal(SCANNER_TEMPORAL_POLICY.requireMatchingGeneration, true);

  assert.match(source, /Only copied grayscale snapshots may be retained/);
  assert.match(source, /one session generation and one ROI/);
  assert.match(source, /must never override a[\s\S]+validator rejection/);
  assert.match(source, /does not delay them/);

  const buffer = new ScannerTemporalFrameBuffer();
  const makeFrame = (timestamp, sharpness, generation = 1, regionRevision = 1) => ({
    timestamp, generation, regionRevision,
    pixels: new Uint8Array(16).fill(Math.round(sharpness)),
    width: 4, height: 4,
    quality: { sharpness, edgeCoverage: 0.2, motionScore: 1, luminanceStdDev: 40, valid: true },
  });
  const first = makeFrame(100, 10);
  assert.equal(buffer.push(first), true);
  first.pixels.fill(0);
  assert.equal(buffer.selectBest(110, 1, 1).pixels[0], 10);
  assert.equal(buffer.push(makeFrame(120, 20)), false);
  assert.equal(buffer.push(makeFrame(180, 15)), true);
  assert.equal(buffer.push(makeFrame(260, 30)), true);
  assert.equal(buffer.push(makeFrame(340, 25)), true);
  assert.equal(buffer.size, 3);
  assert.equal(buffer.selectBest(350, 1, 1).timestamp, 260);
  assert.equal(buffer.selectBest(1100, 1, 1), null);
  assert.equal(buffer.selectBest(350, 2, 1), null);
  assert.equal(buffer.selectBest(350, 1, 2), null);
  assert.equal(buffer.push(makeFrame(420, 22, 1, 2)), true);
  assert.equal(buffer.size, 1);
  assert.equal(buffer.push({ ...makeFrame(500, 20), pixels: new Uint8Array(1000) }), false);
  buffer.clear();
  assert.equal(buffer.size, 0);


  console.log('Scanner temporal T1 contract tests passed: bounded snapshots, freshness, generation/ROI isolation and validation precedence.');
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
