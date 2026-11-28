import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const home = read('../src/features/home/HomeScreen.tsx');
const homeNavigation = read('../src/features/home/hooks/useHomeNavigation.ts');
const host = read('../src/platform/journey/ActivePageHost.tsx');
const registry = read('../src/platform/journey/journeyPageRegistry.tsx');
const page = read('../src/features/stocktake/StocktakePage.tsx');
const moduleSource = read('../src/features/stocktake/components/StocktakeModule.tsx');
const presentation = read('../src/features/stocktake/components/StocktakePresentation.tsx');
const workspaceCss = read('../src/features/stocktake/components/stocktake.css');
const scanner = read('../src/features/stocktake/components/StocktakeScanner.tsx');
const exitGate = read('../src/features/stocktake/services/stocktakeScannerExitGate.ts');
const store = read('../src/features/stocktake/services/stocktakeLocalStore.ts');
const preflight = read('./preflight.mjs');

// Home launches the Page via the canonical typed destination and captures only transient UI context.
assert.match(home, /destination: \{ kind: 'feature', moduleId: 'stocktake' \}/);
assert.match(home, /homeReturnContext: homeContext/);
assert.match(home, /activeSection/);
assert.match(home, /searchQuery: saved\.search/);
assert.match(homeNavigation, /scrollY: Math\.max\(0, window\.scrollY\)/);
assert.match(home, /captureHomeUiState\(\)/);
assert.match(homeNavigation, /captureHomeUiState = useCallback/);
assert.match(homeNavigation, /saveHomeUiState\(state\)/);
assert.match(home, /homeReturnContext\.activeSection/);
assert.doesNotMatch(home, /isStocktakeOpen|MemoizedStocktakeModule|lazy\(\(\) => import\('\.\.\/stocktake\/components\/StocktakeModule'\)\)/);
assert.match(home, /isStocktakeImportOpen/, 'Stocktake Import remains in Home until JRN-03C.');
assert.match(host, /homeReturnContext = destination\.kind === 'home'/);
assert.match(host, /<Page \{\.\.\.props\} homeReturnContext=\{homeReturnContext\} \/>/);
assert.match(registry, /stocktake: StocktakePage/);
assert.match(registry, /module\?\.availability === 'ready' && Boolean\(FEATURE_PAGES\[destination\.moduleId\]\)/);

// Stocktake is a real Page; the persistent Shell navigation remains registered by the active Page.
assert.match(page, /useShellNavigationRegistration\('stocktake'/);
assert.match(page, /activeId: 'stocktake'/);
assert.match(page, /journey\.dispatch\(\{ kind: 'pop' \}\)/);
assert.match(page, /<main className="app-shell has-shell-navigation stocktake-page-shell">/);
assert.match(page, /<StocktakeModule employee=\{employee\} onClose=\{returnHome\} platform=\{platform\}/);

// Exit guard covers the existing PWA safety state and preserves the camera shutdown gate.
assert.match(moduleSource, /registerExitGuard\('stocktake', exitGuard\)/);
assert.match(moduleSource, /if \(state\.busy\)[\s\S]*resolution: 'wait'/);
assert.match(moduleSource, /waitForSafeExit/);
assert.match(moduleSource, /busyExitWaitersRef\.current\.forEach\(\(resolve\) => resolve\(\)\)/);
assert.match(moduleSource, /busyExitWaitersRef\.current\.clear\(\)/);
assert.match(moduleSource, /action: 'ZONE_PAUSED',[\s\S]*?await logStocktakeAction/);
assert.match(moduleSource, /if \(state\.scannerOpen\)[\s\S]*resolution: 'stay'/);
assert.match(moduleSource, /if \(state\.pendingZone \|\| state\.showClearConfirm\)[\s\S]*resolution: 'stay'/);
assert.match(moduleSource, /state\.editingEntry \|\| state\.manualEntry \|\| state\.barcode\.trim\(\)/);
assert.match(moduleSource, /window\.confirm\([\s\S]*nội dung nhập hoặc chỉnh sửa chưa lưu/);
assert.match(moduleSource, /registerPwaUpdateBlocker\('stocktake'/);
assert.match(moduleSource, /useBodyScrollLock\(scannerOpen \|\| Boolean\(pendingZone\) \|\| showClearConfirm\)/);
assert.doesNotMatch(moduleSource, /useBodyScrollLock\(true\)/);
assert.match(moduleSource, /cameraLeaseRequestRef\.current\?\.cancel\(\)/);
assert.match(scanner, /new StocktakeScannerExitGate/);
assert.match(scanner, /completePresentation/);
assert.match(exitGate, /completePresentation/);

// Page semantics replace modal framing; nested scanner/confirmation surfaces remain feature-owned overlays.
assert.doesNotMatch(presentation, /className="stocktake-panel" role="dialog"|aria-modal="true" aria-labelledby="stocktake-title"/);
assert.match(presentation, /className="stocktake-confirm-backdrop"/);
assert.match(presentation, /aria-modal="true" aria-labelledby="stocktake-replace-title"/);
assert.match(workspaceCss, /\.stocktake-backdrop\{position:relative;z-index:auto;inset:auto/);
assert.match(workspaceCss, /\.stocktake-page-workspace/);
assert.doesNotMatch(workspaceCss, /\.stocktake-backdrop\{position:fixed/);

// Business persistence remains the existing feature-owned store; no schema rewrite.
assert.match(moduleSource, /stocktakeStore\.putSession/);
assert.match(moduleSource, /stocktakeStore\.putZone/);
assert.match(moduleSource, /stocktakeStore\.putEntry/);
assert.match(moduleSource, /stocktakeStore\.putExport/);
assert.match(store, /indexedDB/);
assert.match(preflight, /test-jrn-03b-stocktake-page\.mjs/);

console.log('JRN-03B Stocktake Page ownership, exit guard, return context and scanner lifecycle contracts passed.');
