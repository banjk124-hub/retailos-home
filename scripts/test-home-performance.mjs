import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [service, rules, home, library, engine, registry, homeState, dock, packageJson, packageLock] = await Promise.all([
  read('../src/features/data/moduleDataService.ts'),
  read('../src/features/home/snapshotNoticeRules.ts'),
  read('../src/features/home/HomeScreen.tsx'),
  read('../src/features/home/components/HomeModuleLibrarySection.tsx'),
  read('../src/features/home/components/ModuleLibraryEngine.tsx'),
  read('../src/features/home/moduleRegistry.ts'),
  read('../src/features/home/homeStateStore.ts'),
  read('../src/shared/navigation/LiquidDock.tsx'),
  read('../package.json'),
  read('../package-lock.json'),
]);

const transactionHelper = service.slice(service.indexOf('async function withTransaction'), service.indexOf('\nasync function withStore'));
const batchReader = service.slice(service.indexOf('export async function getCachedModuleSnapshots'), service.indexOf('\nfunction putCachedSnapshot'));
assert.match(transactionHelper, /database\.transaction\(SNAPSHOT_STORE, mode\)/);
assert.match(transactionHelper, /transaction\.oncomplete/);
assert.match(transactionHelper, /transaction\.onabort/);
assert.match(batchReader, /withTransaction\('readonly'/);
assert.match(batchReader, /new Set\(moduleIds\)/);
assert.match(batchReader, /store\.get\(moduleId\)/);
assert.doesNotMatch(batchReader, /openDatabase|database\.transaction|getAll\(/);
assert.equal((service.match(/database\.transaction\(/g) ?? []).length, 1, 'IndexedDB transaction creation must have one shared lifecycle owner.');

assert.match(rules, /HOME_NOTICE_MODULE_IDS:[\s\S]*?'inventory'[\s\S]*?'product-dates'[\s\S]*?'sales'/);
assert.match(rules, /function countRows\(/);
assert.doesNotMatch(rules, /readRows\([^)]*\)\.filter/);
assert.match(home, /getCachedModuleSnapshots\(HOME_NOTICE_MODULE_IDS\)/);
assert.doesNotMatch(home, /MODULE_DATA_IDS\.map\(getCachedModuleSnapshot\)/);
assert.doesNotMatch(home, /setInterval\(updateCalendar,\s*60_000\)/);
assert.match(home, /nextMidnight/);
assert.match(home, /visibilitychange/);
assert.equal((home.match(/window\.addEventListener\('scroll'/g) ?? []).length, 1);
assert.match(home, /<HomeModuleLibrarySection/);
assert.doesNotMatch(home, /filteredModules|visibleLibraries|MODULE_REGISTRY/);
assert.match(home, /const \[initialUiState\] = useState\(readHomeUiState\)/);
assert.doesNotMatch(registry, /function getModulesForLibrary\(/);
assert.doesNotMatch(homeState, /activeFilter/);
assert.match(library, /export const HomeModuleLibrarySection = memo\(/);
assert.match(library, /useState\(initialSearch\)/);
assert.match(engine, /export const ModuleLibraryEngine = memo\(/);
assert.match(dock, /export const LiquidDock = memo\(/);

const pkg = JSON.parse(packageJson);
const lock = JSON.parse(packageLock);
assert.equal(pkg.devDependencies?.['@playwright/test'], '^1.64.1', 'Keep Playwright until a maintained browser QA replacement exists.');
assert.equal(lock.packages?.['node_modules/@playwright/test']?.version, '1.64.1');
assert.equal(lock.packages?.['node_modules/playwright']?.version, '1.64.1');
assert.equal(lock.packages?.['node_modules/playwright-core']?.version, '1.64.1');

const javascript = ts.transpile(rules, { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 });
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(javascript).toString('base64');
const { calculateSnapshotNotices } = await import(moduleUrl);
const now = new Date(2026, 10, 14, 12);
const snapshots = [
  { moduleId: 'inventory', version: '1', snapshotDate: '2026-11-14', cachedAt: '', data: [
    { quantity: 2, minimumQuantity: 3 }, { stock: 1, reorderPoint: 1 },
    { quantity: 8, minimumQuantity: 2 }, null, { quantity: '1', minimumQuantity: 2 },
  ] },
  { moduleId: 'product-dates', version: '1', snapshotDate: '2026-11-14', cachedAt: '', data: [
    { expiryDate: '2026-11-14' }, { expirationDate: '2026-11-21' },
    { expiryDate: '2026-11-22' }, { expiryDate: 'not-a-date' }, {},
  ] },
  { moduleId: 'sales', version: '1', snapshotDate: '2026-11-14', cachedAt: '', data: [
    { salesAmount: 90, salesTarget: 100 }, { amount: 50, target: 40 },
    { salesAmount: '10', salesTarget: 20 }, null,
  ] },
];
const notices = calculateSnapshotNotices(snapshots, now);
assert.deepEqual(notices.map((notice) => notice.id), ['low-stock', 'product-dates', 'sales-target']);
assert.match(notices[0].summary, /2 mặt hàng/);
assert.match(notices[1].summary, /2 mặt hàng/);
assert.match(notices[2].summary, /1 chỉ tiêu/);
assert.deepEqual(calculateSnapshotNotices([], now), []);
console.log('Home performance contracts and snapshot-notice regression tests passed.');
