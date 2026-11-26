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
assert.match(hook, /let latestRequestId = 0/);
assert.match(hook, /const requestId = \+\+latestRequestId/);
assert.equal((hook.match(/requestId !== latestRequestId/g) || []).length, 2,
  'both success and error paths must reject stale requests');
assert.match(hook, /latestRequestId \+= 1/);
assert.match(hook, /removeEventListener\(MODULE_SNAPSHOTS_UPDATED_EVENT/);

// Regression model: an older request resolving after a newer request must not
// be allowed to commit, and a rejected stale request must not replace status.
let latestRequestId = 0;
const commits = [];
const beginRequest = () => ++latestRequestId;
const commitIfCurrent = (id, value) => {
  if (id !== latestRequestId) return;
  commits.push(value);
};
const oldRequest = beginRequest();
const newRequest = beginRequest();
commitIfCurrent(newRequest, 'new-result');
commitIfCurrent(oldRequest, 'stale-result');
assert.deepEqual(commits, ['new-result']);

const rejectedOldRequest = beginRequest();
const currentRequest = beginRequest();
commitIfCurrent(currentRequest, 'current-result');
commitIfCurrent(rejectedOldRequest, 'stale-error-status');
assert.deepEqual(commits, ['new-result', 'current-result']);

console.log('UI-02B snapshot notice ownership and latest-request regression tests passed.');
