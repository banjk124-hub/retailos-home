import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import ZXing from '@zxing/library';

const {
  BarcodeFormat, BinaryBitmap, DecodeHintType, HybridBinarizer,
  MultiFormatReader, RGBLuminanceSource,
} = ZXing;

async function loadTsModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const url = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64');
  return import(url);
}
const {
  estimateScannerSkewAngle,
  rotateLuminanceByAngle,
  deskewLuminanceFrame,
} = await loadTsModule('../src/platform/scanner/scannerDeskew.ts');
const { rotateLuminance90Clockwise } = await loadTsModule('../src/platform/scanner/scannerRotation.ts');

const CODE128_PATTERNS = new Map([
  [104, [2, 1, 1, 2, 1, 4]],
  [17, [1, 2, 3, 2, 2, 1]],
  [18, [2, 2, 3, 2, 1, 1]],
  [19, [2, 2, 1, 1, 3, 2]],
  [20, [2, 2, 1, 2, 3, 1]],
  [21, [2, 1, 3, 2, 1, 2]],
  [90, [2, 1, 4, 1, 2, 1]],
  [106, [2, 3, 3, 1, 1, 1, 2]],
]);
function makeCode128() {
  const dataCodes = [17, 18, 19, 20, 21];
  const checksum = (104 + dataCodes.reduce(
    (sum, code, index) => sum + code * (index + 1), 0,
  )) % 103;
  let bits = '';
  for (const code of [104, ...dataCodes, checksum, 106]) {
    let black = true;
    for (const run of CODE128_PATTERNS.get(code)) {
      bits += (black ? '1' : '0').repeat(run);
      black = !black;
    }
  }
  bits = '0'.repeat(10) + bits + '0'.repeat(10);
  const width = bits.length * 3;
  const height = 84;
  const luminance = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < bits.length; x++) {
      luminance.fill(bits[x] === '1' ? 0 : 255, y * width + x * 3, y * width + (x + 1) * 3);
    }
  }
  return { luminance, width, height };
}
function rotateCW(frame) {
  return rotateLuminance90Clockwise(frame.luminance, frame.width, frame.height);
}
function decode(frame) {
  const reader = new MultiFormatReader();
  reader.setHints(new Map([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]],
    [DecodeHintType.TRY_HARDER, true],
    [DecodeHintType.CHARACTER_SET, 'UTF-8'],
  ]));
  try {
    return reader.decodeWithState(new BinaryBitmap(
      new HybridBinarizer(new RGBLuminanceSource(frame.luminance, frame.width, frame.height)),
    ));
  } finally {
    reader.reset();
  }
}

const original = makeCode128();
const lowContrastLuminance = Uint8ClampedArray.from(
  original.luminance,
  (value) => value < 128 ? 108 : 148,
);
const lowContrastSkew = rotateLuminanceByAngle(
  lowContrastLuminance, original.width, original.height, 27,
);
assert.ok(lowContrastSkew, 'low-contrast orientation fixture must be generated');
const lowContrastEstimate = estimateScannerSkewAngle(
  lowContrastSkew.luminance, lowContrastSkew.width, lowContrastSkew.height,
);
assert.ok(lowContrastEstimate, 'continuous estimator must retain a low-contrast barcode direction');
const lowContrastCorrected = deskewLuminanceFrame(
  lowContrastSkew.luminance, lowContrastSkew.width, lowContrastSkew.height,
);
assert.ok(lowContrastCorrected, 'low-contrast barcode must receive a safe orientation correction');
assert.equal(decode(lowContrastCorrected).getText(), '12345',
  'low-contrast barcode must decode after continuous orientation correction');
assert.equal(estimateScannerSkewAngle(original.luminance, original.width, original.height), null,
  'a level barcode must not trigger deskew');
assert.equal(estimateScannerSkewAngle(original.luminance, 0, original.height), null,
  'invalid dimensions must fail closed');
assert.equal(estimateScannerSkewAngle(new Uint8ClampedArray(100 * 100).fill(255), 100, 100), null,
  'a blank ROI must not produce a skew estimate');
const ambiguousTexture = new Uint8ClampedArray(160 * 120);
let noiseSeed = 0x12345678;
for (let index = 0; index < ambiguousTexture.length; index += 1) {
  noiseSeed = (1664525 * noiseSeed + 1013904223) >>> 0;
  ambiguousTexture[index] = noiseSeed >>> 24;
}
assert.equal(estimateScannerSkewAngle(ambiguousTexture, 160, 120), null,
  'directionally ambiguous texture must fail the orientation confidence gates');
assert.equal(rotateLuminanceByAngle(original.luminance, original.width, original.height, 91), null,
  'angles beyond the half-turn normalization range must fail closed');

