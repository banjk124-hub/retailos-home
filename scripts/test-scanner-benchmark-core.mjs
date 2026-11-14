import assert from 'node:assert/strict';
import {
  percentile,
  summarizeBenchmarkRows,
  validateBenchmarkManifest,
} from './scanner-benchmark/core.mjs';

const valid = {
  schemaVersion: 1,
  corpusId: 'retail-labels-local-v1',
  cases: [{
    id: 'ean13-front-001',
    image: 'ean13-front-001.png',
    captureKind: 'physical',
    expected: { value: '8938505974195', symbology: 'EAN_13' },
    scanRegion: {
      coordinateSpace: 'source-frame-normalized',
      rect: { x: 0.1, y: 0.2, width: 0.8, height: 0.6 },
    },
    labels: { orientation: '0', lighting: 'normal', surface: 'matte', deviceClass: 'mid' },
  }],
};
assert.deepEqual(validateBenchmarkManifest(valid), []);
assert.ok(validateBenchmarkManifest({ ...valid, cases: [{ ...valid.cases[0], image: '../outside.png' }] })
  .some((message) => message.includes('parent traversal')));
assert.ok(validateBenchmarkManifest({ ...valid, cases: [{ ...valid.cases[0], scanRegion: null }] })
  .some((message) => message.includes('source-frame-normalized')));
assert.ok(validateBenchmarkManifest({ ...valid, cases: [valid.cases[0], valid.cases[0]] })
  .some((message) => message.includes('duplicated')));
assert.equal(percentile([10, 20, 30, 40], 0.5), 25);

const summary = summarizeBenchmarkRows([
  { backend: 'zxing-js', expectedPositive: true, outcome: 'match', decodeMs: 10 },
  { backend: 'zxing-js', expectedPositive: true, outcome: 'miss', decodeMs: 30 },
  { backend: 'zxing-js', expectedPositive: false, outcome: 'false-positive', decodeMs: 20 },
]);
assert.equal(summary[0].exactMatches, 1);
assert.equal(summary[0].exactMatchRate, 0.5);
assert.equal(summary[0].falsePositiveRate, 1);
assert.equal(summary[0].decodeP50Ms, 20);

console.log('Scanner benchmark manifest and metrics core tests passed.');
