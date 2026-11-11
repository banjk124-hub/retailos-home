import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(
  new URL('../src/platform/scanner/scannerScale.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const url = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64');
const { resolveScannerRoiScaleCandidates } = await import(url);

const normal = resolveScannerRoiScaleCandidates(400, 200);
assert.deepEqual(normal.map(({ width, height }) => [width, height]), [
  [600, 300],
  [400, 200],
  [800, 400],
], 'the deployed 1.5x scale remains first, followed by bounded 1x and 2x fallbacks');
assert.equal(normal[0].baseline, true);
assert.equal(normal[1].baseline, false);
assert.equal(normal[2].baseline, false);
assert.equal(resolveScannerRoiScaleCandidates(0, 200).length, 0,
  'invalid ROI dimensions must not produce scale candidates');
assert.equal(resolveScannerRoiScaleCandidates(Number.NaN, 200).length, 0,
  'non-finite ROI dimensions must not produce scale candidates');

const large = resolveScannerRoiScaleCandidates(1280, 2000);
assert.equal(large[0].width, 1920,
  'the existing 1.5x baseline dimensions must remain unchanged');
assert.ok(large.slice(1).every(({ width, height }) => width * height <= 6_000_000),
  'every additional candidate must remain within the 6 MP allocation budget');
assert.equal(new Set(large.map(({ width, height }) => `${width}x${height}`)).size, large.length,
  'duplicate integer candidate dimensions must be removed');
assert.ok(large.length <= 3,
  'candidate fan-out must remain bounded to baseline plus two fallbacks');

console.log('Scanner adaptive ROI scale candidate regression tests passed.');
