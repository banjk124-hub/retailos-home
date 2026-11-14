import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [service, rules, home, dock, librarySection, registry, homeState, homeStyles, homeEngineStyles, homeArchitectureStyles, packageJson, packageLock, themeStyles, interactionStyles, mobileTuningStyles, performanceStyles, adaptiveStyles, responsiveStyles, homeUxStyles, homeRedesignStyles] = await Promise.all([
  read('../src/features/data/moduleDataService.ts'),
  read('../src/features/home/snapshotNoticeRules.ts'),
  read('../src/features/home/HomeScreen.tsx'),
  read('../src/shared/navigation/LiquidDock.tsx'),
  read('../src/features/home/components/HomeModuleLibrarySection.tsx'),
  read('../src/features/home/moduleRegistry.ts'),
  read('../src/features/home/homeStateStore.ts'),
  read('../src/styles/home.css'),
  read('../src/styles/home-engine.css'),
  read('../src/styles/home-architecture.css'),
  read('../package.json'),
  read('../package-lock.json'),
  read('../src/styles/theme.css'),
  read('../src/styles/interactions.css'),
  read('../src/styles/mobile-tuning.css'),
  read('../src/styles/performance.css'),
  read('../src/styles/adaptive-appearance.css'),
  read('../src/styles/responsive.css'),
  read('../src/styles/home-ux.css'),
  read('../src/styles/home-redesign.css'),
]);

const transactionHelper = service.slice(
  service.indexOf('async function withTransaction'),
  service.indexOf('\nasync function withStore'),
);
const batchReader = service.slice(
  service.indexOf('export async function getCachedModuleSnapshots'),
  service.indexOf('\nfunction putCachedSnapshot'),
);





const globalHomeStyles = [themeStyles, interactionStyles, mobileTuningStyles, performanceStyles, adaptiveStyles, responsiveStyles].join('\n');

const homeFeatureStyles = [homeUxStyles, homeRedesignStyles].join('\n');






 \}/, 'Redundant lower-grid breakpoint overrides must not remain.');


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
