import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const source = async (path) => readFile(new URL(path, root), 'utf8');

const [
  session,
  hook,
  homeScanner,
  stocktakeScanner,
  cameraService,
  factory,
  decoderIntegration,
  benchmarkHarness,
  preflight,
] = await Promise.all([
  source('src/platform/scanner/universalScannerSession.ts'),
  source('src/features/scanner/hooks/useScannerEngine.ts'),
  source('src/features/scanner/components/BarcodeScanner.tsx'),
  source('src/features/stocktake/components/StocktakeScanner.tsx'),
  source('src/shared/services/cameraSession.ts'),
  source('src/platform/scanner/decoders/decoderFactory.ts'),
  source('scripts/test-scanner-decoder-integration.mjs'),
  source('scripts/test-scanner-benchmark-harness.mjs'),
  source('scripts/preflight.mjs'),
]);

// Production Home must not install a console collector or mount a diagnostic event viewer.
assert.doesNotMatch(await source('src/features/home/HomeScreen.tsx'), /scannerDiagnosticCollector|ScannerQaMonitor|installScannerDiagnosticCollector/);
assert.doesNotMatch(await source('src/features/home/components/SettingsHub.tsx'), /Scanner QA Monitor|onOpenScannerQa/);

// One camera owner, one session boundary, shared by Home and Stocktake.
assert.match(cameraService, /navigator\.mediaDevices\.getUserMedia/);
assert.match(session, /acquireCameraLease/);
assert.doesNotMatch(hook, /navigator\.mediaDevices\.getUserMedia/);
assert.doesNotMatch(homeScanner, /navigator\.mediaDevices\.getUserMedia/);
assert.doesNotMatch(stocktakeScanner, /navigator\.mediaDevices\.getUserMedia/);
assert.match(hook, /new UniversalScannerSession/);
assert.match(hook, /new ScannerPageLifecycleCoordinator/);
assert.match(hook, /automaticHealthRecoveryAttemptsRef\.current >= 1/,
  'automatic health recovery must remain bounded to one attempt per session');

// Both feature surfaces use the same scanner session and current feature-owned ROI.
for (const [name, feature] of [['Home', homeScanner], ['Stocktake', stocktakeScanner]]) {
  assert.match(feature, /useScannerEngine\(/, `${name} must use the shared scanner hook`);
  assert.match(feature, /useScannerPreviewRegionBinding\(/, `${name} must map its own reticle ROI`);
  assert.match(feature, /onRegionChange: scanner\.setScanRegion/,
    `${name} must publish its current source-frame ROI`);
  assert.match(feature, /enabled: scanner\.isScanning && !isClosing/,
    `${name} must stop ROI publishing while closing`);
  assert.match(feature, /onDetected: \(value\) =>/,
    `${name} must keep the result callback at the feature boundary`);
}

// SC-02/03/04 and adaptive runtime must coexist in the same production session.
assert.match(session, /ScannerCameraHealthController/);
assert.match(session, /cameraHealth\.start\(/);
assert.match(session, /cameraHealth\.frame\(/);
assert.match(session, /cameraHealth\.tick\(/);
assert.match(session, /onFocusQuality: \(sample\) => this\.handleFocusQuality/);
assert.match(session, /focusQualityMonitor\.observe/);
assert.match(session, /focusRecoveryAction: 'wait-native-autofocus'/);
assert.match(session, /cameraConstraintWriteBudget: 0/);
assert.match(session, /adaptiveRuntimeController\.getBudget\(\)/);
assert.match(session, /adaptiveRuntimeController\.observe\(/);
assert.match(session, /processingBudget,/);
assert.match(session, /region\.geometryVersion < this\.latestGeometryVersion/,
  'stale geometry revisions must be rejected at the session boundary');
assert.match(session, /temporalFrameBuffer\.clear\(\)/,
  'ROI revision changes must invalidate temporal candidates');


// Real WASM integration fixtures and benchmark harness must stay preflight-gated
// and privacy-preserving (no camera acquisition or exported decoded payload).
assert.match(decoderIntegration, /zxingWasmDecoder\.ts/, 'fixture harness loads the production WASM adapter source');
assert.match(decoderIntegration, /expected/, 'decoder fixture suite asserts known expected outputs');
assert.match(benchmarkHarness, /doesNotMatch\(main, \/getUserMedia/);
assert.match(benchmarkHarness, /exported result rows must not contain decoded payload values/);
assert.match(preflight, /test-scanner-sc05-integration\.mjs/);

console.log('Scanner SC-05 cross-layer integration contract tests passed.');