for (const angle of [5, -5, 8, -8, 15, -15, 25, -25, 35, -35, 45, -45, 60, -60, 75, -75]) {
  const skewed = rotateLuminanceByAngle(
    original.luminance, original.width, original.height, angle,
  );
  assert.ok(skewed, 'test skew transform must produce a frame');
  const estimate = estimateScannerSkewAngle(skewed.luminance, skewed.width, skewed.height);
  assert.ok(estimate, `skew of ${angle} degrees must be detected`);
  assert.ok(Math.abs(estimate.angleDegrees - angle) <= 2,
    `estimated skew must be close to ${angle} degrees; received ${estimate.angleDegrees}`);

  const corrected = deskewLuminanceFrame(skewed.luminance, skewed.width, skewed.height);
  assert.ok(corrected, 'bounded deskew must produce a corrected ROI');
  assert.ok(Math.abs(corrected.angleDegrees - angle) <= 2,
    'deskew metadata must retain the measured source skew');
  assert.equal(decode(corrected).getText(), '12345',
    `Code 128 must decode after correcting ${angle}-degree skew`);

  // A 90°/270° source orientation is normalized first by SCAN-05, then
  // deskewed in the normalized ROI coordinate space.
  const source90 = rotateCW(skewed);
  const normalized90 = rotateCW(source90);
  const corrected90 = deskewLuminanceFrame(
    normalized90.luminance, normalized90.width, normalized90.height,
  );
  assert.ok(corrected90, '90-degree normalized skew must remain correctable');
  assert.equal(decode(corrected90).getText(), '12345',
    '90-degree barcode with in-plane skew must decode after rotation and deskew');

  let source270 = skewed;
  for (let i = 0; i < 3; i++) source270 = rotateCW(source270);
  const normalized270 = rotateCW(source270);
  const corrected270 = deskewLuminanceFrame(
    normalized270.luminance, normalized270.width, normalized270.height,
  );
  assert.ok(corrected270, '270-degree normalized skew must remain correctable');
  assert.equal(decode(corrected270).getText(), '12345',
    '270-degree barcode with in-plane skew must decode after rotation and deskew');
}

const sideways = rotateLuminanceByAngle(
  original.luminance, original.width, original.height, 90,
);
assert.ok(sideways, 'a quarter-turn must remain inside the continuous orientation range');
const sidewaysEstimate = estimateScannerSkewAngle(
  sideways.luminance, sideways.width, sideways.height,
);
assert.ok(sidewaysEstimate, '90-degree barcode orientation must be estimated');
assert.ok(Math.abs(Math.abs(sidewaysEstimate.angleDegrees) - 90) < 1,
  'sideways orientation must resolve at the half-turn boundary');

const deskewSource = await readFile(
  new URL('../src/platform/scanner/scannerDeskew.ts', import.meta.url),
  'utf8',
);
assert.doesNotMatch(deskewSource, /\b(?:window|document)\s*(?:\.|\?\.)|HTMLCanvasElement/,
  'deskew processing must remain pure and independent of browser presentation');
assert.match(deskewSource, /MAX_SKEW_DEGREES = 90/,
  'continuous orientation correction must be bounded to the signed half-turn range');

const decoderSource = await readFile(
  new URL('../src/platform/scanner/decoders/zxingDecoder.ts', import.meta.url),
  'utf8',
);
assert.match(decoderSource, /deskewLuminanceFrame\(/, 'decoder must consume the deskew service');
assert.match(decoderSource, /const candidates = \[uprightDeskew, rotatedDeskew\]/,
  'production decoder must consider both source axes for continuous orientation recovery');
assert.match(decoderSource, /deskewAttempts:/, 'deskew attempt diagnostics must be exposed');
assert.match(decoderSource, /deskewEstimateMisses:/, 'failed orientation estimates must be observable separately');
assert.match(decoderSource, /deskewHits:/, 'deskew hit diagnostics must be exposed');
assert.match(decoderSource, /true,\s*'deskew'/,
  'deskew candidates must use both production binarizers');
assert.match(decoderSource, /lastDeskewAngleDegrees:/, 'measured skew angle must be observable');


const scan05Doc = await readFile(
  new URL('../docs/ai-context/SCAN_05_ORTHOGONAL_ROTATION.md', import.meta.url),
  'utf8',
);
const scan06Doc = await readFile(
  new URL('../docs/ai-context/SCAN_06_BOUNDED_DESKEW.md', import.meta.url),
  'utf8',
);
assert.match(scan05Doc, /quarter-turn/);
assert.match(scan05Doc, /180°/);
assert.match(scan06Doc, /180-bin Sobel gradient-orientation histogram/);
assert.match(scan06Doc, /0\.65°/);
assert.match(scan06Doc, /90°/);
assert.match(scan06Doc, /perspective/);

console.log('Scanner continuous orientation tests passed: angle sweep through ±75°, 90°/270° normalization path, and fail-closed bounds.');
