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
assert.equal(estimateScannerSkewAngle(original.luminance, original.width, original.height), null,
  'a level barcode must not trigger deskew');
assert.equal(estimateScannerSkewAngle(original.luminance, 0, original.height), null,
  'invalid dimensions must fail closed');
assert.equal(estimateScannerSkewAngle(new Uint8ClampedArray(100 * 100).fill(255), 100, 100), null,
  'a blank ROI must not produce a skew estimate');
assert.equal(rotateLuminanceByAngle(original.luminance, original.width, original.height, 13), null,
  'angles beyond the bounded correction range must fail closed');

for (const angle of [5, -5, 8, -8]) {
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

const nineDegrees = rotateLuminanceByAngle(
  original.luminance, original.width, original.height, 9,
);
const eighteenDegrees = rotateLuminanceByAngle(
  nineDegrees.luminance, nineDegrees.width, nineDegrees.height, 9,
);
assert.equal(estimateScannerSkewAngle(
  eighteenDegrees.luminance, eighteenDegrees.width, eighteenDegrees.height,
), null, 'skew beyond the 12-degree correction window must be rejected');

const deskewSource = await readFile(
  new URL('../src/platform/scanner/scannerDeskew.ts', import.meta.url),
  'utf8',
);
assert.doesNotMatch(deskewSource, /\b(?:window|document)\s*(?:\.|\?\.)|HTMLCanvasElement/,
  'deskew processing must remain pure and independent of browser presentation');
assert.match(deskewSource, /MAX_SKEW_DEGREES = 12/,
  'deskew angle must remain explicitly bounded');

const decoderSource = await readFile(
  new URL('../src/platform/scanner/decoders/zxingDecoder.ts', import.meta.url),
  'utf8',
);
assert.match(decoderSource, /deskewLuminanceFrame\(/, 'decoder must consume the deskew service');
assert.match(decoderSource, /uprightDeskew \?\? \(rotated/, 
  'deskew must select the upright or normalized orthogonal ROI, not the full frame');
assert.match(decoderSource, /deskewAttempts:/, 'deskew attempt diagnostics must be exposed');
assert.match(decoderSource, /deskewHits:/, 'deskew hit diagnostics must be exposed');
assert.match(decoderSource, /false,\s*'deskew'/,
  'deskew decode must use the bounded HybridBinarizer-only pass');
assert.match(decoderSource, /lastDeskewAngleDegrees:/, 'measured skew angle must be observable');

console.log('Scanner bounded deskew tests passed: ±5°/±8°, 90°/270° normalization path, and fail-closed bounds.');
