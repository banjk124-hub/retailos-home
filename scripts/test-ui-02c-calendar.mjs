import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/features/home/HomeScreen.tsx', import.meta.url), 'utf8');
const hook = readFileSync(new URL('../src/features/home/hooks/useHomeCalendarDates.ts', import.meta.url), 'utf8');

assert.match(home, /useHomeCalendarClock\(\)/);
assert.match(home, /useHomeCalendarDates\(calendarNow, calendarMonth\)/);
assert.doesNotMatch(home, /const calendarWeek = useMemo|const calendarMonthDays = useMemo|const syncCalendarDate/);
assert.match(hook, /length: 7/);
assert.match(hook, /length: 42/);
assert.match(hook, /nextMidnight/);
assert.match(hook, /visibilitychange/);
assert.match(hook, /removeEventListener\('visibilitychange'/);
assert.match(hook, /clearTimeout\(timer\)/);

console.log('UI-02C calendar ownership contract tests passed.');
