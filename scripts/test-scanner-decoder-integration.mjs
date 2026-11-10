import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = await mkdtemp(path.join(root, '.scanner-decoder-integration-'));
const modulePaths = [
  'src/platform/scanner/contracts.ts',
  'src/platform/scanner/scannerRoi.ts',
  'src/platform/scanner/scannerRotation.ts',
  'src/platform/scanner/scannerDeskew.ts',
  'src/platform/scanner/decoders/decoderAdapter.ts',
  'src/platform/scanner/decoders/rgbaToLuminance.ts',
  'src/platform/scanner/decoders/zxingDecoder.ts',
];

try {
  for (const relativePath of modulePaths) {
    const source = await readFile(path.join(root, relativePath), 'utf8');
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText
      .replace(
        /(from\s+['"])(\.\.?\/[^'"]+)(['"])/g,
        (_match, prefix, specifier, suffix) => prefix + (specifier.endsWith('.js') || specifier.endsWith('.mjs') ? specifier : specifier + '.js') + suffix,
      )
      .replace(
        /import \{([^}]+)\} from ['"]@zxing\/library['"];?/,
        (_match, names) => "import ZXing from '@zxing/library';\nconst { " + names + " } = ZXing;",
      );
    const outputPath = path.join(tempRoot, relativePath.replace(/\.ts$/, '.js'));
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, compiled, 'utf8');
  }

  const canvasStats = { created: 0, draws: 0, lastCrop: null };
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      canvasStats.created += 1;
      const canvas = { width: 0, height: 0 };
      const context = {
        pixels: new Uint8ClampedArray(),
        drawImage(source, sx, sy, sw, sh, _dx, _dy, dw, dh) {
          canvasStats.draws += 1;
          canvasStats.lastCrop = { sx, sy, sw, sh, dw, dh };
          const output = new Uint8ClampedArray(dw * dh * 4);
          for (let y = 0; y < dh; y++) {
            const sourceY = Math.min(source.height - 1, Math.floor(sy + ((y + 0.5) / dh) * sh));
            for (let x = 0; x < dw; x++) {
              const sourceX = Math.min(source.width - 1, Math.floor(sx + ((x + 0.5) / dw) * sw));
              const sourceIndex = (sourceY * source.width + sourceX) * 4;
              const targetIndex = (y * dw + x) * 4;
              output[targetIndex] = source.data[sourceIndex];
              output[targetIndex + 1] = source.data[sourceIndex + 1];
              output[targetIndex + 2] = source.data[sourceIndex + 2];
              output[targetIndex + 3] = 255;
            }
          }
          this.pixels = output;
        },
        getImageData() {
          return { data: this.pixels };
        },
      };
      canvas.getContext = () => context;
      return canvas;
    },
  };

  const { ZXingDecoderAdapter } = await import(pathToFileURL(
    path.join(tempRoot, 'src/platform/scanner/decoders/zxingDecoder.js'),
  ).href);
  const { rotateLuminanceByAngle } = await import(pathToFileURL(
    path.join(tempRoot, 'src/platform/scanner/scannerDeskew.js'),
  ).href);

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
    const width = bits.length * 3, height = 84;
    const luminance = new Uint8ClampedArray(width * height);
    for (let y = 0; y < height; y++) for (let x = 0; x < bits.length; x++) {
      luminance.fill(bits[x] === '1' ? 0 : 255, y * width + x * 3, y * width + (x + 1) * 3);
    }
    return { luminance, width, height };
  }
  function rotateCW(frame) {
    const luminance = new Uint8ClampedArray(frame.luminance.length);
    const width = frame.height, height = frame.width;
    for (let y = 0; y < frame.height; y++) for (let x = 0; x < frame.width; x++) {
      luminance[x * width + (frame.height - 1 - y)] = frame.luminance[y * frame.width + x];
    }
    return { luminance, width, height };
  }
  function toSource(frame) {
    const data = new Uint8ClampedArray(frame.width * frame.height * 4);
    for (let i = 0; i < frame.luminance.length; i++) {
      const offset = i * 4, value = frame.luminance[i];
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
    return { width: frame.width, height: frame.height, data };
  }
  const fullRegion = {
    coordinateSpace: 'source-frame-normalized',
    rect: { x: 0, y: 0, width: 1, height: 1 },
  };
  async function createDecoder() {
    const decoder = new ZXingDecoderAdapter();
    await decoder.initialize({ formats: ['CODE_128'] });
    return decoder;
  }
  async function decodeOnce(decoder, source, scanRegion = fullRegion) {
    return decoder.decode(source, { timestamp: 1234, scanRegion });
  }

  const upright = makeCode128();
  const uprightDecoder = await createDecoder();
  const uprightResult = await decodeOnce(uprightDecoder, toSource(upright));
  assert.equal(uprightResult[0]?.value, '12345',
    'production adapter must decode an upright strict ROI on its first frame');
  await uprightDecoder.dispose();

  for (const [orientation, sourceFrame] of [
    ['90-degree', rotateCW(upright)],
    ['270-degree', rotateCW(rotateCW(rotateCW(upright)))],
  ]) {
    const decoder = await createDecoder();
    const result = await decodeOnce(decoder, toSource(sourceFrame));
    assert.equal(result[0]?.value, '12345',
      `production adapter must recover ${orientation} input on the first scheduled decode frame`);
    await decoder.dispose();
  }

  // Continuous orientation sweep: these are not a finite set of hard-coded
  // transform branches. Every fixture must pass through the live adapter.
  for (const angle of [5, -5, 15, -15, 25, -25, 35, -35, 45, -45, 60, -60, 75, -75]) {
    const angled = rotateLuminanceByAngle(
      upright.luminance, upright.width, upright.height, angle,
    );
    assert.ok(angled, `integration fixture at ${angle} degrees must be generated`);
    const decoder = await createDecoder();
    const result = await decodeOnce(decoder, toSource(angled));
    assert.equal(result[0]?.value, '12345',
      `production adapter must normalize and decode ${angle}-degree barcode orientation`);
    await decoder.dispose();
  }

  // Combined quarter-turn + residual skew must be recovered through the same
  // production adapter, not merely by calling the pure transform helpers.
  const residualSkew = rotateLuminanceByAngle(
    upright.luminance, upright.width, upright.height, 7,
  );
  assert.ok(residualSkew, 'combined orientation fixture must be generated');
  for (const [orientation, sourceFrame] of [
    ['90-degree', rotateCW(residualSkew)],
    ['270-degree', rotateCW(rotateCW(rotateCW(residualSkew)))],
  ]) {
    const decoder = await createDecoder();
    const result = await decodeOnce(decoder, toSource(sourceFrame));
    assert.equal(result[0]?.value, '12345',
      `production adapter must recover combined ${orientation} + residual skew`);
    await decoder.dispose();
  }

  const roiSourceFrame = {
    width: upright.width * 2,
    height: upright.height,
    luminance: new Uint8ClampedArray(upright.width * 2 * upright.height).fill(255),
  };
  for (let y = 0; y < upright.height; y++) {
    roiSourceFrame.luminance.set(
      upright.luminance.subarray(y * upright.width, (y + 1) * upright.width),
      y * roiSourceFrame.width,
    );
  }
  const roiSource = toSource(roiSourceFrame);
  const roiDecoder = await createDecoder();
  const drawsBefore = canvasStats.draws;
  const outsideRegion = {
    coordinateSpace: 'source-frame-normalized',
    rect: { x: 0.5, y: 0, width: 0.5, height: 1 },
  };
  assert.deepEqual(await decodeOnce(roiDecoder, roiSource, outsideRegion), [],
    'barcode outside the module-owned ROI must not decode');
  assert.equal(canvasStats.draws, drawsBefore + 1,
    'strict ROI miss must perform only the requested crop, with no full-frame fallback');
  assert.equal(canvasStats.lastCrop.sx, upright.width,
    'decoder must draw from the module-owned right-half ROI');
  await roiDecoder.dispose();

  const invalidDecoder = await createDecoder();
  const invalidDrawsBefore = canvasStats.draws;
  assert.deepEqual(await decodeOnce(invalidDecoder, toSource(upright), null), [],
    'missing ROI must fail closed');
  assert.equal(canvasStats.draws, invalidDrawsBefore,
    'missing ROI must not draw or decode a full frame');
  await invalidDecoder.dispose();

  console.log('Production ZXing adapter integration passed: upright, 90°/270°, continuous ±5°–±75° orientation sweep, combined quarter-turn/skew, strict ROI crop and fail-closed no-fallback.');
} finally {
  delete globalThis.document;
  await rm(tempRoot, { recursive: true, force: true });
}
