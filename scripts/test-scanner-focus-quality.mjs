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
const { measureScannerFocusQuality, ScannerFocusWatchdog } = await import(url);

const width = 320;
const height = 160;
const sharp = new Uint8ClampedArray(width * height).fill(245);
for (let x = 26; x < width - 24; x += 16) {
  for (let y = 12; y < height - 12; y += 1) {
    sharp.fill(10, y * width + x, y * width + x + 8);
  }
}
function boxBlur(input, radius = 2) {
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
const blurredPixels = boxBlur(sharp);
const blurredSample = measureScannerFocusQuality(blurredPixels, width, height);
const movingBlurSample = measureScannerFocusQuality(blurredPixels, width, height, sharpSample.sampledPixels);
assert.equal(sharpSample.valid, true, 'textured barcode-like ROI produces a valid focus sample');
assert.equal(blurredSample.valid, true, 'blurred but textured ROI remains measurable');
assert.ok(movingBlurSample.motionScore > 14,
  'a changing ROI must be distinguished from stable optical defocus');
assert.ok(sharpSample.sharpness > blurredSample.sharpness * 1.5,
  'Laplacian focus score must distinguish a sharp barcode from a blurred one');
assert.equal(measureScannerFocusQuality(new Uint8ClampedArray(width * height).fill(255), width, height).valid, false,
  'blank low-texture frames must not be treated as defocus');

const watchdog = new ScannerFocusWatchdog();
assert.equal(watchdog.observe(sharpSample, 1000), false,
  'the first sharp sample establishes a reference and never requests recovery');
assert.equal(watchdog.observe(movingBlurSample, 1500), false,
  'motion blur or a changing scene must not trigger autofocus reconfiguration');
assert.equal(watchdog.observe(blurredSample, 2000), false,
  'one stable blurred frame is ignored');
assert.equal(watchdog.observe(sharpSample, 2500), false,
  'a recovered sharp frame clears the consecutive-blur streak');
assert.equal(watchdog.observe(blurredSample, 3000), false);
assert.equal(watchdog.observe(blurredSample, 3500), false);
assert.equal(watchdog.observe(blurredSample, 4000), false);
assert.equal(watchdog.observe(blurredSample, 4500), true,
  'four sustained low-sharpness samples trigger one autofocus re-arm');
assert.equal(watchdog.observe(blurredSample, 5000), false,
  'the watchdog does not repeatedly re-arm during its cooldown');
assert.equal(watchdog.observe(blurredSample, 13500), false);
assert.equal(watchdog.observe(blurredSample, 14000), false);
assert.equal(watchdog.observe(blurredSample, 14500), false);
assert.equal(watchdog.observe(blurredSample, 15000), true,
  'a later sustained defocus can re-arm after the cooldown');

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
assert.match(session, /onFocusQuality: \(sample\) => this\.handleFocusQuality/,
  'the shared session consumes decoder quality telemetry');
assert.match(session, /reapplyContinuousAutofocus\(\)/,
  'the shared session can re-arm continuous focus after sustained blur');

console.log('Scanner focus quality and bounded autofocus recovery tests passed.');
