import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const controller = read('../src/platform/journey/journeyController.ts');
const provider = read('../src/platform/journey/JourneyControllerProvider.tsx');
const registry = read('../src/platform/journey/journeyPageRegistry.tsx');
const host = read('../src/platform/journey/ActivePageHost.tsx');
const shell = read('../src/platform/shell/AuthenticatedAppShell.tsx');
const preflight = read('./preflight.mjs');

assert.match(controller, /export class JourneyController/);
assert.match(controller, /INITIAL_STACK:[\s\S]*kind: 'home'/);
assert.match(controller, /kind === 'push'/);
assert.match(controller, /kind === 'pop'/);
assert.match(controller, /kind === 'replace'/);
assert.match(controller, /isSameJourneyDestination/);
assert.match(controller, /registerExitGuard/);
assert.match(controller, /waitForSafeExit/);
assert.match(controller, /this\.exitGuard\?\.owner === owner/);
assert.match(controller, /isJourneyDestinationResolvable/);
assert.match(provider, /useSyncExternalStore/);
assert.match(registry, /module\?\.availability === 'ready'/);
assert.match(registry, /Boolean\(FEATURE_PAGES\[destination\.moduleId\]\)/);
assert.match(host, /<AppErrorBoundary key=\{pageKey\}/);
assert.match(host, /<Suspense fallback=\{<PageLoadingSurface \/>\}>/);
assert.match(host, /Shell và phiên làm việc vẫn được giữ nguyên/);
assert.match(shell, /<JourneyControllerProvider>/);
assert.match(shell, /<ActivePageHost/);
assert.match(shell, /<PersistentShellNavigation platform=\{platform\} \/>/);
assert.doesNotMatch(shell, /BrowserRouter|createBrowserRouter|useNavigate/);

console.log('JRN-03A Journey Controller and Page Host contract tests passed.');
