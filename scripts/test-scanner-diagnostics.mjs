import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const collectorSource = await read('../src/features/scanner/services/scannerDiagnosticCollector.ts');
const compiled = ts.transpileModule(collectorSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64');
const collector = await import(moduleUrl);

const originalInfo = console.info;
const originalWarn = console.warn;
console.info = () => undefined;
console.warn = () => undefined;
const uninstall = collector.installScannerDiagnosticCollector();
try {
  console.info('[RetailOS Scanner] Multi-format diagnostics', {
    decoder: 'zxing-retail-linear-roi',
    frames: 24,
    roiUnavailable: 2,
    roiWidth: 340,
    roiHeight: 180,
    roiSourceScale: 0.75,
    rotationAttempts: 20,
    rotationHits: 3,
    deskewAttempts: 34,
    deskewEstimateMisses: 7,
    deskewHits: 4,
    scaleAttempts: 3,
    scaleHits: 1,
    lastScaleFactor: 2,
    focusSharpness: 21.5,
    focusSharpnessMin: 8.25,
    focusEdgeCoverage: 0.12,
    focusMotionScore: 2.5,
    focusQualitySamples: 10,
    focusSustainedBlurEvents: 1,
    focusQualityStatus: 'sustained-blur-observed',
    cameraControlChanged: false,
    lastDeskewAngleDegrees: -17.25,
    barcodePayload: 'MUST_NOT_BE_RETAINED',
    deviceId: 'MUST_NOT_BE_RETAINED',
  });

  const [event] = collector.getScannerDiagnosticSnapshot();
  assert.equal(event.category, 'Multi-format diagnostics');
  for (const [key, expected] of Object.entries({
    roiUnavailable: 2,
    roiWidth: 340,
    roiHeight: 180,
    roiSourceScale: 0.75,
    rotationAttempts: 20,
    rotationHits: 3,
    deskewAttempts: 34,
    deskewEstimateMisses: 7,
    deskewHits: 4,
    scaleAttempts: 3,
    scaleHits: 1,
    lastScaleFactor: 2,
    focusSharpness: 21.5,
    focusSharpnessMin: 8.25,
    focusEdgeCoverage: 0.12,
    focusQualitySamples: 10,
    focusSustainedBlurEvents: 1,
    focusQualityStatus: 'sustained-blur-observed',
    cameraControlChanged: false,
    lastDeskewAngleDegrees: -17.25,
  })) {
    assert.equal(event.metrics[key], expected, `diagnostic collector retains ${key}`);
  }
  assert.equal('barcodePayload' in event.metrics, false, 'barcode payload-like keys are rejected');
  assert.equal('deviceId' in event.metrics, false, 'camera identifiers are rejected');

  const exported = JSON.parse(collector.exportScannerDiagnostics());
  assert.equal(exported.eventCount, 1);
  assert.equal(exported.events[0].metrics.rotationHits, 3);
  assert.equal(exported.events[0].metrics.deskewHits, 4);
  assert.equal(exported.events[0].metrics.scaleAttempts, 3);
  assert.equal(exported.events[0].metrics.scaleHits, 1);
  assert.equal(exported.events[0].metrics.lastScaleFactor, 2);
  assert.equal(exported.events[0].metrics.roiSourceScale, 0.75);
  assert.equal(exported.events[0].metrics.focusSharpness, 21.5);
  assert.equal(exported.events[0].metrics.focusMotionScore, 2.5);
  assert.equal(exported.events[0].metrics.focusSustainedBlurEvents, 1);
  assert.equal(exported.events[0].metrics.cameraControlChanged, false);
  assert.equal(JSON.stringify(exported).includes('MUST_NOT_BE_RETAINED'), false,
    'export must not contain fields outside the diagnostic allowlist');
} finally {
  uninstall();
  console.info = originalInfo;
  console.warn = originalWarn;
}

const qaMonitor = await read('../src/features/home/components/ScannerQaMonitor.tsx');
for (const key of [
  'roiUnavailable', 'roiWidth', 'roiHeight', 'roiSourceScale', 'rotationAttempts', 'rotationHits',
  'deskewAttempts', 'deskewEstimateMisses', 'deskewHits', 'scaleAttempts', 'scaleHits', 'lastScaleFactor', 'focusSharpness', 'focusSharpnessMin', 'focusEdgeCoverage', 'focusMotionScore', 'focusQualitySamples', 'focusSustainedBlurEvents', 'focusQualityStatus', 'cameraControlChanged', 'lastDeskewAngleDegrees',
]) {
  assert.ok(qaMonitor.includes(key), `QA Monitor displays/exports ${key}`);
}

console.log('Scanner recovery diagnostics allowlist, QA Monitor and privacy regression tests passed.');
