import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dataService = readFileSync('src/features/data/moduleDataService.ts', 'utf8');
const home = readFileSync('src/features/home/HomeScreen.tsx', 'utf8');
const barcodeLookup = readFileSync('src/features/scanner/services/barcodeLookup.ts', 'utf8');

assert.ok(dataService.includes('export async function getCachedModuleSnapshots('), 'The shared batch reader must be exported.');
assert.ok(dataService.includes("(store) => store.getAll()"), 'The batch reader must use one IndexedDB getAll request.');
assert.ok(home.includes('getCachedModuleSnapshots(MODULE_DATA_IDS)'), 'Home startup must use the batch reader.');
assert.ok(!home.includes('Promise.allSettled(MODULE_DATA_IDS.map(getCachedModuleSnapshot))'), 'Home must not open one IndexedDB connection per snapshot.');
assert.ok(barcodeLookup.includes('getCachedModuleSnapshots(lookupSources.map(({ moduleId }) => moduleId))'), 'Barcode lookup must share the batch reader.');
assert.ok(!barcodeLookup.includes('Promise.allSettled(lookupSources.map(({ moduleId }) => getCachedModuleSnapshot(moduleId)))'), 'Barcode lookup must not open one IndexedDB connection per source.');

assert.ok(home.includes('const MemoizedStocktakeModule = memo(StocktakeModule)'), 'The expensive Stocktake tree must be memoized.');
assert.ok(home.includes('const MemoizedStocktakeImportModule = memo(StocktakeImportModule)'), 'The Stocktake Import tree must be memoized.');
assert.ok(home.includes('const MemoizedBarcodeScanner = memo(BarcodeScanner)'), 'The scanner presentation must be memoized.');
assert.ok(home.includes('const MemoizedLiquidDock = memo(LiquidDock)'), 'The navigation dock must be memoized.');
assert.ok(home.includes('const closeStocktake = useCallback(() => setIsStocktakeOpen(false), []);'), 'Stocktake close callback must remain stable.');
assert.ok(home.includes('const closeStocktakeImport = useCallback(() => setIsStocktakeImportOpen(false), []);'), 'Stocktake Import close callback must remain stable.');
assert.ok(home.includes('const handleBarcodeDetected = useCallback('), 'Barcode callback must remain stable for the memoized scanner.');
assert.ok(home.includes('const closeBarcodeScanner = useCallback('), 'Scanner close callback must remain stable.');

console.log('PASS: Home render isolation and batched IndexedDB snapshot reads.');
