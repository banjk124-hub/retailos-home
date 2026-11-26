import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const moduleSource = await read('../src/features/stocktake/components/StocktakeModule.tsx');
const scannerSource = await read('../src/features/stocktake/components/StocktakeScanner.tsx');
const workspaceCss = await read('../src/features/stocktake/components/stocktake.css');
const scannerCss = await read('../src/features/stocktake/components/stocktake-scanner-presentation.css');
const storeSource = await read('../src/features/stocktake/services/stocktakeLocalStore.ts');
const exitGateSource = await read('../src/features/stocktake/services/stocktakeScannerExitGate.ts');

// Presentation ownership: workspace and scanner remain distinct feature surfaces.
assert.match(moduleSource, /import '\.\/stocktake\.css'/);
assert.match(scannerSource, /import '\.\/stocktake-scanner-presentation\.css'/);
assert.match(scannerSource, /import '\.\.\/\.\.\/scanner\/scanner-shared-controls\.css'/);
assert.doesNotMatch(workspaceCss, /\.stocktake-scanner-(surface|heading|preview|message|reticle|instruction)/,
  'workspace stylesheet must not own scanner surface presentation');
assert.match(scannerCss, /\.stocktake-scanner-preview/);
assert.match(scannerCss, /\.stocktake-scanner-reticle/);
assert.match(scannerCss, /prefers-reduced-motion/);

// Overlay and content panel must have separate geometry and responsibilities.
assert.match(workspaceCss, /\.stocktake-backdrop\{position:fixed;z-index:120;inset:0/);
assert.match(workspaceCss, /\.stocktake-panel\{width:min\(100%,720px\);max-height:min\(92dvh,900px\);overflow:auto/);
assert.match(workspaceCss, /\.stocktake-confirm-backdrop\{position:fixed;z-index:140;inset:0/);
assert.match(workspaceCss, /\.stocktake-confirm\{width:min\(100%,460px\)/);
assert.match(moduleSource, /className="stocktake-backdrop"/);
assert.match(moduleSource, /className="stocktake-panel"/);
assert.match(moduleSource, /className="stocktake-confirm-backdrop"/);
assert.match(moduleSource, /className="stocktake-confirm"/);

// Operational contracts remain in the feature coordinator and local store.
assert.match(moduleSource, /registerPwaUpdateBlocker\('stocktake'/);
assert.match(moduleSource, /stocktakeStore\.putSession/);
assert.match(moduleSource, /stocktakeStore\.putZone/);
assert.match(moduleSource, /stocktakeStore\.putEntry/);
assert.match(moduleSource, /stocktakeStore\.putExport/);
assert.match(moduleSource, /Barcode trùng nhau được giữ nguyên thành các dòng riêng/);
assert.match(moduleSource, /STOCKTAKE_LIST_PAGE_SIZE = 100/);
assert.match(storeSource, /indexedDB/);
assert.match(exitGateSource, /completePresentation/);
assert.match(scannerSource, /new StocktakeScannerExitGate/);
assert.match(scannerSource, /useScannerEngine/);

console.log('UI-04D Stocktake presentation ownership and workflow boundary tests passed.');
