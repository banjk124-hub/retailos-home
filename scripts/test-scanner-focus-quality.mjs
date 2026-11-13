import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(
  new URL('../src/platform/scanner/scannerFocusQuality.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const url = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64');
const { measureScannerFocusQuality, ScannerFocusQualityMonitor } = await import(url);

const width = 320;
const height = 160;
const sharp = new Uint8ClampedArray(width * height).fill(245);
for (let x = 26; x < width - 24; x += 16) {
  for (let y = 12; y < height - 12; y += 1) {
    sharp.fill(10, y * width + x, y * width + x + 8);
  }
}
function boxBlur(input, radius = 6) {
  const output = new Uint8ClampedArray(input.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let total = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const sx = x + dx, sy = y + dy;
          if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;
          total += input[sy * width + sx];
          count += 1;
        }
      }
      output[y * width + x] = Math.round(total / count);
    }
  }
  return output;
}

const sharpSample = measureScannerFocusQuality(sharp, width, height);
const sharpStableSample = measureScannerFocusQuality(sharp, width, height, sharpSample.sampledPixels);
const blurredPixels = boxBlur(sharp);
const blurredSample = measureScannerFocusQuality(blurredPixels, width, height, blurredPixels);
const movingBlurSample = measureScannerFocusQuality(blurredPixels, width, height, sharpSample.sampledPixels);
assert.equal(sharpSample.valid, true, 'textured barcode-like ROI produces a valid focus sample');
assert.equal(blurredSample.valid, true, 'severely blurred but contrast-bearing ROI remains measurable');
assert.equal(blurredSample.edgeCoverage, 0,
  'the severe blur fixture removes high-frequency edges while retaining luminance structure');
assert.ok(movingBlurSample.motionScore > 14,
  'a changing ROI must be distinguished from stable optical defocus');
assert.ok(sharpSample.sharpness > blurredSample.sharpness * 1.5,
  'Laplacian focus score must distinguish a sharp barcode from a blurred one');
assert.equal(measureScannerFocusQuality(new Uint8ClampedArray(width * height).fill(255), width, height).valid, false,
  'blank low-texture frames must not be treated as defocus');

const monitor = new ScannerFocusQualityMonitor();
assert.equal(sharpSample.motionAvailable, false);
assert.equal(sharpStableSample.motionAvailable, true);
assert.equal(monitor.observe(sharpSample, 1000), false,
  'a first sample without a motion reference must not establish a stable-scene baseline');
assert.equal(monitor.observe(sharpStableSample, 1500), false,
  'the first same-ROI motion-valid sharp sample establishes a reference');
assert.equal(monitor.observe(movingBlurSample, 2000), false,
  'motion blur or a changing scene must not trigger autofocus reconfiguration');
assert.equal(monitor.observe(blurredSample, 2500), false,
  'one stable blurred frame is ignored');
assert.equal(monitor.observe(sharpStableSample, 3000), false,
  'a recovered sharp frame clears the consecutive-blur streak');
assert.equal(monitor.observe(blurredSample, 3500), false);
assert.equal(monitor.observe(blurredSample, 4000), false);
assert.equal(monitor.observe(blurredSample, 4500), false);
assert.equal(monitor.observe(blurredSample, 5000), true,
  'four sustained low-sharpness samples are reported as a passive blur event');
assert.equal(monitor.observe(blurredSample, 5500), false,
  'the monitor rate-limits repeated blur diagnostics');
assert.equal(monitor.observe(blurredSample, 13500), false);
assert.equal(monitor.observe(blurredSample, 14000), false);
assert.equal(monitor.observe(blurredSample, 14500), true,
  'a later sustained blur can be reported again after the diagnostic cooldown');

const adapter = await readFile(
  new URL('../src/platform/scanner/decoders/zxingDecoder.ts', import.meta.url),
  'utf8',
);
const session = await readFile(
  new URL('../src/platform/scanner/universalScannerSession.ts', import.meta.url),
  'utf8',
);
assert.match(adapter, /measureScannerFocusQuality/,
  'the decoder measures sharpness from its existing grayscale ROI readback');
assert.match(adapter, /candidate\.baseline \? onFocusQuality : undefined/,
  'focus quality is sampled only from the baseline scale, not every fallback');
assert.doesNotMatch(session, /prepareForScanning|reapplyContinuousAutofocus/,
  'the session must never issue focus commands after preview readiness');
assert.match(session, /sample\.motionAvailable && this\.focusQualityMonitor\.observe\(sample, timestamp\)/,
  'the shared session observes focus quality passively');
assert.match(session, /cameraControlChanged: false/,
  'sustained blur diagnostics explicitly confirm that camera controls were not changed');
assert.doesNotMatch(session, /focusRecoveryRequests|focusRecoveryPending|focusControlEnabled/,
  'the old automatic focus-recovery state is removed');

console.log('Scanner passive focus-quality monitoring tests passed.');
