import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dataService = readFileSync('src/features/data/moduleDataService.ts', 'utf8');
const home = readFileSync('src/features/home/HomeScreen.tsx', 'utf8');
const homeSnapshotHook = readFileSync('src/features/home/hooks/useHomeSnapshotNotices.ts', 'utf8');
const barcodeLookup = readFileSync('src/features/scanner/services/barcodeLookup.ts', 'utf8');
const downloadFile = readFileSync('src/shared/downloadFile.ts', 'utf8');
const stocktakeExport = readFileSync('src/features/stocktake/services/stocktakeExport.ts', 'utf8');
const dock = readFileSync('src/shared/navigation/LiquidDock.tsx', 'utf8');
const stocktakeImport = readFileSync('src/features/stocktake-import/components/StocktakeImportModule.tsx', 'utf8');
const exportFormats = readFileSync('src/features/data/exportFormats.ts', 'utf8');

assert.ok(dataService.includes('export async function getCachedModuleSnapshots('), 'The shared batch reader must be exported.');
assert.ok(dataService.includes('async function withTransaction<T>('), 'The batch reader must reuse the shared transaction lifecycle.');
assert.ok(dataService.includes('uniqueModuleIds.map((moduleId) =>'), 'The batch reader must fetch only the requested keys, not every stored snapshot.');
assert.ok(home.includes('useHomeSnapshotNotices()') && homeSnapshotHook.includes('getCachedModuleSnapshots(HOME_NOTICE_MODULE_IDS)'), 'Home startup must read only its three notice sources through the batch reader.');
assert.ok(!home.includes('Promise.allSettled(MODULE_DATA_IDS.map(getCachedModuleSnapshot))'), 'Home must not read unrelated module snapshots.');
assert.ok(barcodeLookup.includes('getCachedModuleSnapshots(lookupSources.map(({ moduleId }) => moduleId))'), 'Barcode lookup must share the batch reader.');
assert.ok(!barcodeLookup.includes('Promise.allSettled(lookupSources.map(({ moduleId }) => getCachedModuleSnapshot(moduleId)))'), 'Barcode lookup must not open one IndexedDB connection per source.');

assert.ok(!home.includes('StocktakeImportModule') && !home.includes('isStocktakeImportOpen'), 'Home must not own the Stocktake Import Page mount.');
assert.ok(home.includes("destination: { kind: 'feature', moduleId }"), 'Home must dispatch the selected ready feature through the typed Journey contract.');
assert.ok(home.includes("moduleId: 'stocktake' | 'stocktake-import'") && home.includes("module.id === 'stocktake'"), 'Home must preserve the canonical Stocktake Page route through the shared typed launcher.');
assert.ok(home.includes('homeReturnContext: homeContext'), 'Home must capture its return context before leaving.');
assert.ok(!home.includes('isStocktakeOpen') && !home.includes('MemoizedStocktakeModule'), 'Home must no longer own the Stocktake Page mount.');
assert.ok(home.includes('const MemoizedBarcodeScanner = memo((props: React.ComponentProps<typeof BarcodeScanner>)'), 'The scanner presentation must be memoized.');
assert.ok(home.includes('const HOME_DOCK_ITEMS = navItems.map('), 'The dock item list must have stable identity.');
assert.ok(home.includes('const HOME_DOCK_ITEMS = navItems.map('), 'Dock navigation items must have stable identity.');
assert.ok(home.includes('const openBarcodeScanner = useCallback('), 'The scanner dock action callback must be stable.');
assert.ok(home.includes('const dockAction = useMemo('), 'The scanner dock action object must have stable identity.');
assert.ok(home.includes('action: dockAction'), 'The persistent Shell registration must receive the stable scanner action object.');
assert.ok(home.includes("useShellNavigationRegistration('home'"), 'Home must register its navigation model with the persistent Shell.');
assert.ok(dock.includes('export const LiquidDock = memo('), 'LiquidDock must remain memoized at its component boundary.');


assert.ok(home.includes('const handleBarcodeDetected = useCallback('), 'Barcode callback must remain stable for the memoized scanner.');
assert.ok(home.includes('const closeBarcodeScanner = useCallback('), 'Scanner close callback must remain stable.');

assert.ok(downloadFile.includes('URL.createObjectURL(blob)'), 'The shared download helper must own object URL creation.');
assert.ok(downloadFile.includes('URL.revokeObjectURL(url)'), 'The shared download helper must own object URL cleanup.');
for (const [name, source] of [
  ['Stocktake export', stocktakeExport],
  ['Stocktake Import', stocktakeImport],
  ['Snapshot export', exportFormats],
]) {
  assert.ok(source.includes("from '../../../shared/downloadFile'") || source.includes("from '../../shared/downloadFile'"), `${name} must use the shared download helper.`);
  assert.ok(!source.includes('URL.createObjectURL('), `${name} must not duplicate object URL lifecycle code.`);
}
assert.ok(stocktakeImport.includes('downloadFile(blob, fileName, 1500)'), 'Stocktake Import must preserve its existing longer URL cleanup delay.');

console.log('PASS: Home render isolation and batched IndexedDB snapshot reads.');
