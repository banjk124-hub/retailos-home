import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const home = await readFile(new URL('../src/features/home/HomeScreen.tsx', import.meta.url), 'utf8');
const main = await readFile(new URL('../src/main.tsx', import.meta.url), 'utf8');
const exportFormats = await readFile(new URL('../src/features/data/exportFormats.ts', import.meta.url), 'utf8');
const stocktakeImport = await readFile(new URL('../src/features/stocktake-import/components/StocktakeImportModule.tsx', import.meta.url), 'utf8');
const stocktakeImportParser = await readFile(new URL('../src/features/stocktake-import/services/stocktakeImportParser.ts', import.meta.url), 'utf8');
const vite = await readFile(new URL('../vite.config.ts', import.meta.url), 'utf8');
const scannerSession = await readFile(new URL('../src/platform/scanner/universalScannerSession.ts', import.meta.url), 'utf8');
const scannerDecoderFactory = await readFile(new URL('../src/platform/scanner/decoders/decoderFactory.ts', import.meta.url), 'utf8');
const bundleReport = await readFile(new URL('./report-bundle.mjs', import.meta.url), 'utf8');

assert.match(app, /lazy\(\(\) => import\('\.\/features\/home\/HomeScreen'\)\)/);
assert.doesNotMatch(app, /import HomeScreen from/);
for (const component of [
  'BarcodeScanner', 'StocktakeModule', 'StocktakeImportModule',
  'ScannerQaMonitor', 'SettingsHub', 'ScannerSettingsPanel'
]) {
  assert.match(home, new RegExp('const ' + component + ' = lazy\\('));
}
assert.doesNotMatch(home, /import (?:BarcodeScanner|StocktakeModule|StocktakeImportModule|ScannerQaMonitor|SettingsHub|ScannerSettingsPanel) from/);
assert.match(exportFormats, /await import\('jszip'\)/);
assert.match(exportFormats, /await import\('pptxgenjs'\)/);
assert.doesNotMatch(stocktakeImport, /import JSZip from 'jszip'/, 'Stocktake Import must not eagerly load JSZip when the module opens.');
assert.match(stocktakeImport, /async function createZipArchive[\s\S]*?await import\('jszip'\)/);
assert.doesNotMatch(stocktakeImportParser, /import JSZip from 'jszip'/, 'The workbook parser must not statically include JSZip.');
assert.match(stocktakeImportParser, /import type JSZip from 'jszip'/);
assert.match(stocktakeImportParser, /Promise\.all\(\[import\('jszip'\), file\.arrayBuffer\(\)\]\)/, 'Workbook bytes and the deferred ZIP decoder should load concurrently.');
assert.match(vite, /manifest:\s*true/);
assert.match(vite, /retailosPwaArtifacts/);
assert.doesNotMatch(main, /styles\/(?:home|login-experience|scanner-qa-monitor|scanner-settings)/);
assert.doesNotMatch(scannerSession, /zxingDecoder/,
  'the platform session must not depend on the concrete decoder implementation');
assert.match(scannerSession, /this\.decoderFactory\.create\(\)/,
  'the platform session must create decoders through the injected factory contract');
assert.match(scannerDecoderFactory, /await import\('\.\/zxingWasmDecoder'\)/,
  'the production factory must keep the ZXing-C++ WASM decoder in a deferred chunk');
assert.match(scannerDecoderFactory, /new ZXingWasmDecoderAdapter\(\)/,
  'the deferred production decoder chunk must instantiate the WASM adapter');
assert.doesNotMatch(scannerDecoderFactory, /zxingDecoder|ZXingDecoderAdapter/,
  'the production factory must not retain the legacy JS selection path');
assert.ok(
  scannerSession.indexOf('this.options.onPreviewReady?.()')
    < scannerSession.indexOf('await this.createDecoder(generation)'),
  'camera preview must be published before the deferred decoder factory call',
);
assert.match(bundleReport, /function measureStaticClosure/);
assert.match(bundleReport, /filter\(\(item\) => item\.isDynamicEntry\)/);
assert.match(bundleReport, /chunkRaw: entry\.raw/);
assert.match(bundleReport, /incrementalRaw/);
assert.match(bundleReport, /initialStaticKeys/,
  'lazy feature transfer must exclude eager dependencies already loaded at startup');
await assert.rejects(access(new URL('../public/sw.js', import.meta.url)), { code: 'ENOENT' }, 'legacy static worker must not remain in public');
console.log('Bundle boundaries and lazy-loading contract tests passed.');
