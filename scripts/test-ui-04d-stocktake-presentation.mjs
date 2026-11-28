import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const moduleSource = await read('../src/features/stocktake/components/StocktakeModule.tsx');
const presentationSource = await read('../src/features/stocktake/components/StocktakePresentation.tsx');
const scannerSource = await read('../src/features/stocktake/components/StocktakeScanner.tsx');
const workspaceCss = await read('../src/features/stocktake/components/stocktake.css');
const scannerCss = await read('../src/features/stocktake/components/stocktake-scanner-presentation.css');
const storeSource = await read('../src/features/stocktake/services/stocktakeLocalStore.ts');
const exitGateSource = await read('../src/features/stocktake/services/stocktakeScannerExitGate.ts');

// The coordinator owns workflow state and operations; the presentation owns view markup and CSS.
assert.match(moduleSource, /import StocktakePresentation, \{ type StocktakeScreen \} from '\.\/StocktakePresentation'/);
assert.doesNotMatch(moduleSource, /import '\.\/stocktake\.css'/);
assert.doesNotMatch(moduleSource, /className="stocktake-backdrop"|className="stocktake-panel"/,
  'workflow coordinator must not own the workspace presentation markup');
assert.match(presentationSource, /import '\.\/stocktake\.css'/);
assert.match(presentationSource, /export default function StocktakePresentation/);
assert.match(presentationSource, /model,\s*actions/);
assert.match(presentationSource, /screen === 'home'/);
assert.match(presentationSource, /screen === 'scan'/);
assert.match(presentationSource, /screen === 'review'/);
assert.match(presentationSource, /screen === 'history'/);
assert.match(presentationSource, /screen === 'exports'/);
assert.match(presentationSource, /className="stocktake-backdrop"/);
assert.match(presentationSource, /className="stocktake-panel"/);
assert.match(presentationSource, /\{scannerOverlay\}/, 'camera overlay remains inside the Stocktake workspace stacking context');
assert.match(moduleSource, /scannerOverlay = scannerOpen && screen === 'scan'/, 'coordinator owns scanner overlay lifecycle visibility');
assert.match(moduleSource, /scannerOverlay=\{scannerOverlay\}/, 'coordinator hands the live scanner surface to the presentation owner');

// Workspace and scanner remain separate presentation surfaces.
assert.match(scannerSource, /import '\.\/stocktake-scanner-presentation\.css'/);
assert.match(scannerSource, /import '\.\.\/\.\.\/scanner\/scanner-shared-controls\.css'/);
assert.doesNotMatch(workspaceCss, /\.stocktake-scanner-(surface|heading|preview|message|reticle|instruction)/,
  'workspace stylesheet must not own scanner surface presentation');
assert.match(scannerCss, /\.stocktake-scanner-preview/);
assert.match(scannerCss, /\.stocktake-scanner-reticle/);
assert.match(scannerCss, /prefers-reduced-motion/);

// The Page workspace and its nested confirmation surfaces retain separate geometry.
assert.match(workspaceCss, /\.stocktake-backdrop\{position:relative;z-index:auto;inset:auto/);
assert.match(workspaceCss, /\.stocktake-page-workspace/);
assert.match(workspaceCss, /\.stocktake-panel\{width:min\(100%,920px\);max-height:none/);
assert.match(workspaceCss, /\.stocktake-confirm-backdrop\{position:fixed;z-index:140;inset:0/);
assert.match(workspaceCss, /\.stocktake-confirm\{width:min\(100%,460px\)/);
assert.match(presentationSource, /className="stocktake-backdrop"/);
assert.match(presentationSource, /className="stocktake-panel"/);
assert.match(presentationSource, /className="stocktake-confirm-backdrop"/);
assert.match(presentationSource, /className="stocktake-confirm"/);

// Operational contracts remain in the coordinator, local store and scanner lifecycle.
assert.match(moduleSource, /registerPwaUpdateBlocker\('stocktake'/);
assert.match(moduleSource, /registerExitGuard\('stocktake'/);
assert.match(moduleSource, /waitForSafeExit/);
assert.match(moduleSource, /useBodyScrollLock\(scannerOpen \|\| Boolean\(pendingZone\) \|\| showClearConfirm\)/);
assert.doesNotMatch(moduleSource, /useBodyScrollLock\(true\)/);
assert.doesNotMatch(presentationSource, /className="stocktake-panel" role="dialog"|aria-modal="true" aria-labelledby="stocktake-title"/);
assert.match(moduleSource, /stocktakeStore\.putSession/);
assert.match(moduleSource, /stocktakeStore\.putZone/);
assert.match(moduleSource, /stocktakeStore\.putEntry/);
assert.match(moduleSource, /stocktakeStore\.putExport/);
assert.match(presentationSource, /Barcode trùng nhau được giữ nguyên thành các dòng riêng/);
assert.match(presentationSource, /Revision này đã xuất file và được khóa/);
assert.match(moduleSource, /STOCKTAKE_LIST_PAGE_SIZE = 100/);
assert.match(storeSource, /indexedDB/);
assert.match(exitGateSource, /completePresentation/);
assert.match(scannerSource, /new StocktakeScannerExitGate/);
assert.match(scannerSource, /useScannerEngine/);

console.log('UI-04D Stocktake presentation and workflow ownership tests passed.');
