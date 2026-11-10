import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import ZXing from '@zxing/library';

const {
  BarcodeFormat, BinaryBitmap, DecodeHintType, HybridBinarizer,
  MultiFormatReader, RGBLuminanceSource, ResultMetadataType,
} = ZXing;

const rotationSource = await readFile(
  new URL('../src/platform/scanner/scannerRotation.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(rotationSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64');
const { rotateLuminance90Clockwise, shouldAttemptExtendedDecode } = await import(moduleUrl);

assert.deepEqual(
  Array.from({ length: 9 }, (_, index) => shouldAttemptExtendedDecode(index + 1)),
  [false, false, true, false, false, true, false, false, true],
  'extended decode must run on every third valid ROI sequence number',
);
for (const invalid of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
  assert.equal(shouldAttemptExtendedDecode(invalid), false,
    'invalid sequence values must not schedule extended decode');
}

const matrix = new Uint8ClampedArray([1, 2, 3, 4, 5, 6]);
const rotatedMatrix = rotateLuminance90Clockwise(matrix, 3, 2);
assert.deepEqual(
  { width: rotatedMatrix.width, height: rotatedMatrix.height, values: [...rotatedMatrix.luminance] },
  { width: 2, height: 3, values: [4, 1, 5, 2, 6, 3] },
  '90-degree clockwise rotation must transpose dimensions and preserve pixel positions',
);
assert.equal(rotateLuminance90Clockwise(matrix, 0, 2), null, 'zero width must fail closed');
assert.equal(rotateLuminance90Clockwise(matrix, 3, 0), null, 'zero height must fail closed');
assert.equal(rotateLuminance90Clockwise(matrix, 2, 2), null, 'mismatched buffer length must fail closed');
assert.equal(rotateLuminance90Clockwise(null, 3, 2), null, 'missing luminance must fail closed');

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
function rotateClockwise(frame) {
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
const clockwise90 = rotateClockwise(original);
let counterClockwise90 = original;
for (let i = 0; i < 3; i++) counterClockwise90 = rotateClockwise(counterClockwise90);

const normalizedClockwise = rotateClockwise(clockwise90);
const normalizedCounterClockwise = rotateClockwise(counterClockwise90);
const clockwiseResult = decode(normalizedClockwise);
const counterClockwiseResult = decode(normalizedCounterClockwise);
assert.equal(clockwiseResult.getText(), '12345', '90-degree clockwise input must decode after one clockwise ROI rotation');
assert.equal(counterClockwiseResult.getText(), '12345', '90-degree counterclockwise input must decode after one clockwise ROI rotation');
assert.equal(
  clockwiseResult.getResultMetadata()?.get(ResultMetadataType.ORIENTATION),
  180,
  '90-degree clockwise input normalizes to 180 degrees and uses the existing OneDReader reversal',
);

const decoderSource = await readFile(
  new URL('../src/platform/scanner/decoders/zxingDecoder.ts', import.meta.url),
  'utf8',
);
assert.match(decoderSource, /rotateLuminance90Clockwise\(/, 'decoder must consume the pure rotation helper');
assert.match(decoderSource, /this\.frameSequence\s*\+=\s*1/,
  'valid ROI frames must advance a dedicated processing sequence');
assert.match(decoderSource, /shouldAttemptExtendedDecode\(this\.frameSequence\)/,
  'extended decode scheduling must use the dedicated frame sequence');
assert.doesNotMatch(decoderSource, /diagnosticFrames\s*%\s*3/,
  'diagnostics counters must not control decode cadence');
assert.match(decoderSource, /if \(uprightOutput \|\| !tryRotated\) return uprightOutput/,
  'upright decode must be attempted first and rotation must be skipped on success');
assert.match(decoderSource, /rotationAttempts:/, 'rotation attempt diagnostics must be exposed');
assert.match(decoderSource, /rotationHits:/, 'rotation hit diagnostics must be exposed');

console.log('Scanner orthogonal rotation tests passed: pixel mapping and Code 128 at 90°/270°.');
