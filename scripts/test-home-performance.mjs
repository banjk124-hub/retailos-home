import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [service, rules, home, dock] = await Promise.all([
  read('../src/features/data/moduleDataService.ts'),
  read('../src/features/home/snapshotNoticeRules.ts'),
  read('../src/features/home/HomeScreen.tsx'),
  read('../src/shared/navigation/LiquidDock.tsx'),
]);

const batchReader = service.slice(
  service.indexOf('export async function getCachedModuleSnapshots'),
  service.indexOf('\nfunction putCachedSnapshot'),
);
assert.match(batchReader, /const database = await openDatabase\(\)/);
assert.match(batchReader, /database\.transaction\(SNAPSHOT_STORE, 'readonly'\)/);
assert.match(batchReader, /store\.get\(moduleId\)/);
assert.doesNotMatch(batchReader, /getAll\(/);

assert.match(home, /getCachedModuleSnapshots\(HOME_NOTICE_MODULE_IDS\)/);
assert.doesNotMatch(home, /MODULE_DATA_IDS\.map\(getCachedModuleSnapshot\)/);
assert.doesNotMatch(home, /setInterval\(updateCalendar,\s*60_000\)/);
assert.match(home, /nextMidnight/);
assert.match(home, /visibilitychange/);
assert.match(home, /items=\{HOME_DOCK_ITEMS\}/);
assert.match(home, /action=\{dockAction\}/);
assert.match(dock, /export const LiquidDock = memo\(function LiquidDock/);

assert.match(rules, /HOME_NOTICE_MODULE_IDS:[\s\S]*?'inventory'[\s\S]*?'product-dates'[\s\S]*?'sales'/);
assert.match(rules, /function countRows\(/);
assert.doesNotMatch(rules, /readRows\([^)]*\)\.filter/);

// Exercise the real notice calculation against representative snapshot shapes.
const javascript = ts.transpile(rules, {
  module: ts.ModuleKind.ESNext,
  target: ts.ScriptTarget.ES2022,
});
const moduleUrl = 'data:text/javascript;base64,' + Buffer.from(javascript).toString('base64');
const { calculateSnapshotNotices } = await import(moduleUrl);
const now = new Date(2026, 10, 14, 12);
const snapshots = [
  {
    moduleId: 'inventory', version: '1', snapshotDate: '2026-11-14', cachedAt: '',
    data: [
      { quantity: 2, minimumQuantity: 3 },
      { stock: 1, reorderPoint: 1 },
      { quantity: 8, minimumQuantity: 2 },
      null,
      { quantity: '1', minimumQuantity: 2 },
    ],
  },
  {
    moduleId: 'product-dates', version: '1', snapshotDate: '2026-11-14', cachedAt: '',
    data: [
      { expiryDate: '2026-11-14' },
      { expirationDate: '2026-11-21' },
      { expiryDate: '2026-11-22' },
      { expiryDate: 'not-a-date' },
      {},
    ],
  },
  {
    moduleId: 'sales', version: '1', snapshotDate: '2026-11-14', cachedAt: '',
    data: [
      { salesAmount: 90, salesTarget: 100 },
      { amount: 50, target: 40 },
      { salesAmount: '10', salesTarget: 20 },
      null,
    ],
  },
];
const notices = calculateSnapshotNotices(snapshots, now);
assert.deepEqual(notices.map((notice) => notice.id), ['low-stock', 'product-dates', 'sales-target']);
assert.match(notices[0].summary, /2 mặt hàng/);
assert.match(notices[1].summary, /2 mặt hàng/);
assert.match(notices[2].summary, /1 chỉ tiêu/);
assert.deepEqual(calculateSnapshotNotices([], now), []);

console.log('Home performance contracts and snapshot-notice regression tests passed.');
