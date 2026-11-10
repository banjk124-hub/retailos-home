import assert from 'node:assert/strict';
import ZXing from '@zxing/library';

const {
  BarcodeFormat, BinaryBitmap, DecodeHintType, HybridBinarizer,
  MultiFormatReader, RGBLuminanceSource, ResultMetadataType,
} = ZXing;

const L = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011',
];
const G = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111',
];
const FIRST_DIGIT_PARITY = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
  'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL',
];

function checksum(data) {
  let sum = 0;
  for (let i = data.length - 1, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3) {
    sum += Number(data[i]) * weight;
  }
  return String((10 - (sum % 10)) % 10);
}
function invertPattern(pattern) {
  return pattern.replace(/[01]/g, bit => bit === '0' ? '1' : '0');
}
function encodeEan13(data) {
  assert.match(data, /^\d{12}$/);
  const digits = data + checksum(data);
  const parity = FIRST_DIGIT_PARITY[Number(digits[0])];
  let bits = '101';
  for (let i = 1; i <= 6; i++) {
    const digit = Number(digits[i]);
    bits += parity[i - 1] === 'L' ? L[digit] : G[digit];
  }
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += invertPattern(L[Number(digits[i])]);
  return { value: digits, bits: '0'.repeat(10) + bits + '0'.repeat(10), format: BarcodeFormat.EAN_13 };
}
function encodeEan8(data) {
  assert.match(data, /^\d{7}$/);
  const digits = data + checksum(data);
  let bits = '101';
  for (let i = 0; i < 4; i++) bits += L[Number(digits[i])];
  bits += '01010';
  for (let i = 4; i < 8; i++) bits += invertPattern(L[Number(digits[i])]);
  return { value: digits, bits: '0'.repeat(10) + bits + '0'.repeat(10), format: BarcodeFormat.EAN_8 };
}

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
function code128Bits(codes) {
  let bits = '';
  for (const code of codes) {
    const pattern = CODE128_PATTERNS.get(code);
    assert.ok(pattern, `missing Code 128 fixture pattern for code ${code}`);
    let black = true;
    for (const run of pattern) {
      bits += (black ? '1' : '0').repeat(run);
      black = !black;
    }
  }
  return bits;
}
function encodeCode128B() {
  const dataCodes = [17, 18, 19, 20, 21]; // Code Set B: ASCII "12345"
  const checksumCode = (104 + dataCodes.reduce((sum, code, index) => sum + code * (index + 1), 0)) % 103;
  const bits = code128Bits([104, ...dataCodes, checksumCode, 106]);
  return {
    value: '12345',
    bits: '0'.repeat(10) + bits + '0'.repeat(10),
    format: BarcodeFormat.CODE_128,
  };
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
function decode(frame, format) {
  const reader = new MultiFormatReader();
  reader.setHints(new Map([
    [DecodeHintType.POSSIBLE_FORMATS, [format]],
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

for (const fixture of [encodeCode128B(), encodeEan13('400638133393'), encodeEan8('9638507')]) {
  console.log('Checking rotation baseline format:', fixture.format);
  const uprightResult = decode(rasterize(fixture.bits), fixture.format);
  assert.equal(uprightResult.getText(), fixture.value, '0-degree barcode must decode');
  const invertedResult = decode(rotate180(rasterize(fixture.bits)), fixture.format);
  assert.equal(invertedResult.getText(), fixture.value, '180-degree barcode must decode');
  assert.equal(
    invertedResult.getResultMetadata()?.get(ResultMetadataType.ORIENTATION),
    180,
    'ZXing must report the upside-down 180-degree orientation',
  );
}
console.log('Scanner rotation baseline passed: EAN-13, EAN-8 and CODE-128 at 0° and 180°.');
