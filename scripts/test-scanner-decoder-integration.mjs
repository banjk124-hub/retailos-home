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
  'src/platform/scanner/scannerScale.ts',
  'src/platform/scanner/scannerEnhancementPipeline.ts',
  'src/platform/scanner/scannerAdaptiveProcessingController.ts',
  'src/platform/scanner/scannerImageEnhancement.ts',
  'src/platform/scanner/scannerGeometryCorrection.ts',
  'src/platform/scanner/scannerFocusQuality.ts',
  'src/platform/scanner/scannerImageQualityProfile.ts',
  'src/platform/scanner/scannerTemporalRecognition.ts',
  'src/platform/scanner/decoders/decoderAdapter.ts',
  'src/platform/scanner/decoders/decoderFactory.ts',
  'src/platform/scanner/decoders/rgbaToLuminance.ts',
  'src/platform/scanner/decoders/zxingDecoder.ts',
];

try {
  for (const relativePath of modulePaths) {
    let source = await readFile(path.join(root, relativePath), 'utf8');
    if (relativePath === 'src/platform/scanner/decoders/decoderFactory.ts') {
      assert.match(source, /import\('\.\/zxingWasmDecoder'\)/,
        'production selection must point to the WASM engine');
      // This fixture suite remains the legacy JS comparison baseline while
      // the production factory is cut over to WASM. The adapter is retained
      // temporarily for rollback and parity comparison, not runtime selection.
      source = `export const defaultScannerDecoderFactory = {
        async create() {
          const { ZXingDecoderAdapter } = await import('./zxingDecoder');
          return new ZXingDecoderAdapter();
        },
      };`;
    }
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText
      .replace(
        /(from\s+['"])(\.\.?\/[^'"]+)(['"])/g,
        (_match, prefix, specifier, suffix) => prefix + (specifier.endsWith('.js') || specifier.endsWith('.mjs') ? specifier : specifier + '.js') + suffix,
      )
      // Node ESM requires explicit extensions for relative dynamic imports too.
      // The source TS import stays bundler-friendly; normalize only the isolated
      // transpiled test graph to match its emitted .js filenames.
      .replace(
        /(import\(\s*['"])(\.\.?\/[^'"]+)(['"]\s*\))/g,
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

  const canvasStats = { created: 0, draws: 0, lastCrop: null, forceBaselineMiss: false, forceOneXMiss: false, canvases: [] };
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      canvasStats.created += 1;
      const canvas = { width: 0, height: 0, isConnected: false, parentNode: null };
      canvasStats.canvases.push(canvas);
      const context = {
        pixels: new Uint8ClampedArray(),
        drawImage(source, sx, sy, sw, sh, _dx, _dy, dw, dh) {
          canvasStats.draws += 1;
          canvasStats.lastCrop = { sx, sy, sw, sh, dw, dh };
          const output = new Uint8ClampedArray(dw * dh * 4);
          if ((canvasStats.forceBaselineMiss
              && dw === Math.round(sw * 1.5)
              && dh === Math.round(sh * 1.5))
            || (canvasStats.forceOneXMiss && dw === sw && dh === sh)) {
            output.fill(255);
            this.pixels = output;
            return;
          }
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

  const sessionSource = await readFile(
    path.join(root, 'src/platform/scanner/universalScannerSession.ts'),
    'utf8',
  );
  assert.match(sessionSource, /const minDecodeIntervalMs = 70/,
    'the shared session must use the approved higher decode sampling cadence');

  const { SUPPORTED_BARCODE_FORMATS } = await import(pathToFileURL(
    path.join(tempRoot, 'src/platform/scanner/contracts.js'),
  ).href);
  assert.ok(SUPPORTED_BARCODE_FORMATS.includes('CODE_39'),
    'production retail allowlist must enable Code 39');

  const { defaultScannerDecoderFactory } = await import(pathToFileURL(
    path.join(tempRoot, 'src/platform/scanner/decoders/decoderFactory.js'),
  ).href);
  const { createScannerGeometryCandidates } = await import(pathToFileURL(
    path.join(tempRoot, 'src/platform/scanner/scannerGeometryCorrection.js'),
  ).href);
  const { resolveScannerRoiScaleCandidates } = await import(pathToFileURL(
    path.join(tempRoot, 'src/platform/scanner/scannerScale.js'),
  ).href);
  assert.deepEqual(resolveScannerRoiScaleCandidates(400, 200).map(({ width, height }) => [width, height]), [
    [600, 300], [400, 200], [800, 400],
  ], 'production adapter scale planner must retain 1.5x first and add bounded 1x/2x fallbacks');
  const {
    estimateScannerSkewAngle,
    deskewLuminanceFrame,
    rotateLuminanceByAngle,
  } = await import(pathToFileURL(
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
  const CODE39_ENCODINGS = {
    '0': 0x034, '1': 0x121, '2': 0x061, '3': 0x160, '4': 0x031,
    '5': 0x130, '6': 0x070, '7': 0x025, '8': 0x124, '9': 0x064,
    A: 0x109, B: 0x049, C: 0x148, D: 0x019, E: 0x118, F: 0x058,
    G: 0x00d, H: 0x10c, I: 0x04c, J: 0x01c, K: 0x103, L: 0x043,
    M: 0x142, N: 0x013, O: 0x112, P: 0x052, Q: 0x007, R: 0x106,
    S: 0x046, T: 0x016, U: 0x181, V: 0x0c1, W: 0x1c0, X: 0x091,
    Y: 0x190, Z: 0x0d0, '-': 0x085, '.': 0x184, ' ': 0x0c4,
    '$': 0x0a8, '/': 0x0a2, '+': 0x08a, '%': 0x02a, '*': 0x094,
  };
  function makeCode39Frame(value) {
    const framed = '*' + value + '*';
    let modules = '0'.repeat(12);
    for (let characterIndex = 0; characterIndex < framed.length; characterIndex += 1) {
      const encoding = CODE39_ENCODINGS[framed[characterIndex]];
      assert.notEqual(encoding, undefined, 'Code 39 fixture supports ' + framed[characterIndex]);
      for (let element = 0; element < 9; element += 1) {
        const wide = (encoding & (1 << (8 - element))) !== 0;
        const black = element % 2 === 0;
        modules += (black ? '1' : '0').repeat(wide ? 3 : 1);
      }
      if (characterIndex < framed.length - 1) modules += '0';
    }
    modules += '0'.repeat(12);
    const scale = 3;
    const width = modules.length * scale;
    const height = 84;
    const luminance = new Uint8ClampedArray(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < modules.length; x += 1) {
        luminance.fill(modules[x] === '1' ? 0 : 255, y * width + x * scale, y * width + (x + 1) * scale);
      }
    }
    return { luminance, width, height };
  }

  const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
  const EAN_G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
  const EAN_FIRST_PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
  function makeEanFrame(value, format) {
    const digits = [...value].map(Number);
    assert.ok((format === 'EAN_13' && digits.length === 13) || (format === 'EAN_8' && digits.length === 8));
    let bits = '0'.repeat(10) + '101';
    if (format === 'EAN_13') {
      const parity = EAN_FIRST_PARITY[digits[0]];
      for (let i = 0; i < 6; i++) bits += parity[i] === 'L' ? EAN_L[digits[i + 1]] : EAN_G[digits[i + 1]];
      bits += '01010';
      for (let i = 7; i < 13; i++) bits += EAN_L[digits[i]].replace(/./g, bit => bit === '0' ? '1' : '0');
    } else {
      for (let i = 0; i < 4; i++) bits += EAN_L[digits[i]];
      bits += '01010';
      for (let i = 4; i < 8; i++) bits += EAN_L[digits[i]].replace(/./g, bit => bit === '0' ? '1' : '0');
    }
    bits += '101' + '0'.repeat(10);
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
  async function createDecoder(format = 'CODE_128') {
    const decoder = await defaultScannerDecoderFactory.create();
    await decoder.initialize({ formats: [format] });
    return decoder;
  }
  async function decodeOnce(decoder, source, scanRegion = fullRegion, processingBudget) {
    return decoder.decode(source, {
      timestamp: 1234,
      scanRegion,
      ...(processingBudget ? { processingBudget } : {}),
    });
  }

  const code39Frame = makeCode39Frame('RETAIL-39');
  const code39Decoder = await createDecoder('CODE_39');
  const code39Result = await decodeOnce(code39Decoder, toSource(code39Frame));
  assert.equal(code39Result[0]?.value, 'RETAIL-39',
    'production adapter must decode a real Code 39 symbol through the strict ROI');
  assert.equal(code39Result[0]?.symbology, 'CODE_39',
    'production adapter must preserve Code 39 symbology in result delivery');
  await code39Decoder.dispose();

  const reversedCode39Frame = rotateCW(rotateCW(code39Frame));
  const reversedCode39Decoder = await createDecoder('CODE_39');
  const reversedCode39Result = await decodeOnce(reversedCode39Decoder, toSource(reversedCode39Frame));
  assert.equal(reversedCode39Result[0]?.value, 'RETAIL-39',
    'production adapter must decode Code 39 through the existing 180-degree OneDReader reversal path');
  await reversedCode39Decoder.dispose();

  const upright = makeCode128();
  const temporalDecoder = await createDecoder('CODE_128');
  const temporalDecoded = await temporalDecoder.decodeTemporalSnapshot({
    pixels: new Uint8Array(upright.luminance),
    width: upright.width,
    height: upright.height,
  }, 4321);
  assert.equal(temporalDecoded[0]?.value, '12345',
    'temporal snapshots must decode through the same production enhancement and ZXing path');
  assert.equal(temporalDecoded[0]?.timestamp, 4321,
    'temporal fallback output must retain the source observation timestamp');
  await temporalDecoder.dispose();

  // Curved/dented carrier fixture: each scanline receives a different smooth
  // nonlinear horizontal displacement and local scale. The geometry mesh must
  // align stable bar-edge correspondences without changing the source buffer.
  const makeDentedBarcodeFrame = (frame) => {
    const luminance = new Uint8ClampedArray(frame.luminance.length).fill(255);
    const center = (frame.width - 1) / 2;
    for (let y = 0; y < frame.height; y++) {
      const t = y / Math.max(1, frame.height - 1);
      const phase = Math.sin(t * Math.PI * 2);
      const shift = 7 * phase;
      const scale = 1 + 0.05 * phase;
      for (let x = 0; x < frame.width; x++) {
        const localBend = 3 * phase * Math.sin((x / frame.width) * Math.PI * 2);
        const sourceX = (x - center - shift - localBend) / scale + center;
        const x0 = Math.floor(sourceX), x1 = Math.min(frame.width - 1, x0 + 1);
        if (sourceX < 0 || sourceX > frame.width - 1) continue;
        const weight = sourceX - x0;
        luminance[y * frame.width + x] = Math.round(
          frame.luminance[y * frame.width + x0] * (1 - weight)
          + frame.luminance[y * frame.width + x1] * weight,
        );
      }
    }
    return { ...frame, luminance };
  };
  const dentedCode128 = makeDentedBarcodeFrame(upright);
  const dentedCopy = new Uint8ClampedArray(dentedCode128.luminance);
  const dentedGeometry = createScannerGeometryCandidates(dentedCode128);
  assert.ok(dentedGeometry.length > 0,
    'production-sized CODE-128 fixture on a dented/curved carrier must produce a bounded geometry candidate');
  assert.deepEqual(dentedCode128.luminance, dentedCopy,
    'geometry estimation and rectification must not mutate the captured ROI');
  const dentedDecoder = await createDecoder();
  const dentedResult = await decodeOnce(dentedDecoder, toSource(dentedGeometry[0]));
  assert.equal(dentedResult[0]?.value, '12345',
    'the real ZXing production adapter must decode the rectified dented-carrier candidate');
  await dentedDecoder.dispose();

  const dentedEan = makeDentedBarcodeFrame(makeEanFrame('5901234123457', 'EAN_13'));
  const dentedEanGeometry = createScannerGeometryCandidates(dentedEan);
  assert.ok(dentedEanGeometry.length > 0,
    'EAN-13 on a curved carrier must produce a bounded geometry candidate');
  const dentedEanDecoder = await createDecoder('EAN_13');
  const dentedEanResult = await decodeOnce(dentedEanDecoder, toSource(dentedEanGeometry[0]));
  assert.equal(dentedEanResult[0]?.value, '5901234123457',
    'the production EAN-13 adapter must decode a rectified curved-carrier barcode');
  await dentedEanDecoder.dispose();

  // Orthogonal planar tilt fixture: barcode bars keep their horizontal
  // positions while the top/bottom envelope changes smoothly across x.
  const paddedHeight = 120;
  const paddedTop = Math.floor((paddedHeight - upright.height) / 2);
  const padded = {
    width: upright.width,
    height: paddedHeight,
    luminance: new Uint8ClampedArray(upright.width * paddedHeight).fill(255),
  };
  for (let y = 0; y < upright.height; y++) {
    padded.luminance.set(
      upright.luminance.subarray(y * upright.width, (y + 1) * upright.width),
      (y + paddedTop) * padded.width,
    );
  }
  const verticalTiltPixels = new Uint8ClampedArray(padded.luminance.length).fill(255);
  const verticalCenter = (padded.height - 1) / 2;
  for (let y = 0; y < padded.height; y++) {
    for (let x = 0; x < padded.width; x++) {
      const phase = Math.sin((x / padded.width) * Math.PI * 2);
      const sourceY = (y - verticalCenter - 7 * phase) / (1 + 0.07 * phase) + verticalCenter;
      if (sourceY < 0 || sourceY > padded.height - 1) continue;
      const y0 = Math.floor(sourceY), y1 = Math.min(padded.height - 1, y0 + 1);
      const weight = sourceY - y0;
      verticalTiltPixels[y * padded.width + x] = Math.round(
        padded.luminance[y0 * padded.width + x] * (1 - weight)
        + padded.luminance[y1 * padded.width + x] * weight,
      );
    }
  }
  const verticalTilt = { ...padded, luminance: verticalTiltPixels };
  const verticalGeometry = createScannerGeometryCandidates(verticalTilt);
  assert.ok(verticalGeometry.some((candidate) => candidate.correction === 'column-envelope'
    || candidate.correction === 'combined-grid'),
    'the production-sized orthogonal perspective fixture must produce a column-envelope candidate');
  const verticalDecoder = await createDecoder();
  const verticalResult = await decodeOnce(verticalDecoder, toSource(verticalGeometry[0]));
  assert.equal(verticalResult[0]?.value, '12345',
    'the real ZXing production adapter must decode the rectified orthogonal-perspective candidate');
  await verticalDecoder.dispose();

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

  const lowContrastFrame = {
    width: upright.width,
    height: upright.height,
    luminance: Uint8ClampedArray.from(
      upright.luminance,
      (value) => value < 128 ? 108 : 148,
    ),
  };
  const lowContrastUprightDecoder = await createDecoder();
  const lowContrastUprightResult = await decodeOnce(
    lowContrastUprightDecoder, toSource(lowContrastFrame),
  );
  await lowContrastUprightDecoder.dispose();
  assert.equal(lowContrastUprightResult[0]?.value, '12345',
    'low-contrast upright baseline must decode before testing orientation correction');

  const lowContrastRotated = rotateLuminanceByAngle(
    lowContrastFrame.luminance, lowContrastFrame.width, lowContrastFrame.height, -31,
  );
  assert.ok(lowContrastRotated, 'low-contrast adapter fixture must be generated');
  const lowContrastAngled = {
    ...lowContrastRotated,
    luminance: Uint8ClampedArray.from(lowContrastRotated.luminance, value => Math.min(value, 148)),
  };
  const lowContrastEstimate = estimateScannerSkewAngle(
    lowContrastAngled.luminance, lowContrastAngled.width, lowContrastAngled.height,
  );
  assert.ok(lowContrastEstimate, 'low-contrast rotated barcode must produce an orientation estimate');
  assert.ok(Math.abs(lowContrastEstimate.angleDegrees + 31) < 3,
    `low-contrast orientation estimate must remain accurate; got ${lowContrastEstimate.angleDegrees}`);
  const lowContrastCorrected = deskewLuminanceFrame(
    lowContrastAngled.luminance, lowContrastAngled.width, lowContrastAngled.height,
  );
  assert.ok(lowContrastCorrected, 'low-contrast rotated barcode must produce a correction candidate');
  const lowContrastCorrectedDecoder = await createDecoder();
  const lowContrastCorrectedResult = await decodeOnce(
    lowContrastCorrectedDecoder, toSource(lowContrastCorrected),
  );
  await lowContrastCorrectedDecoder.dispose();
  assert.equal(lowContrastCorrectedResult[0]?.value, '12345',
    'low-contrast corrected pixels must decode when supplied directly to the production adapter');

  const lowContrastDecoder = await createDecoder();
  const lowContrastResult = await decodeOnce(lowContrastDecoder, toSource(lowContrastAngled));
  assert.equal(lowContrastResult[0]?.value, '12345',
    'production adapter must recover a low-contrast barcode at an intermediate angle');
  await lowContrastDecoder.dispose();

  // A3 constrained mode may trim only optional fallback tails. It must retain
  // practical sensitivity for upright, quarter-turned and low-contrast/skewed
  // production fixtures while the baseline/orientation path stays untouched.
  const constrainedBudget = {
    schemaVersion: 1,
    mode: 'constrained',
    maxImageCandidates: 1,
    maxGeometryCandidates: 2,
    reasons: ['synthetic_runtime_pressure'],
  };
  const constrainedUprightDecoder = await createDecoder();
  const constrainedUpright = await decodeOnce(
    constrainedUprightDecoder, toSource(upright), fullRegion, constrainedBudget,
  );
  assert.equal(constrainedUpright[0]?.value, '12345',
    'A3 constrained mode must preserve first-frame upright barcode sensitivity');
  await constrainedUprightDecoder.dispose();

  const constrainedQuarterTurnDecoder = await createDecoder();
  const constrainedQuarterTurn = await decodeOnce(
    constrainedQuarterTurnDecoder, toSource(rotateCW(upright)), fullRegion, constrainedBudget,
  );
  assert.equal(constrainedQuarterTurn[0]?.value, '12345',
    'A3 constrained mode must preserve orthogonal-rotation recovery');
  await constrainedQuarterTurnDecoder.dispose();

  const constrainedLowContrastDecoder = await createDecoder();
  const constrainedLowContrast = await decodeOnce(
    constrainedLowContrastDecoder, toSource(lowContrastAngled), fullRegion, constrainedBudget,
  );
  assert.equal(constrainedLowContrast[0]?.value, '12345',
    'A3 constrained mode must preserve low-contrast/intermediate-angle sensitivity');
  await constrainedLowContrastDecoder.dispose();

  for (const [format, value, angle] of [
    ['EAN_8', '96385074', 27],
    ['EAN_13', '5901234123457', -38],
  ]) {
    const ean = makeEanFrame(value, format);
    const angled = rotateLuminanceByAngle(ean.luminance, ean.width, ean.height, angle);
    assert.ok(angled, `${format} integration fixture must be generated`);
    const decoder = await createDecoder(format);
    const result = await decodeOnce(decoder, toSource(angled));
    assert.equal(result[0]?.value, value,
      `production adapter must recover ${format} at ${angle} degrees`);
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

  const noiseFrame = { width: 320, height: 160, luminance: new Uint8ClampedArray(320 * 160) };
  let noiseSeed = 0x5eed1234;
  for (let index = 0; index < noiseFrame.luminance.length; index += 1) {
    noiseSeed = (1664525 * noiseSeed + 1013904223) >>> 0;
    noiseFrame.luminance[index] = noiseSeed >>> 24;
  }
  const noiseDecoder = await createDecoder();
  const originalWarn = console.warn;
  const decodeWarnings = [];
  console.warn = (...args) => decodeWarnings.push(args);
  try {
    assert.deepEqual(await decodeOnce(noiseDecoder, toSource(noiseFrame)), [],
      'directionally ambiguous non-barcode texture must not produce a result');
  } finally {
    console.warn = originalWarn;
    await noiseDecoder.dispose();
  }
  assert.equal(decodeWarnings.length, 0,
    'expected ZXing NotFoundException misses must not flood the console during continuous scanning');

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
  assert.equal(canvasStats.draws, drawsBefore + 3,
    'strict ROI miss may try three scales, but every draw must remain inside the requested crop');
  assert.equal(canvasStats.lastCrop.sx, upright.width,
    'decoder must draw from the module-owned right-half ROI at every scale');
  assert.equal(canvasStats.lastCrop.sw, upright.width,
    'multi-scale sampling must never widen the source crop beyond the module-owned ROI');
  await roiDecoder.dispose();

  const fallbackDecoder = await createDecoder();
  canvasStats.forceBaselineMiss = true;
  const fallbackDrawsBefore = canvasStats.draws;
  const fallbackResult = await decodeOnce(fallbackDecoder, toSource(upright));
  assert.equal(fallbackResult[0]?.value, '12345',
    'production adapter must recover a barcode when the preserved 1.5x baseline misses and 1x fallback succeeds');
  assert.equal(canvasStats.draws, fallbackDrawsBefore + 2,
    'successful 1x fallback must stop the candidate loop before attempting 2x');
  canvasStats.forceBaselineMiss = false;
  await fallbackDecoder.dispose();

  // Exercise the final 2x fallback independently: force both earlier
  // candidates to miss while allowing the production decoder to process 2x.
  const twoXFallbackDecoder = await createDecoder();
  canvasStats.forceBaselineMiss = true;
  canvasStats.forceOneXMiss = true;
  const twoXDrawsBefore = canvasStats.draws;
  const twoXFallbackResult = await decodeOnce(twoXFallbackDecoder, toSource(upright));
  assert.equal(twoXFallbackResult[0]?.value, '12345',
    'production adapter must recover a barcode when 1.5x and 1x miss and the 2x fallback succeeds');
  assert.equal(canvasStats.draws, twoXDrawsBefore + 3,
    'successful 2x fallback must run after both earlier candidates and stop immediately on success');
  canvasStats.forceBaselineMiss = false;
  canvasStats.forceOneXMiss = false;
  await twoXFallbackDecoder.dispose();

  // Multi-scale is an internal pixel-processing concern. Pass a video-shaped
  // source with immutable presentation/camera state through the real adapter
  // and prove decoding only reads it while drawing into detached canvases.
  let playCalls = 0;
  let pauseCalls = 0;
  let frameCallbackCalls = 0;
  let cancelFrameCallbackCalls = 0;
  let trackStopCalls = 0;
  let constraintCalls = 0;
  const track = Object.freeze({
    readyState: 'live',
    stop() { trackStopCalls += 1; },
    applyConstraints() { constraintCalls += 1; },
  });
  const stream = Object.freeze({
    active: true,
    getTracks: () => Object.freeze([track]),
    getVideoTracks: () => Object.freeze([track]),
  });
  const previewStyle = Object.freeze({
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: 'none',
  });
  const videoSource = Object.freeze({
    ...toSource(upright),
    videoWidth: upright.width,
    videoHeight: upright.height,
    srcObject: stream,
    paused: false,
    currentTime: 12.5,
    playbackRate: 1,
    style: previewStyle,
    play() { playCalls += 1; },
    pause() { pauseCalls += 1; },
    requestVideoFrameCallback() { frameCallbackCalls += 1; },
    cancelVideoFrameCallback() { cancelFrameCallbackCalls += 1; },
  });
  const videoDecoder = await createDecoder();
  const videoDrawsBefore = canvasStats.draws;
  const videoResult = await decodeOnce(videoDecoder, videoSource);
  assert.equal(videoResult[0]?.value, '12345',
    'the production decoder must decode from a video-like source without owning video playback');
  assert.equal(canvasStats.draws, videoDrawsBefore + 1,
    'a successful baseline must not run unnecessary alternate scales');
  assert.equal(videoSource.srcObject, stream,
    'multi-scale decoding must preserve the active camera stream attachment');
  assert.equal(videoSource.videoWidth, upright.width,
    'multi-scale decoding must not alter the intrinsic video width');
  assert.equal(videoSource.videoHeight, upright.height,
    'multi-scale decoding must not alter the intrinsic video height');
  assert.equal(videoSource.paused, false,
    'multi-scale decoding must not pause the preview');
  assert.equal(videoSource.currentTime, 12.5,
    'multi-scale decoding must not seek or otherwise change video playback');
  assert.equal(videoSource.playbackRate, 1,
    'multi-scale decoding must not change video playback rate');
  assert.equal(videoSource.style, previewStyle,
    'multi-scale decoding must not replace or mutate preview presentation styles');
  assert.equal(playCalls + pauseCalls + frameCallbackCalls + cancelFrameCallbackCalls, 0,
    'multi-scale decoding must not invoke video playback or frame scheduling APIs');
  assert.equal(stream.active, true, 'multi-scale decoding must preserve camera stream activity');
  assert.equal(track.readyState, 'live', 'multi-scale decoding must preserve the camera track');
  assert.equal(trackStopCalls, 0, 'multi-scale decoding must never stop the camera track');
  assert.equal(constraintCalls, 0, 'multi-scale decoding must never reconfigure camera constraints');
  assert.ok(canvasStats.canvases.every(canvas => !canvas.isConnected && canvas.parentNode === null),
    'all decoder canvases must remain detached internal processing surfaces');
  await videoDecoder.dispose();

  const invalidDecoder = await createDecoder();
  const invalidDrawsBefore = canvasStats.draws;
  assert.deepEqual(await decodeOnce(invalidDecoder, toSource(upright), null), [],
    'missing ROI must fail closed');
  assert.equal(canvasStats.draws, invalidDrawsBefore,
    'missing ROI must not draw or decode a full frame');
  await invalidDecoder.dispose();

  console.log('Production ZXing adapter integration passed: formats/orientations, strict ROI, 1.5x→1x→2x fallback, detached processing canvas, immutable video preview and camera stream contract.');
} finally {
  delete globalThis.document;
  await rm(tempRoot, { recursive: true, force: true });
}
