import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const compileModule = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;

const roiSource = await readFile(
  new URL('../src/platform/scanner/scannerRoi.ts', import.meta.url),
  'utf8',
);
const roiUrl = 'data:text/javascript;base64,' + Buffer.from(compileModule(roiSource)).toString('base64');
const { resolveScannerRoiCrop } = await import(roiUrl);

const crop = resolveScannerRoiCrop({
  coordinateSpace: 'source-frame-normalized',
  rect: { x: 0.25, y: 0.125, width: 0.5, height: 0.5 },
}, 1280, 720);
assert.deepEqual(crop, { x: 320, y: 90, width: 640, height: 360 },
  'normalized source region must map to the corresponding source pixels');

const fractional = resolveScannerRoiCrop({
  coordinateSpace: 'source-frame-normalized',
  rect: { x: 0.39083234597, y: 0.22, width: 0.21833530806, height: 0.56 },
}, 1280, 720);
assert.deepEqual(fractional, { x: 500, y: 158, width: 280, height: 404 },
  'fractional edges must floor leading and ceil trailing pixels to avoid clipping');

const edge = resolveScannerRoiCrop({
  coordinateSpace: 'source-frame-normalized',
  rect: { x: 0.999, y: 0.999, width: 0.001, height: 0.001 },
}, 1280, 720);
assert.deepEqual(edge, { x: 1278, y: 719, width: 2, height: 1 },
  'edge-aligned regions must clamp to the source frame without exceeding it');

assert.equal(resolveScannerRoiCrop(null, 1280, 720), null,
  'missing region must fail closed');
assert.equal(resolveScannerRoiCrop({
  coordinateSpace: 'preview-content-normalized',
  rect: { x: 0, y: 0, width: 1, height: 1 },
}, 1280, 720), null, 'wrong coordinate space must fail closed');
assert.equal(resolveScannerRoiCrop({
  coordinateSpace: 'source-frame-normalized',
  rect: { x: 0.8, y: 0, width: 0.3, height: 1 },
}, 1280, 720), null, 'out-of-bounds region must fail closed');
assert.equal(resolveScannerRoiCrop({
  coordinateSpace: 'source-frame-normalized',
  rect: { x: 0, y: 0, width: 0, height: 1 },
}, 1280, 720), null, 'zero-area region must fail closed');
assert.equal(resolveScannerRoiCrop({
  coordinateSpace: 'source-frame-normalized',
  rect: { x: Number.NaN, y: 0, width: 1, height: 1 },
}, 1280, 720), null, 'non-finite region must fail closed');
assert.equal(resolveScannerRoiCrop({
  coordinateSpace: 'source-frame-normalized',
  rect: { x: 0, y: 0, width: 1, height: 1 },
}, 0, 720), null, 'invalid frame dimensions must fail closed');

// Guard the runtime wiring: decoder receives the live session snapshot each frame.
const adapterSource = await readFile(
  new URL('../src/platform/scanner/decoders/decoderAdapter.ts', import.meta.url),
  'utf8',
);
const decoderSource = await readFile(
  new URL('../src/platform/scanner/decoders/zxingDecoder.ts', import.meta.url),
  'utf8',
);
const sessionSource = await readFile(
  new URL('../src/platform/scanner/universalScannerSession.ts', import.meta.url),
  'utf8',
);
assert.match(adapterSource, /scanRegion:\s*ScannerSourceScanRegion \| null/);
assert.match(sessionSource, /this\.decoder\.decode\(this\.video,\s*\{[\s\S]*?scanRegion:\s*this\.getScanRegion\(\)/);
assert.match(decoderSource, /resolveScannerRoiCrop\(scanRegion, dimensions\.width, dimensions\.height\)/);
assert.match(decoderSource, /if \(!crop\)\s*\{[\s\S]*?return \[\];/);
assert.doesNotMatch(decoderSource, /drawImage\(source,\s*0,\s*0,\s*width,\s*height/);
assert.doesNotMatch(decoderSource, /ROI_WIDTH_RATIO|ROI_HEIGHT_RATIO/,
  'fixed centered ROI constants must be removed');
assert.match(decoderSource, /this\.context\.drawImage\([\s\S]*?crop\.x,[\s\S]*?crop\.y,[\s\S]*?crop\.width,[\s\S]*?crop\.height/);
assert.match(decoderSource, /diagnosticRoiUnavailable/);
assert.match(decoderSource, /Math\.min\(1, MAX_FRAME_WIDTH \/ dimensions\.width\)/,
  'ROI sampling must preserve the existing source-frame width cap before upscaling');

console.log('Scanner strict reticle ROI decoder regression tests passed.');
