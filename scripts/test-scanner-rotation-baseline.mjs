import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ZXing from '@zxing/library';

const {
  BarcodeFormat, BinaryBitmap, DecodeHintType, HybridBinarizer,
  MultiFormatReader, RGBLuminanceSource, ResultMetadataType,
} = ZXing;

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

function encodeCode128B() {
  const dataCodes = [17, 18, 19, 20, 21]; // Code Set B: ASCII "12345"
  const checksumCode = (104 + dataCodes.reduce(
    (sum, code, index) => sum + code * (index + 1), 0,
  )) % 103;
  let bits = '';
  for (const code of [104, ...dataCodes, checksumCode, 106]) {
    const pattern = CODE128_PATTERNS.get(code);
    assert.ok(pattern, `missing Code 128 fixture pattern for code ${code}`);
    let black = true;
    for (const run of pattern) {
      bits += (black ? '1' : '0').repeat(run);
      black = !black;
    }
  }
  return { value: '12345', bits: '0'.repeat(10) + bits + '0'.repeat(10) };
}

function rasterize(bits, scale = 3, height = 84) {
  const width = bits.length * scale;
  const pixels = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    for (let module = 0; module < bits.length; module++) {
      const luminance = bits[module] === '1' ? 0 : 255;
      pixels.fill(luminance, y * width + module * scale, y * width + (module + 1) * scale);
    }
  }
  return { pixels, width, height };
}

function rotate180(frame) {
  const pixels = new Uint8ClampedArray(frame.pixels.length);
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      pixels[(frame.height - 1 - y) * frame.width + (frame.width - 1 - x)] =
        frame.pixels[y * frame.width + x];
    }
  }
  return { ...frame, pixels };
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
      new HybridBinarizer(new RGBLuminanceSource(frame.pixels, frame.width, frame.height)),
    ));
  } finally {
    reader.reset();
  }
}

const fixture = encodeCode128B();
const upright = decode(rasterize(fixture.bits));
assert.equal(upright.getText(), fixture.value, '0-degree barcode must decode');

const inverted = decode(rotate180(rasterize(fixture.bits)));
assert.equal(inverted.getText(), fixture.value, '180-degree barcode must decode');
assert.equal(
  inverted.getResultMetadata()?.get(ResultMetadataType.ORIENTATION),
  180,
  'ZXing must report the upside-down 180-degree orientation',
);

// EAN-8 and EAN-13 use the same OneDReader orientation implementation.
// Guard the dependency inheritance chain so a future ZXing upgrade cannot silently
// move either EAN reader off the upside-down scanline path.
const packageRoot = path.dirname(fileURLToPath(import.meta.resolve('@zxing/library')));
const cjsRoot = path.join(packageRoot, 'core', 'oned');
const readReader = (name) => readFile(path.join(cjsRoot, name), 'utf8');
const [ean8, ean13, upcean, abstractUpcean] = await Promise.all([
  readReader('EAN8Reader.js'),
  readReader('EAN13Reader.js'),
  readReader('UPCEANReader.js'),
  readReader('AbstractUPCEANReader.js'),
]);
assert.match(ean8, /UPCEANReader/, 'EAN-8 must inherit the UPC/EAN reader');
assert.match(ean13, /UPCEANReader/, 'EAN-13 must inherit the UPC/EAN reader');
assert.match(upcean, /AbstractUPCEANReader/, 'UPC/EAN readers must inherit the shared UPC/EAN base');
assert.match(abstractUpcean, /OneDReader/, 'EAN readers must retain the shared OneDReader orientation path');

const decoderSource = await readFile(
  new URL('../src/platform/scanner/decoders/zxingDecoder.ts', import.meta.url),
  'utf8',
);
assert.match(decoderSource, /hints\.set\(DecodeHintType\.TRY_HARDER,\s*true\)/,
  'production decoder must continue enabling TRY_HARDER');
assert.match(decoderSource, /new RGBLuminanceSource\(/,
  'production decoder must retain the same ZXing luminance source type');
assert.match(decoderSource, /decodeWithState\(bitmap\)/,
  'production decoder must retain the same stateful ZXing decode path');

console.log('Scanner rotation baseline passed: CODE-128 decodes at 0° and 180°; EAN-8/EAN-13 retain the shared OneDReader path.');
