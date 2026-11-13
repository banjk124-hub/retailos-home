import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = await mkdtemp(path.join(root, '.scanner-a2-'));
const modulePaths = [
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
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText.replace(
      /(from\s+['"])(\.\.?\/[^'"]+)(['"])/g,
      (_match, prefix, specifier, suffix) =>
        prefix + (specifier.endsWith('.js') ? specifier : specifier + '.js') + suffix,
    );
    const outputPath = path.join(tempRoot, relativePath.replace(/\.ts$/, '.js'));
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, compiled, 'utf8');
  }

  const { createScannerAdaptiveProcessingPlan } = await import(pathToFileURL(
    path.join(tempRoot, 'src/platform/scanner/scannerAdaptiveProcessingController.js'),
  ).href);
  const base = {
    dynamicRange: 80, darkFraction: 0.1, brightFraction: 0.05,
    contrast: 5, noise: 2, meanLuminance: 120, verticalContrast: 5,
    edgeStrength: 8, verticalNoise: 2, specularGlareFraction: 0,
    glareBandCoverage: 0, glareBandOrientation: null, issues: [],
  };

  const unavailable = createScannerAdaptiveProcessingPlan(null);
  assert.equal(unavailable.mode, 'legacy_fallback');
  assert.equal(unavailable.imageTransforms, null,
    'missing quality evidence must preserve legacy candidate behavior');

  const lowContrast = createScannerAdaptiveProcessingPlan({
    ...base, issues: ['low_contrast'],
  });
  assert.equal(lowContrast.mode, 'targeted');
  assert.deepEqual(lowContrast.imageTransforms, ['contrast']);

  const underexposed = createScannerAdaptiveProcessingPlan({
    ...base, darkFraction: 0.2, issues: ['underexposed'],
  });
  assert.deepEqual(underexposed.imageTransforms, ['gamma']);

  const noisy = createScannerAdaptiveProcessingPlan({
    ...base, noise: 18, issues: ['high_noise'],
  });
  assert.deepEqual(noisy.imageTransforms, ['denoise']);

  const combined = createScannerAdaptiveProcessingPlan({
    ...base, darkFraction: 0.2, noise: 18, issues: ['low_contrast', 'underexposed', 'high_noise'],
  });
  assert.deepEqual(combined.imageTransforms, ['contrast', 'gamma'],
    'multi-cause plans must retain deterministic priority and stay within two transforms');

  const glare = createScannerAdaptiveProcessingPlan({
    ...base, issues: ['specular_glare', 'low_contrast'],
  });
  assert.equal(glare.mode, 'enhancement_bypass');
  assert.deepEqual(glare.imageTransforms, [],
    'specular glare must suppress potentially destructive image transforms');

  const clipped = createScannerAdaptiveProcessingPlan({
    ...base, issues: ['highlight_clipping', 'underexposed'],
  });
  assert.equal(clipped.mode, 'enhancement_bypass',
    'clipped input must not be amplified by gamma or contrast transforms');

  const ineligibleContrast = createScannerAdaptiveProcessingPlan({
    ...base, dynamicRange: 12, issues: ['low_contrast'],
  });
  assert.equal(ineligibleContrast.mode, 'legacy_fallback',
    'do not select contrast when the existing transform generator cannot produce it');

  const ineligibleGamma = createScannerAdaptiveProcessingPlan({
    ...base, dynamicRange: 18, issues: ['underexposed'],
  });
  assert.equal(ineligibleGamma.mode, 'legacy_fallback',
    'do not select gamma when the existing transform generator rejects the range');

  const verticalOnlyNoise = createScannerAdaptiveProcessingPlan({
    ...base, noise: 4, verticalNoise: 19, issues: ['high_noise'],
  });
  assert.equal(verticalOnlyNoise.mode, 'legacy_fallback',
    'do not select horizontal denoise from vertical-only noise evidence');

  const { executeScannerEnhancementPipeline } = await import(pathToFileURL(
    path.join(tempRoot, 'src/platform/scanner/scannerEnhancementPipeline.js'),
  ).href);
  const sourcePixels = new Uint8ClampedArray(240 * 96).fill(165);
  for (let y = 8; y < 88; y++) {
    for (let x = 20; x < 220; x++) {
      if (Math.floor((x - 20) / 6) % 2 === 0) sourcePixels[y * 240 + x] = 116;
    }
  }
  const source = { luminance: sourcePixels, width: 240, height: 96 };
  let selectedPlan = null;
  const attempted = [];
  const pipelineResult = executeScannerEnhancementPipeline(source, {
    imageQuality: { ...base, issues: ['low_contrast'] },
    onProcessingPlan: (plan) => { selectedPlan = plan; },
  }, (candidate) => {
    attempted.push(candidate);
    return candidate.stage === 'image' ? candidate.transform : null;
  });
  assert.equal(selectedPlan.mode, 'targeted',
    'the production pipeline must consume and expose the A2 plan');
  assert.equal(pipelineResult.output, 'contrast',
    'a low-contrast observation must route to its targeted transform');
  assert.deepEqual(attempted.filter((candidate) => candidate.stage === 'image')
    .map((candidate) => candidate.transform), ['contrast'],
  'unrelated gamma/denoise transforms must not be attempted for a contrast-only diagnosis');

  const fastPathAttempts = [];
  let fastPathPlan = null;
  const fastPath = executeScannerEnhancementPipeline(source, {
    imageQuality: { ...base, issues: ['low_contrast'] },
    onProcessingPlan: (plan) => { fastPathPlan = plan; },
  }, (candidate) => {
    fastPathAttempts.push(candidate.stage);
    return candidate.stage === 'baseline' ? 'immediate' : null;
  });
  assert.equal(fastPath.output, 'immediate');
  assert.equal(fastPathPlan, null,
    'a baseline hit must short-circuit before adaptive fallback planning');
  assert.deepEqual(fastPathAttempts, ['baseline'],
    'A2 must not delay or alter the baseline fast path');

  console.log('Scanner A2 adaptive processing controller tests passed.');
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
