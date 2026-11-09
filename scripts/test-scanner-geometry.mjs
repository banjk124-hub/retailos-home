import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(
  new URL('../src/platform/scanner/scannerGeometry.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
  .replace("from './contracts';", "from './contracts.js';");
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64');
const { mapPreviewScanRegionToSourceFrame, parseScannerObjectPosition } = await import(moduleUrl);

const closeTo = (actual, expected, message, epsilon = 1e-6) => {
  assert.ok(Math.abs(actual - expected) <= epsilon,
    `${message}: expected ${expected}, received ${actual}`);
};
const map = (rect, overrides = {}) => mapPreviewScanRegionToSourceFrame(
  { coordinateSpace: 'preview-content-normalized', rect },
  {
    sourceWidth: 1280,
    sourceHeight: 720,
    previewWidth: 400,
    previewHeight: 500,
    objectFit: 'cover',
    objectPosition: { x: 0.5, y: 0.5 },
    mirrored: false,
    ...overrides,
  },
);
const full = { x: 0, y: 0, width: 1, height: 1 };

// Computed CSS object-position values resolve to explicit normalized fractions.
assert.deepEqual(parseScannerObjectPosition('center'), { x: 0.5, y: 0.5 });
assert.deepEqual(parseScannerObjectPosition('left top'), { x: 0, y: 0 });
assert.deepEqual(parseScannerObjectPosition('right bottom'), { x: 1, y: 1 });
assert.deepEqual(parseScannerObjectPosition('top right'), { x: 1, y: 0 });
assert.deepEqual(parseScannerObjectPosition('25% 75%'), { x: 0.25, y: 0.75 });
assert.deepEqual(parseScannerObjectPosition('50%'), { x: 0.5, y: 0.5 });
assert.equal(parseScannerObjectPosition('10px 20px'), null,
  'unsupported length-based object-position must not silently default to center');
assert.equal(parseScannerObjectPosition('calc(50% - 2px) center'), null,
  'unsupported calc object-position must fail explicitly');

// Cover: a 16:9 source cropped into a portrait 4:5 preview.
// The centered viewport is 45% of the source width, with equal vertical bounds.
const coverCenter = map(full);
assert.equal(coverCenter.ok, true);
closeTo(coverCenter.region.rect.x, 0.275, 'cover center crop left');
closeTo(coverCenter.region.rect.y, 0, 'cover center crop top');
closeTo(coverCenter.region.rect.width, 0.45, 'cover center crop width');
closeTo(coverCenter.region.rect.height, 1, 'cover center crop height');
assert.equal(coverCenter.region.coordinateSpace, 'source-frame-normalized');

// object-position changes the visible source crop, not the module's preview ROI.
const coverLeft = map(full, { objectPosition: { x: 0, y: 0.5 } });
const coverRight = map(full, { objectPosition: { x: 1, y: 0.5 } });
assert.equal(coverLeft.ok, true);
assert.equal(coverRight.ok, true);
closeTo(coverLeft.region.rect.x, 0, 'cover left object-position');
closeTo(coverLeft.region.rect.width, 0.45, 'cover left crop width');
closeTo(coverRight.region.rect.x, 0.55, 'cover right object-position');
closeTo(coverRight.region.rect.width, 0.45, 'cover right crop width');

// Cover can also crop vertically; object-position top/bottom selects the source rows.
const wideTop = map(full, {
  previewWidth: 800,
  previewHeight: 400,
  objectPosition: { x: 0.5, y: 0 },
});
const wideBottom = map(full, {
  previewWidth: 800,
  previewHeight: 400,
  objectPosition: { x: 0.5, y: 1 },
});
assert.equal(wideTop.ok, true);
assert.equal(wideBottom.ok, true);
closeTo(wideTop.region.rect.y, 0, 'cover top object-position');
closeTo(wideTop.region.rect.height, 8 / 9, 'cover vertical crop height');
closeTo(wideBottom.region.rect.y, 1 / 9, 'cover bottom object-position');
closeTo(wideBottom.region.rect.height, 8 / 9, 'cover bottom crop height');

// A smaller contained image excludes letterbox space from preview-content coordinates.
const contain = map(full, {
  previewWidth: 800,
  previewHeight: 400,
  objectFit: 'contain',
});
assert.equal(contain.ok, true);
closeTo(contain.visibleContentBounds.x, 1 / 18, 'contain visible content left');
closeTo(contain.visibleContentBounds.width, 8 / 9, 'contain visible content width');
closeTo(contain.region.rect.x, 0, 'contain source left');
closeTo(contain.region.rect.y, 0, 'contain source top');
closeTo(contain.region.rect.width, 1, 'contain source width');
closeTo(contain.region.rect.height, 1, 'contain source height');

// Current production reticles map through their respective portrait preview geometries.
const homeReticle = map(
  { x: 0.08, y: 0.22, width: 0.84, height: 0.56 },
  { previewWidth: 390, previewHeight: 844, objectPosition: { x: 0.5, y: 0.5 } },
);
assert.equal(homeReticle.ok, true);
closeTo(homeReticle.region.rect.x, 0.39083234597, 'Home reticle source x');
closeTo(homeReticle.region.rect.y, 0.22, 'Home reticle source y');
closeTo(homeReticle.region.rect.width, 0.21833530806, 'Home reticle source width');
closeTo(homeReticle.region.rect.height, 0.56, 'Home reticle source height');

const stocktakeReticle = map(
  { x: 0.10, y: 0.28, width: 0.80, height: 0.44 },
  { previewWidth: 360, previewHeight: 450, objectPosition: { x: 0.5, y: 0.5 } },
);
assert.equal(stocktakeReticle.ok, true);
closeTo(stocktakeReticle.region.rect.x, 0.32, 'Stocktake reticle source x');
closeTo(stocktakeReticle.region.rect.y, 0.28, 'Stocktake reticle source y');
closeTo(stocktakeReticle.region.rect.width, 0.36, 'Stocktake reticle source width');
closeTo(stocktakeReticle.region.rect.height, 0.44, 'Stocktake reticle source height');

// Mirroring is applied in visual preview space and inverted before source mapping.
const leftPreviewRegion = { x: 0, y: 0.2, width: 0.2, height: 0.6 };
const normalLeft = map(leftPreviewRegion);
const mirroredLeft = map(leftPreviewRegion, { mirrored: true });
assert.equal(normalLeft.ok, true);
assert.equal(mirroredLeft.ok, true);
closeTo(normalLeft.region.rect.x, 0.275, 'unmirrored left edge source x');
closeTo(mirroredLeft.region.rect.x, 0.635, 'mirrored left edge source x');
closeTo(mirroredLeft.region.rect.width, 0.09, 'mirrored region source width');

// Fill stretches independently on both axes; region fractions remain aligned.
const fill = map({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 }, { objectFit: 'fill' });
assert.equal(fill.ok, true);
closeTo(fill.region.rect.x, 0.25, 'fill x');
closeTo(fill.region.rect.y, 0.25, 'fill y');
closeTo(fill.region.rect.width, 0.5, 'fill width');
closeTo(fill.region.rect.height, 0.5, 'fill height');

// none and scale-down use the CSS replaced-element object sizing rules.
const none = map(full, { objectFit: 'none' });
assert.equal(none.ok, true);
closeTo(none.region.rect.x, 0.34375, 'none centered crop x');
closeTo(none.region.rect.y, 11 / 72, 'none centered crop y');
closeTo(none.region.rect.width, 0.3125, 'none centered crop width');
closeTo(none.region.rect.height, 25 / 36, 'none centered crop height');

const scaleDown = map(full, {
  sourceWidth: 320,
  sourceHeight: 240,
  previewWidth: 640,
  previewHeight: 480,
  objectFit: 'scale-down',
});
assert.equal(scaleDown.ok, true);
closeTo(scaleDown.region.rect.x, 0, 'scale-down source x');
closeTo(scaleDown.region.rect.y, 0, 'scale-down source y');
closeTo(scaleDown.region.rect.width, 1, 'scale-down source width');
closeTo(scaleDown.region.rect.height, 1, 'scale-down source height');

// Invalid inputs fail explicitly; no accidental full-frame fallback is returned.
for (const rect of [
  { x: -0.01, y: 0, width: 0.5, height: 0.5 },
  { x: 0, y: 0, width: 0, height: 0.5 },
  { x: 0.8, y: 0, width: 0.3, height: 0.5 },
  { x: Number.NaN, y: 0, width: 0.5, height: 0.5 },
]) {
  const result = map(rect);
  assert.equal(result.ok, false, 'invalid preview region must be rejected');
  assert.equal(result.error, 'invalid-region');
}
assert.equal(map(full, { sourceWidth: 0 }).error, 'invalid-geometry');
assert.equal(map(full, { previewHeight: Number.POSITIVE_INFINITY }).error, 'invalid-geometry');
assert.equal(map(full, { objectPosition: { x: 1.1, y: 0.5 } }).error, 'invalid-geometry');

console.log('Scanner preview/source geometry mapping tests passed.');

const geometrySource = await readFile(
  new URL('../src/platform/scanner/scannerGeometry.ts', import.meta.url),
  'utf8',
);
assert.doesNotMatch(geometrySource, /document\\.|window\\.|getBoundingClientRect|HTMLVideoElement/,
  'geometry mapping must remain pure and must not inspect presentation DOM');
