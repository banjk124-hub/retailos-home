import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const app = read('../src/App.tsx');
const shell = read('../src/platform/shell/AuthenticatedAppShell.tsx');

assert.match(app, /readSession\(\)/);
assert.match(app, /saveSession\(session\)/);
assert.match(app, /clearSession\(\)/);
assert.match(app, /registerPwaUpdateBlocker\('app-transition'/);
assert.match(app, /notifyPwaUpdateSafetyChanged\(\)/);
assert.match(app, /releaseCameraStream\(\)/);
assert.match(app, /clearCachedModuleData\(\)/);
assert.match(app, /<AuthenticatedAppShell/);
assert.doesNotMatch(shell, /sessionStore|updateSafety|releaseCameraStream|clearCachedModuleData/);
assert.match(shell, /const HomeScreen = lazy\(\(\) => import\('\.\.\/\.\.\/features\/home\/HomeScreen'\)\)/);
assert.match(shell, /journey === 'identity'/);
assert.match(shell, /<Suspense fallback=\{<HomeLoadingSurface \/>\}>/);
assert.match(shell, /onBootReady=\{onBootReady\}/);
assert.match(shell, /platform=\{platform\}/);

console.log('SH-01B authenticated shell ownership contract tests passed.');
