import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/features/home/HomeScreen.tsx', import.meta.url), 'utf8');
const push = readFileSync(new URL('../src/features/home/hooks/useHomePushNotifications.ts', import.meta.url), 'utf8');
const updates = readFileSync(new URL('../src/features/home/hooks/useHomeUpdateNoticeCount.ts', import.meta.url), 'utf8');
const viewport = readFileSync(new URL('../src/features/home/hooks/useHomeSpotlightViewport.ts', import.meta.url), 'utf8');

assert.match(home, /useHomePushNotifications\(\)/);
assert.match(home, /useHomeUpdateNoticeCount\(\)/);
assert.match(home, /useHomeSpotlightViewport\(\)/);
assert.doesNotMatch(home, /requestDeviceAccess|subscribeForPushNotifications|UPDATE_CENTER_CHANGED_EVENT|getPendingUpdateNoticeCount/);
assert.match(push, /requestDeviceAccess\('notifications'\)/);
assert.match(push, /subscribeForPushNotifications\(\)/);
assert.match(updates, /UPDATE_CENTER_CHANGED_EVENT/);
assert.match(updates, /removeEventListener\('storage'/);
assert.match(viewport, /matchMedia\('\(max-width: 700px\)'\)/);
assert.match(viewport, /removeEventListener\('change'/);

console.log('UI-02E Home composition ownership contract tests passed.');
