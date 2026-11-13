import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function loadTs(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
}

const { measureScannerImageQuality } = await loadTs('../src/platform/scanner/scannerImageEnhancement.ts');
const { measureScannerFocusQuality } = await loadTs('../src/platform/scanner/scannerFocusQuality.ts');
const { createScannerImageQualityProfile } = await loadTs('../src/platform/scanner/scannerImageQualityProfile.ts');

const width = 320, height = 160;
const pixels = new Uint8ClampedArray(width * height).fill(245);
for (let x = 24; x < width - 24; x += 16) {
  for (let y = 12; y < height - 12; y++) {
    pixels.fill(8, y * width + x, y * width + x + 8);
  }
}
const frame = { luminance: pixels, width, height };
const image = measureScannerImageQuality(frame);
const focus = measureScannerFocusQuality(pixels, width, height);
assert.ok(image, 'image quality metrics are available for a valid ROI');
assert.ok(focus.valid, 'focus metrics are available for a structured barcode-like ROI');

const profile = createScannerImageQualityProfile(width, height, 1234, focus, image);
const nextFocus = measureScannerFocusQuality(pixels, width, height, focus.sampledPixels);
assert.equal(nextFocus.motionAvailable, true, 'motion becomes measurable after a same-geometry reference exists');
const nextProfile = createScannerImageQualityProfile(width, height, 1734, nextFocus, image);
assert.equal(nextProfile.focus.motionAvailable, true);
assert.ok(profile, 'valid focus and image metrics produce one profile');
assert.equal(profile.schemaVersion, 1);
assert.equal(profile.timestamp, 1234);
assert.deepEqual(profile.roi, { width, height });
assert.equal(profile.focus.valid, true);
assert.equal(profile.focus.motionAvailable, false,
  'the first sample must not misrepresent an unavailable motion baseline as zero motion');
assert.ok(profile.focus.sharpness > 0);
assert.ok(profile.focus.edgeCoverage > 0);
assert.ok(profile.exposure.meanLuminance >= 0 && profile.exposure.meanLuminance <= 255);
assert.ok(profile.exposure.dynamicRange >= 0 && profile.exposure.dynamicRange <= 255);
assert.ok(profile.contrast.horizontal >= 0 && profile.contrast.vertical >= 0);
assert.ok(profile.noise.horizontal >= 0 && profile.noise.vertical >= 0);
assert.ok(Array.isArray(profile.issues));
assert.ok(!('sampledPixels' in profile.focus), 'profile must not retain the focus monitor pixel buffer');
assert.ok(!('luminance' in profile), 'profile must not retain source image pixels');

assert.equal(createScannerImageQualityProfile(width, height, NaN, focus, image), null,
  'invalid timestamps fail closed');
assert.equal(createScannerImageQualityProfile(width, height, 1234, { ...focus, sharpness: NaN }, image), null,
  'non-finite focus metrics fail closed');

const adapter = await readFile(new URL('../src/platform/scanner/decoders/zxingDecoder.ts', import.meta.url), 'utf8');
const pipeline = await readFile(new URL('../src/platform/scanner/scannerEnhancementPipeline.ts', import.meta.url), 'utf8');
assert.match(adapter, /timestamp - this\.lastFocusQualitySampleAt >= 500/,
  'A1 observation must remain rate limited');
assert.match(adapter, /measureScannerImageQuality\(\{/,
  'A1 must reuse the existing grayscale ROI readback');
assert.match(adapter, /createScannerImageQualityProfile\(/,
  'decoder must assemble the unified quality profile');
assert.match(adapter, /qualityProfile: this\.lastImageQualityProfile/,
  'quality profile must be visible in scanner diagnostics');
assert.match(pipeline, /options\.imageQuality !== undefined/,
  'the enhancement pipeline must reuse a precomputed same-frame quality observation');

console.log('Scanner A1 image-quality profile tests passed.');
