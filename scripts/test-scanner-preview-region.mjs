import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const compileModule = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;

const geometrySource = await readFile(
  new URL('../src/platform/scanner/scannerGeometry.ts', import.meta.url),
  'utf8',
);
const geometryUrl = 'data:text/javascript;base64,' + Buffer.from(compileModule(geometrySource)).toString('base64');

const serviceSource = await readFile(
  new URL('../src/features/scanner/services/scannerPreviewRegion.ts', import.meta.url),
  'utf8',
);
const serviceJs = compileModule(serviceSource).replace(
  "from '../../../platform/scanner/scannerGeometry';",
  `from '${geometryUrl}'`,
);
const serviceUrl = 'data:text/javascript;base64,' + Buffer.from(serviceJs).toString('base64');
const { measureScannerPreviewRegion } = await import(serviceUrl);

const closeTo = (actual, expected, message, epsilon = 1e-6) => {
  assert.ok(Math.abs(actual - expected) <= epsilon,
    `${message}: expected ${expected}, received ${actual}`);
};

const home = measureScannerPreviewRegion({
  videoRect: { left: 20, top: 30, width: 390, height: 844 },
  reticleRect: { left: 51.2, top: 215.68, width: 327.6, height: 472.64 },
  sourceWidth: 1280,
  sourceHeight: 720,
  objectFit: 'cover',
  objectPosition: '50% 50%',
  transform: 'none',
});
assert.ok(home, 'Home reticle must resolve to a source ROI');
closeTo(home.rect.x, 0.39083234597, 'Home source x');
closeTo(home.rect.y, 0.22, 'Home source y');
closeTo(home.rect.width, 0.21833530806, 'Home source width');
closeTo(home.rect.height, 0.56, 'Home source height');

const stocktake = measureScannerPreviewRegion({
  videoRect: { left: 10, top: 40, width: 360, height: 450 },
  reticleRect: { left: 46, top: 166, width: 288, height: 198 },
  sourceWidth: 1280,
  sourceHeight: 720,
  objectFit: 'cover',
  objectPosition: '50% 50%',
  transform: 'none',
});
assert.ok(stocktake, 'Stocktake reticle must resolve to a source ROI');
closeTo(stocktake.rect.x, 0.32, 'Stocktake source x');
closeTo(stocktake.rect.y, 0.28, 'Stocktake source y');
closeTo(stocktake.rect.width, 0.36, 'Stocktake source width');
closeTo(stocktake.rect.height, 0.44, 'Stocktake source height');

// A reticle is clipped to the actual visible image content; letterbox is never ROI.
const letterboxOutside = measureScannerPreviewRegion({
  videoRect: { left: 0, top: 0, width: 800, height: 400 },
  reticleRect: { left: 0, top: 0, width: 30, height: 100 },
  sourceWidth: 1280,
  sourceHeight: 720,
  objectFit: 'contain',
  objectPosition: '50% 50%',
  transform: 'none',
});
assert.equal(letterboxOutside, null, 'reticle entirely inside letterbox must fail closed');

const containedFull = measureScannerPreviewRegion({
  videoRect: { left: 0, top: 0, width: 800, height: 400 },
  reticleRect: { left: 0, top: 0, width: 800, height: 400 },
  sourceWidth: 1280,
  sourceHeight: 720,
  objectFit: 'contain',
  objectPosition: '50% 50%',
  transform: 'none',
});
assert.ok(containedFull, 'full reticle must intersect contained image content');
closeTo(containedFull.rect.x, 0, 'contain clipped source x');
closeTo(containedFull.rect.y, 0, 'contain clipped source y');
closeTo(containedFull.rect.width, 1, 'contain clipped source width');
closeTo(containedFull.rect.height, 1, 'contain clipped source height');

// CSS horizontal mirroring is inverted; unsupported transforms never guess.
const mirrored = measureScannerPreviewRegion({
  videoRect: { left: 0, top: 0, width: 400, height: 500 },
  reticleRect: { left: 0, top: 100, width: 80, height: 300 },
  sourceWidth: 1280,
  sourceHeight: 720,
  objectFit: 'cover',
  objectPosition: '50% 50%',
  transform: 'matrix(-1, 0, 0, 1, 0, 0)',
});
assert.ok(mirrored);
closeTo(mirrored.rect.x, 0.635, 'mirrored source x');
closeTo(mirrored.rect.width, 0.09, 'mirrored source width');

