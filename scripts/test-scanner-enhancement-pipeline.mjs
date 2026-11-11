import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = await mkdtemp(path.join(root, '.scanner-enhancement-pipeline-'));
const modulePaths = [
  'src/platform/scanner/scannerRotation.ts',
  'src/platform/scanner/scannerDeskew.ts',
  'src/platform/scanner/scannerEnhancementPipeline.ts',
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

  const { rotateLuminanceByAngle, estimateScannerSkewAngle } = await import(pathToFileURL(
    path.join(tempRoot, 'src/platform/scanner/scannerDeskew.js'),
  ).href);
  const { executeScannerEnhancementPipeline } = await import(pathToFileURL(
    path.join(tempRoot, 'src/platform/scanner/scannerEnhancementPipeline.js'),
  ).href);

  const width = 240, height = 96;
  const source = new Uint8ClampedArray(width * height).fill(255);
  const modules = [2, 1, 3, 1, 1, 2, 2, 1, 3, 1, 2, 1, 1, 3, 2, 1];
  let x = 12;
  for (const moduleWidth of modules) {
    source.fill(0, x, Math.min(width - 12, x + moduleWidth * 3));
    x += moduleWidth * 3 + 3;
  }
  const upright = { luminance: source, width, height };

  const baselineAttempts = [];
  const baselineResult = executeScannerEnhancementPipeline(
    upright,
    {},
    (candidate) => {
      baselineAttempts.push(candidate.stage);
      return candidate.stage === 'baseline' ? 'baseline-hit' : null;
    },
  );
  assert.equal(baselineResult.output, 'baseline-hit');
  assert.deepEqual(baselineAttempts, ['baseline'],
    'original ROI must remain the first candidate and short-circuit on a valid decode');
  assert.equal(baselineResult.matchedStage, 'baseline');
  assert.equal(baselineResult.rotationAttempted, false);

  const orthogonalAttempts = [];
  const orthogonalResult = executeScannerEnhancementPipeline(
    upright,
    {},
    (candidate) => {
      orthogonalAttempts.push(candidate.stage);
      return candidate.stage === 'orthogonal' ? 'orthogonal-hit' : null;
    },
  );
  assert.equal(orthogonalResult.output, 'orthogonal-hit');
  assert.deepEqual(orthogonalAttempts, ['baseline', 'orthogonal'],
    'quarter-turn candidate must run only after original candidate misses');
  assert.equal(orthogonalResult.rotationAttempted, true);
  assert.equal(orthogonalResult.deskewAttempts, 0,
    'deskew work must not run after a valid quarter-turn decode');

  const skewed = rotateLuminanceByAngle(source, width, height, 17);
  assert.ok(skewed, 'bounded skew fixture must be generated');
  const estimate = estimateScannerSkewAngle(skewed.luminance, skewed.width, skewed.height);
  assert.ok(estimate, 'fixture must contain a confidence-gated orientation estimate');

  const deskewAttempts = [];
  const stageCosts = [];
  const deskewResult = executeScannerEnhancementPipeline(
    skewed,
    { cachedOrientationHints: { upright: estimate, rotated: null }, reuseOrientationHints: true },
    (candidate) => {
      deskewAttempts.push(candidate);
      return candidate.stage === 'deskew' ? 'deskew-hit' : null;
    },
    (stage, durationMs) => stageCosts.push({ stage, durationMs }),
  );
  assert.equal(deskewResult.output, 'deskew-hit');
  assert.equal(deskewResult.matchedStage, 'deskew');
  assert.equal(deskewResult.reusedOrientation, true,
    'scale fallback may reuse only a previously validated ROI orientation estimate');
  assert.ok(deskewResult.deskewAttempts >= 1);
  assert.ok(deskewAttempts.some((candidate) => candidate.stage === 'baseline'));
  assert.ok(deskewAttempts.some((candidate) => candidate.stage === 'orthogonal'));
  assert.ok(deskewAttempts.some((candidate) => candidate.stage === 'deskew'));
  assert.ok(stageCosts.some((item) => item.stage === 'rotation_90_clockwise'));
  assert.ok(stageCosts.some((item) => item.stage === 'deskew_reuse_orientation_and_rotate'));
  assert.ok(deskewResult.matchedAngleDegrees !== null);

  const missResult = executeScannerEnhancementPipeline(
    { luminance: new Uint8ClampedArray(80 * 40).fill(255), width: 80, height: 40 },
    {},
    () => null,
  );
  assert.equal(missResult.output, null,
    'a pipeline miss must remain a miss; it must not invent a decode or escape the supplied ROI');

  console.log('Scanner unified enhancement pipeline tests passed: baseline-first, orthogonal fallback, confidence-gated deskew, reuse and early exit.');
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
