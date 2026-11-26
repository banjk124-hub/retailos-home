import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/features/home/HomeScreen.tsx', import.meta.url), 'utf8');
const hook = readFileSync(new URL('../src/features/home/hooks/useHomeSnapshotNotices.ts', import.meta.url), 'utf8');

assert.match(home, /useHomeSnapshotNotices\(\)/);
assert.doesNotMatch(home, /getCachedModuleSnapshots|MODULE_SNAPSHOTS_UPDATED_EVENT|setPriorityNotices|setSnapshotNoticeStatus/);
assert.match(hook, /getCachedModuleSnapshots\(HOME_NOTICE_MODULE_IDS\)/);
assert.match(hook, /calculateSnapshotNotices\(snapshots\)/);
assert.match(hook, /snapshots\.length === 0 \? 'empty' : 'ready'/);
assert.match(hook, /'unavailable'/);
assert.match(hook, /isCurrent/);
assert.match(hook, /removeEventListener\(MODULE_SNAPSHOTS_UPDATED_EVENT/);

console.log('UI-02B snapshot notice ownership contract tests passed.');