assert.equal(measureScannerPreviewRegion({
  videoRect: { left: 0, top: 0, width: 400, height: 500 },
  reticleRect: { left: 0, top: 100, width: 80, height: 300 },
  sourceWidth: 1280,
  sourceHeight: 720,
  objectFit: 'cover',
  objectPosition: '10px 20px',
  transform: 'none',
}), null, 'unsupported object-position must fail closed');

assert.equal(measureScannerPreviewRegion({
  videoRect: { left: 0, top: 0, width: 400, height: 500 },
  reticleRect: { left: 0, top: 100, width: 80, height: 300 },
  sourceWidth: 1280,
  sourceHeight: 720,
  objectFit: 'cover',
  objectPosition: '50% 50%',
  transform: 'matrix(0, 1, -1, 0, 0, 0)',
}), null, 'rotation/skew must not be misinterpreted as horizontal mirroring');

assert.equal(measureScannerPreviewRegion({
  videoRect: { left: 0, top: 0, width: 400, height: 500 },
  reticleRect: { left: 0, top: 100, width: 80, height: 300 },
  sourceWidth: 1280,
  sourceHeight: 720,
  objectFit: 'cover',
  objectPosition: '50% 50%',
  transform: 'matrix(0.94, 0, 0, 0.94, 0, 0)',
}), null, 'video-only scale transform must fail closed because the reticle is a sibling');

assert.equal(measureScannerPreviewRegion({
  videoRect: { left: 0, top: 0, width: 0, height: 500 },
  reticleRect: { left: 0, top: 100, width: 80, height: 300 },
  sourceWidth: 1280,
  sourceHeight: 720,
  objectFit: 'cover',
  objectPosition: '50% 50%',
  transform: 'none',
}), null, 'zero-sized video must fail closed');

// Verify that this DOM-free measurement service stays independent of browser globals.
assert.doesNotMatch(serviceSource, /\b(?:window|document)\s*(?:\.|\?\.)|getBoundingClientRect|HTMLVideoElement/);

// Verify the live region contract is an in-place state update, not a session restart.
const contractSource = await readFile(
  new URL('../src/platform/scanner/contracts.ts', import.meta.url),
  'utf8',
);
const sessionSource = await readFile(
  new URL('../src/platform/scanner/universalScannerSession.ts', import.meta.url),
  'utf8',
);
const engineSource = await readFile(
  new URL('../src/features/scanner/hooks/useScannerEngine.ts', import.meta.url),
  'utf8',
);
assert.match(contractSource, /setScanRegion\(region: ScannerSourceScanRegion \| null\): void/);
assert.match(engineSource, /sessionRef\.current\?\.setScanRegion\(region\)/);

const setter = sessionSource.match(/setScanRegion\(region:[\s\S]*?\n  \}\n\n  getScanRegion/);
assert.ok(setter, 'session must expose source-region setter and getter');
assert.doesNotMatch(setter[0], /startInternal|createDecoder|scheduleNextFrame|suspend\(|resume\(|close\(/,
  'region updates must not restart camera, decoder or frame loop');

const homeComponent = await readFile(
  new URL('../src/features/scanner/components/BarcodeScanner.tsx', import.meta.url),
  'utf8',
);
const stocktakeComponent = await readFile(
  new URL('../src/features/stocktake/components/StocktakeScanner.tsx', import.meta.url),
  'utf8',
);
assert.match(homeComponent, /ref=\{reticleRef\} className="barcode-scan-frame"/);
assert.match(stocktakeComponent, /ref=\{reticleRef\} className="stocktake-scanner-reticle"/);
assert.match(homeComponent, /useScannerPreviewRegionBinding/);
assert.match(stocktakeComponent, /useScannerPreviewRegionBinding/);

console.log('Scanner module-owned preview region mapping and in-place update tests passed.');
