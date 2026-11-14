import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dataService = readFileSync('src/features/data/moduleDataService.ts', 'utf8');
const home = readFileSync('src/features/home/HomeScreen.tsx', 'utf8');
const barcodeLookup = readFileSync('src/features/scanner/services/barcodeLookup.ts', 'utf8');

assert.match(
  dataService,
  /getCachedModuleSnapshots[\\s\\S]*?withStore<CachedModuleSnapshot\\[\\]>\\('readonly', \\(store\\) => store\\.getAll\\(\\)\\)/,
  'Batch snapshot reads must use one readonly getAll request through the shared store helper.',
);
assert.match(
  home,
  /getCachedModuleSnapshots\\(MODULE_DATA_IDS\\)/,
  'Home startup must load its snapshot set through the batch reader.',
);
assert.doesNotMatch(
  home,
  /Promise\\.allSettled\\(MODULE_DATA_IDS\\.map\\(getCachedModuleSnapshot\\)\\)/,
  'Home must not open one IndexedDB connection per snapshot.',
);
assert.match(
  barcodeLookup,
  /getCachedModuleSnapshots\\(lookupSources\\.map\\(\\(\\{ moduleId \\}\\) => moduleId\\)\\)/,
  'Barcode lookup must share the batch snapshot reader.',
);
assert.doesNotMatch(
  barcodeLookup,
  /Promise\\.allSettled\\(lookupSources\\.map\\(\\(\\{ moduleId \\}\\) => getCachedModuleSnapshot\\(moduleId\\)\\)\\)/,
  'Barcode lookup must not open one IndexedDB connection per source.',
);

console.log('PASS: Home and barcode lookup batch IndexedDB snapshot reads.');
