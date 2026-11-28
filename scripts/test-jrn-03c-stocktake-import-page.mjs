import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const home = read('../src/features/home/HomeScreen.tsx');
const registry = read('../src/platform/journey/journeyPageRegistry.tsx');
const page = read('../src/features/stocktake-import/StocktakeImportPage.tsx');
const moduleSource = read('../src/features/stocktake-import/components/StocktakeImportModule.tsx');
const presentation = read('../src/features/stocktake-import/components/StocktakeImportPresentation.tsx');
const styles = read('../src/features/stocktake-import/components/stocktake-import.css');
const parser = read('../src/features/stocktake-import/services/stocktakeImportParser.ts');
const session = read('../src/features/stocktake-import/services/stocktakeImportSession.ts');
const store = read('../src/features/stocktake-import/services/stocktakeImportStore.ts');
const preflight = read('./preflight.mjs');

// Home dispatches the stable workflow ID and no longer mounts Import or owns its scroll lock.
assert.match(home, /module\.id === 'stocktake-import'/);
assert.match(home, /launchFeaturePage/);
assert.doesNotMatch(home, /StocktakeImportModule|isStocktakeImportOpen|closeStocktakeImport/);
assert.match(registry, /'stocktake-import': StocktakeImportPage/);
assert.match(registry, /module\?\.availability === 'ready' && Boolean\(FEATURE_PAGES\[destination\.moduleId\]\)/);

// Import Page owns only composition and Shell navigation; coordinator retains feature behavior.
assert.match(page, /useShellNavigationRegistration\('stocktake-import'/);
assert.match(page, /activeId: 'stocktake-import'/);
assert.match(page, /journey\.dispatch\(\{ kind: 'pop' \}\)/);
assert.match(page, /<StocktakeImportModule employee=\{employee\} onClose=\{returnHome\}/);
assert.match(moduleSource, /registerExitGuard\('stocktake-import'/);
assert.match(moduleSource, /registerPwaUpdateBlocker\('stocktake-import'/);

// Active operations wait; pending user decisions stay; dirty or in-memory-only results require explicit discard consent.
assert.match(moduleSource, /state\.busy \|\| state\.historyBusy \|\| state\.historyExportingId/);
assert.match(moduleSource, /resolution: 'wait'/);
assert.match(moduleSource, /waitForSafeExit/);
assert.match(moduleSource, /exitWaitersRef\.current\.forEach\(\(resolve\) => resolve\(\)\)/);
assert.match(moduleSource, /state\.pendingImport \|\| state\.showClearConfirm \|\| state\.showNewSessionConfirm/);
assert.match(moduleSource, /resolution: 'stay'/);
assert.match(moduleSource, /state\.hasDirtyZones \|\| \(state\.result && !state\.historyPersisted\)/);
assert.match(moduleSource, /window\.confirm\([\s\S]*phiên kết quả chưa được lưu vào lịch sử/);
assert.match(moduleSource, /useBodyScrollLock\(Boolean\(pendingImport\) \|\| showClearConfirm \|\| showNewSessionConfirm\)/);

// The Page workspace is non-modal; only pending review and destructive confirmation remain overlays.
assert.match(presentation, /stocktake-import-backdrop stocktake-import-page/);
assert.doesNotMatch(presentation, /className="stocktake-import-panel" role="dialog"|aria-modal="true" aria-labelledby="stocktake-import-title"/);
assert.match(presentation, /role="alertdialog"/);
assert.match(styles, /JRN-03C: Stocktake Import is a Page workspace/);

// Preserve parser precision, conflict semantics, history format and dedicated IndexedDB store.
assert.match(parser, /parseStocktakeWorkbook/);
assert.match(session, /mergeStocktakeImportSession/);
assert.match(session, /detectStocktakeImportConflicts/);
assert.match(store, /DATABASE_NAME = 'retailos-stocktake-import'/);
assert.match(store, /indexedDB/);
assert.match(moduleSource, /buildStocktakeOutput/);
assert.match(moduleSource, /downloadText/);
assert.match(moduleSource, /createZipArchive/);
assert.match(moduleSource, /saveResult/);
assert.match(moduleSource, /restoreHistoryItem/);
assert.match(preflight, /test-jrn-03c-stocktake-import-page\.mjs/);

console.log('JRN-03C Stocktake Import Page ownership, exit guard, persistence and output contracts passed.');
