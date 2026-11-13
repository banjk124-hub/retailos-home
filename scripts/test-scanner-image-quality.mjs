import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(
  new URL('../src/platform/scanner/scannerImageEnhancement.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const url = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64');
const { measureScannerImageQuality, createScannerImageEnhancements } = await import(url);

const width = 128;
const height = 96;
const makeFrame = (pixel) => ({
  luminance: new Uint8ClampedArray(width * height).fill(pixel),
  width,
  height,
});

const dark = measureScannerImageQuality(makeFrame(8));
assert.ok(dark);
assert.ok(dark.issues.includes('underexposed'),
  'a uniformly dark ROI must be identified as underexposed');
assert.ok(dark.issues.includes('shadow_clipping'),
  'a dark-clipped ROI must be flagged separately from low dynamic range');

const bright = measureScannerImageQuality(makeFrame(250));
assert.ok(bright);
assert.ok(bright.issues.includes('overexposed'),
  'a uniformly bright ROI must be identified as overexposed');
assert.ok(bright.issues.includes('highlight_clipping'),
  'a highlight-clipped ROI must be flagged separately from low dynamic range');

const lowContrastPixels = new Uint8ClampedArray(width * height);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    lowContrastPixels[y * width + x] = x % 2 === 0 ? 124 : 126;
  }
}
const lowContrast = measureScannerImageQuality({ luminance: lowContrastPixels, width, height });
assert.ok(lowContrast);
assert.ok(lowContrast.issues.includes('low_dynamic_range'),
  'a compressed luminance distribution must be identified');
assert.ok(lowContrast.issues.includes('low_contrast'),
  'weak edges on both axes must be identified as low contrast');

function makeBars(orientation) {
  const pixels = new Uint8ClampedArray(width * height).fill(245);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const stripe = orientation === 'vertical' ? x : y;
      if (Math.floor(stripe / 4) % 2 === 0) pixels[y * width + x] = 10;
    }
  }
  return { luminance: pixels, width, height };
}
const verticalBars = measureScannerImageQuality(makeBars('vertical'));
const horizontalBars = measureScannerImageQuality(makeBars('horizontal'));
assert.ok(verticalBars && horizontalBars);
assert.ok(verticalBars.contrast > verticalBars.verticalContrast,
  'the legacy horizontal contrast metric must retain its established direction-sensitive meaning');
assert.ok(horizontalBars.verticalContrast > horizontalBars.contrast,
  'the added vertical contrast metric must observe a quarter-turned barcode');
assert.ok(!verticalBars.issues.includes('low_contrast')
  && !horizontalBars.issues.includes('low_contrast'),
  'quality assessment must not misclassify a clean barcode solely because it is rotated 90 degrees');
assert.ok(Math.abs(verticalBars.edgeStrength - horizontalBars.edgeStrength) < 1,
  'gradient magnitude assessment must remain approximately orientation invariant');

const noisyPixels = new Uint8ClampedArray(width * height);
let seed = 0x1badb002;
for (let index = 0; index < noisyPixels.length; index++) {
  seed = (1664525 * seed + 1013904223) >>> 0;
  noisyPixels[index] = (seed & 1) === 0 ? 0 : 255;
}
const noisy = measureScannerImageQuality({ luminance: noisyPixels, width, height });
assert.ok(noisy);
assert.ok(noisy.issues.includes('high_noise'),
  'high-frequency random texture must be identified as noise');

const cleanFrame = makeBars('vertical');
const cleanCopy = new Uint8ClampedArray(cleanFrame.luminance);
const clean = measureScannerImageQuality(cleanFrame);
assert.ok(clean);
assert.ok(!clean.issues.includes('high_noise'),
  'clean barcode edges must not be classified as impulse noise');
assert.deepEqual(cleanFrame.luminance, cleanCopy,
  'quality analysis must never mutate the source ROI');

// A broad, internally located saturated patch crossing barcode bars is a
// specular-glare signal; clipped data must not be amplified into false edges.
const glarePixels = new Uint8ClampedArray(width * height).fill(245);
for (let y = 8; y < height - 8; y++) {
  for (let x = 12; x < width - 12; x++) {
    if (Math.floor((x - 12) / 5) % 2 === 0) glarePixels[y * width + x] = 12;
  }
}
for (let y = 20; y < 76; y++) glarePixels.fill(255, y * width + 54, y * width + 76);
const glareFrame = { luminance: glarePixels, width, height };
const glareQuality = measureScannerImageQuality(glareFrame);
assert.ok(glareQuality);
assert.ok(glareQuality.issues.includes('specular_glare'),
  'persistent internal saturated bands must be flagged as specular glare');
assert.deepEqual(createScannerImageEnhancements(glareFrame, glareQuality), [],
  'contrast/gamma/denoise must not manufacture edges across clipped glare');

const verticalGlarePixels = new Uint8ClampedArray(width * height).fill(245);
for (let y = 8; y < height - 8; y++) {
  for (let x = 12; x < width - 12; x++) {
    if (Math.floor((x - 12) / 5) % 2 === 0) verticalGlarePixels[y * width + x] = 12;
  }
}
for (let x = 60; x < 69; x++) {
  for (let y = 8; y < height - 8; y++) verticalGlarePixels[y * width + x] = 255;
}
const verticalGlareQuality = measureScannerImageQuality({
  luminance: verticalGlarePixels, width, height,
});
assert.ok(verticalGlareQuality);
assert.ok(verticalGlareQuality.issues.includes('specular_glare'),
  'a vertical saturated reflection streak must also be detected');
assert.equal(verticalGlareQuality.glareBandOrientation, 'vertical',
  'diagnostics must distinguish a vertical glare band from a horizontal one');

assert.equal(measureScannerImageQuality({
  luminance: new Uint8ClampedArray(width * height),
  width: width + 1,
  height,
}), null, 'mismatched frame dimensions must fail closed');
assert.equal(measureScannerImageQuality({
  luminance: new Uint8ClampedArray(width * height),
  width: 16.5,
  height,
}), null, 'non-integer frame dimensions must fail closed');
assert.equal(measureScannerImageQuality({
  luminance: new Uint8Array(width * height),
  width,
  height,
}), null, 'unsupported pixel buffer types must fail closed');

console.log('Scanner image-quality analysis tests passed: exposure, clipping, dynamic range, contrast, orientation invariance, noise and input integrity.');
