import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = await mkdtemp(path.join(root, '.scanner-a3-'));
const modulePaths = [
  'src/platform/scanner/scannerAdaptiveRuntimeController.ts',
  'src/platform/scanner/scannerAdaptiveProcessingController.ts',
  'src/platform/scanner/scannerRotation.ts',
  'src/platform/scanner/scannerDeskew.ts',
  'src/platform/scanner/scannerEnhancementPipeline.ts',
  'src/platform/scanner/scannerImageEnhancement.ts',
  'src/platform/scanner/scannerGeometryCorrection.ts',
];
try {
  for (const relativePath of modulePaths) {
    const source = await readFile(path.join(root, relativePath), 'utf8');
    let compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    for (const specifier of [
      './scannerImageEnhancement', './scannerRotation', './scannerDeskew',
      './scannerGeometryCorrection', './scannerAdaptiveProcessingController',
      './scannerAdaptiveRuntimeController',
    ]) {
      compiled = compiled
        .replaceAll(`from '${specifier}'`, `from '${specifier}.js'`)
        .replaceAll(`from "${specifier}"`, `from "${specifier}.js"`);
    }
    const outputPath = path.join(tempRoot, relativePath.slice(0, -3) + '.js');
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, compiled, 'utf8');
  }

  const { ScannerAdaptiveRuntimeController, SCANNER_ADAPTIVE_RUNTIME_POLICY } = await import(pathToFileURL(
    path.join(tempRoot, 'src/platform/scanner/scannerAdaptiveRuntimeController.js'),
  ).href);
  const controller = new ScannerAdaptiveRuntimeController();
  assert.deepEqual(controller.getBudget(), {
    schemaVersion: 1, mode: 'normal', maxImageCandidates: 2,
    maxGeometryCandidates: 4, reasons: ['startup_full_budget'],
  });

  // Isolated spikes must not change the mode.
  controller.observe(180, 260);
  assert.equal(controller.getBudget().mode, 'normal');
  controller.observe(45, 80);
  controller.observe(190, 300);
  assert.equal(controller.getBudget().mode, 'normal');
  controller.observe(45, 80);

  // Sustained pressure switches once after the configured streak.
  controller.observe(125, 170);
  controller.observe(135, 190);
  assert.equal(controller.getBudget().mode, 'normal');
  const constrained = controller.observe(120, 240);
  assert.equal(constrained.mode, 'constrained');
  assert.equal(constrained.maxImageCandidates, 1);
  assert.equal(constrained.maxGeometryCandidates, 2);
  for (let i = 0; i < SCANNER_ADAPTIVE_RUNTIME_POLICY.pressureSamplesToConstrain * 3; i++) {
    controller.observe(140, 250);
  }
  assert.equal(controller.getBudget().mode, 'constrained',
    'continued pressure must not cause repeated mode transitions');

  // Partial recovery and borderline samples must not cause oscillation.
  for (let i = 0; i < SCANNER_ADAPTIVE_RUNTIME_POLICY.recoverySamplesToRestore - 1; i++) {
    controller.observe(60, 120);
  }
  controller.observe(95, 160);
  assert.equal(controller.getBudget().mode, 'constrained',
    'one borderline sample resets the recovery streak');

  // A full stable window restores all fallback candidates.
  let restored;
  for (let i = 0; i < SCANNER_ADAPTIVE_RUNTIME_POLICY.recoverySamplesToRestore; i++) {
    restored = controller.observe(55, 100);
  }
  assert.equal(restored.mode, 'normal');
  assert.equal(restored.maxImageCandidates, 2);
  assert.equal(restored.maxGeometryCandidates, 4);
  assert.deepEqual(restored.reasons, ['sustained_runtime_recovery']);

  // Invalid metrics are ignored rather than poisoning controller state.
  controller.observe(Number.NaN, 10);
  assert.equal(controller.getBudget().mode, 'normal');
  controller.reset();
  assert.equal(controller.getBudget().mode, 'normal');
  assert.deepEqual(controller.getBudget().reasons, ['session_reset_full_budget']);

  const { executeScannerEnhancementPipeline } = await import(pathToFileURL(
    path.join(tempRoot, 'src/platform/scanner/scannerEnhancementPipeline.js'),
  ).href);
  const { createScannerGeometryCandidates } = await import(pathToFileURL(
    path.join(tempRoot, 'src/platform/scanner/scannerGeometryCorrection.js'),
  ).href);
  const width = 240, height = 96;
  const pixels = new Uint8ClampedArray(width * height).fill(165);
  for (let y = 8; y < 88; y++) {
    for (let x = 20; x < 220; x++) {
      if (Math.floor((x - 20) / 6) % 2 === 0) pixels[y * width + x] = 116;
    }
  }
  const source = { luminance: pixels, width, height };
  const quality = {
    dynamicRange: 80, darkFraction: 0.2, brightFraction: 0.05,
    contrast: 5, noise: 2, meanLuminance: 80, verticalContrast: 5,
    edgeStrength: 8, verticalNoise: 2, specularGlareFraction: 0,
    glareBandCoverage: 0, glareBandOrientation: null,
    issues: ['low_contrast', 'underexposed'],
  };
  const attemptWithBudget = (budget, baselineHit = false) => {
    const attempted = [];
    const result = executeScannerEnhancementPipeline(source, {
      imageQuality: quality,
      processingBudget: budget,
    }, (candidate) => {
      attempted.push(candidate.stage + (candidate.transform ? ':' + candidate.transform : ''));
      return baselineHit && candidate.stage === 'baseline' ? 'baseline-hit' : null;
    });
    return { attempted, result };
  };

  const full = attemptWithBudget({
    schemaVersion: 1, mode: 'normal', maxImageCandidates: 2,
    maxGeometryCandidates: 4, reasons: ['test_full_budget'],
  });
  const limited = attemptWithBudget({
    schemaVersion: 1, mode: 'constrained', maxImageCandidates: 1,
    maxGeometryCandidates: 2, reasons: ['test_constrained_budget'],
  });
  const fullImages = full.attempted.filter((item) => item.startsWith('image:'));
  const limitedImages = limited.attempted.filter((item) => item.startsWith('image:'));
  assert.equal(fullImages.length, 2, 'normal runtime uses the full A2 image fallback budget');
  assert.equal(limitedImages.length, 1, 'constrained runtime bounds image fallback to one candidate');
  assert.equal(limitedImages[0], fullImages[0],
    'constrained mode preserves the highest-priority A2 image candidate');

  const makeWarpedBars = () => {
    const w = 240, h = 96;
    const data = new Uint8ClampedArray(w * h).fill(255);
    for (let y = 0; y < h; y++) {
      const t = y / (h - 1);
      const span = 150 + t * 26;
      for (let x = 0; x < w; x++) {
        const u = (x - 120) / span + 0.5;
        if (u >= 0 && u < 1 && Math.floor(u * 30) % 2 === 0) data[y * w + x] = 0;
      }
    }
    return { luminance: data, width: w, height: h };
  };
  const warped = makeWarpedBars();
  assert.ok(createScannerGeometryCandidates(warped).length > 0,
    'the geometry stress fixture must produce real rectification candidates');
  const runGeometryBudget = (budget) => executeScannerEnhancementPipeline(warped, {
    imageQuality: null,
    processingBudget: budget,
  }, () => null);
  const fullGeometry = runGeometryBudget({
    schemaVersion: 1, mode: 'normal', maxImageCandidates: 2,
    maxGeometryCandidates: 4, reasons: ['test_full_budget'],
  });
  const constrainedGeometry = runGeometryBudget({
    schemaVersion: 1, mode: 'constrained', maxImageCandidates: 1,
    maxGeometryCandidates: 2, reasons: ['test_constrained_budget'],
  });
  assert.ok(fullGeometry.geometryCandidatesAttempted <= 4);
  assert.ok(constrainedGeometry.geometryCandidatesAttempted <= 2,
    'constrained runtime must respect the two-candidate geometry ceiling');
  assert.ok(constrainedGeometry.geometryCandidatesAttempted <= fullGeometry.geometryCandidatesAttempted,
    'constrained mode cannot increase geometry work');

  const fastPath = attemptWithBudget({
    schemaVersion: 1, mode: 'constrained', maxImageCandidates: 1,
    maxGeometryCandidates: 2, reasons: ['test_constrained_budget'],
  }, true);
  assert.equal(fastPath.result.output, 'baseline-hit');
  assert.deepEqual(fastPath.attempted, ['baseline'],
    'runtime pressure must never reduce or delay the baseline decode path');

  const session = await readFile(path.join(root, 'src/platform/scanner/universalScannerSession.ts'), 'utf8');
  const adapter = await readFile(path.join(root, 'src/platform/scanner/decoders/decoderAdapter.ts'), 'utf8');
  const decoder = await readFile(path.join(root, 'src/platform/scanner/decoders/zxingWasmDecoder.ts'), 'utf8');
  const pipeline = await readFile(path.join(root, 'src/platform/scanner/scannerEnhancementPipeline.ts'), 'utf8');
  assert.match(session, /new ScannerAdaptiveRuntimeController\(\)/);
  assert.match(session, /this\.adaptiveRuntimeController\.observe\(decodeDurationMs, frameGapMs\)/);
  assert.match(session, /processingBudget,/,
    'the same measured runtime budget must be passed into each live frame decode');
  assert.match(session, /decodeTemporalSnapshot\(temporalCandidate, temporalCandidate\.timestamp, processingBudget\)/,
    'T3 temporal fallback receives the same budget rather than being silently disabled');
  assert.match(adapter, /processingBudget\?: ScannerAdaptiveRuntimeBudget/);
  assert.match(decoder, /processingBudget: options\.processingBudget/,
    'the live-frame budget must reach the WASM enhancement pipeline');
  assert.match(decoder, /decodeTemporalSnapshot\([\s\S]*?processingBudget,/,
    'the WASM adapter must preserve the temporal fallback budget contract');
  assert.match(pipeline, /options\.processingBudget\?\.maxImageCandidates/);
  assert.match(pipeline, /options\.processingBudget\?\.maxGeometryCandidates/);
  assert.match(session, /const minDecodeIntervalMs = 70/,
    'A3 does not throttle the existing frame sampling cadence');
  assert.match(session, /validateBarcodePayload\(value, result\.symbology\)/,
    'A3 remains upstream of and cannot bypass payload validation');

  console.log('Scanner A3 adaptive runtime controller, hysteresis, fallback budget and baseline fast-path tests passed.');
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
