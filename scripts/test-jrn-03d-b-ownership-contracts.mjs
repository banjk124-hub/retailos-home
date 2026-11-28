import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const home = read('../src/features/home/HomeScreen.tsx');
const moduleRegistry = read('../src/features/home/moduleRegistry.ts');
const retailModule = read('../src/shared/domain/retailModule.ts');
const stocktakePage = read('../src/features/stocktake/StocktakePage.tsx');
const importPage = read('../src/features/stocktake-import/StocktakeImportPage.tsx');
const shellContext = read('../src/platform/shell/shellNavigationContext.tsx');
const authenticatedShell = read('../src/platform/shell/AuthenticatedAppShell.tsx');
const activePageHost = read('../src/platform/journey/ActivePageHost.tsx');
const journeyTypes = read('../src/platform/journey/journey.types.ts');
const preflight = read('./preflight.mjs');

// Home is an entry point only: it must not import or mount either Page/coordinator.
assert.doesNotMatch(home, /StocktakePage|StocktakeImportPage|StocktakeModule|StocktakeImportModule/);
assert.match(home, /import type \{ HomeReturnContext \} from '\.\.\/\.\.\/platform\/journey\/journey\.types'/);
assert.match(home, /moduleId: 'stocktake' \| 'stocktake-import'/);
assert.match(retailModule, /'stocktake-import'/);
assert.match(moduleRegistry, /id: 'stocktake',[\s\S]*?availability: 'ready'/);
assert.match(moduleRegistry, /id: 'stocktake-import',[\s\S]*?availability: 'ready'/);
assert.match(moduleRegistry, /type \{ RetailModuleId \}/);

// Capture Home context before closing the library; rejected dispatch restores the same library.
const launcherStart = home.indexOf('const launchFeaturePage = useCallback');
const launcherEnd = home.indexOf('const finishLibraryClose', launcherStart);
assert.notEqual(launcherStart, -1, 'Home launcher must remain explicit and discoverable');
assert.ok(launcherEnd > launcherStart, 'Home launcher must have a bounded callback body');
const launcher = home.slice(launcherStart, launcherEnd);
assert.ok(launcher.indexOf('captureHomeUiState()') < launcher.indexOf('setSelectedLibrary(null)'));
assert.ok(launcher.indexOf('setSelectedLibrary(null)') < launcher.indexOf('journeyController.dispatch'));
assert.match(launcher, /destination: \{ kind: 'feature', moduleId \}/);
assert.match(launcher, /homeReturnContext: homeContext/);
assert.match(launcher, /if \(!accepted\) setSelectedLibrary\(library\)/);
assert.match(launcher, /activeSection,[\s\S]*searchQuery: saved\.search,[\s\S]*scrollY: saved\.scrollY/);
assert.doesNotMatch(launcher, /session|zones|entries|barcode|parser|history|businessData/i);
assert.match(journeyTypes, /export type HomeReturnContext =/);
assert.match(journeyTypes, /activeSection: HomeSectionId;[\s\S]*searchQuery: string;[\s\S]*scrollY: number/);

// Each Page has a unique owner, returns through Journey pop, and owns its feature root.
assert.match(stocktakePage, /useShellNavigationRegistration\('stocktake', navigationConfig\)/);
assert.match(importPage, /useShellNavigationRegistration\('stocktake-import', navigationConfig\)/);
assert.match(stocktakePage, /journey\.dispatch\(\{ kind: 'pop' \}\)/);
assert.match(importPage, /journey\.dispatch\(\{ kind: 'pop' \}\)/);
assert.match(stocktakePage, /<StocktakeModule employee=\{employee\}/);
assert.match(importPage, /<StocktakeImportModule employee=\{employee\}/);
assert.notEqual(
  stocktakePage.match(/useShellNavigationRegistration\('([^']+)'/)?.[1],
  importPage.match(/useShellNavigationRegistration\('([^']+)'/)?.[1],
  'Stocktake and Import must never share a Shell navigation owner',
);

// Owner-scoped cleanup must not clear a newer Page registration after handoff.
assert.match(shellContext, /setRegistration\(\{ owner, config \}\)/);
assert.match(shellContext, /current\?\.owner === owner \? null : current/);
assert.match(shellContext, /return \(\) => unregister\?\.\(owner\)/);
assert.match(shellContext, /context\.registration\.config/);

// Persistent navigation is a Shell sibling of ActivePageHost, not a child of a Page.
const hostIndex = authenticatedShell.indexOf('<ActivePageHost');
const navigationIndex = authenticatedShell.indexOf('<PersistentShellNavigation');
assert.ok(hostIndex >= 0 && navigationIndex > hostIndex, 'Persistent navigation must render after the Page host');
assert.match(authenticatedShell, /<ShellNavigationProvider>[\s\S]*<JourneyControllerProvider>/);
assert.match(authenticatedShell, /<ActivePageHost[\s\S]*?<\/ActivePageHost>/);
assert.match(authenticatedShell, /<PersistentShellNavigation platform=\{platform\} \/>/);
assert.match(activePageHost, /<Page \{\.\.\.props\} homeReturnContext=\{homeReturnContext\} \/>/);
assert.match(preflight, /test-jrn-03d-b-ownership-contracts\.mjs/);

console.log('JRN-03D-B Home launcher, Page ownership, Home return context and Shell handoff contracts passed.');
