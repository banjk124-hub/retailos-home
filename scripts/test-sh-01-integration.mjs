import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const appShell = read('../src/platform/shell/AuthenticatedAppShell.tsx');
const app = read('../src/App.tsx');
const home = read('../src/features/home/HomeScreen.tsx');
const homeRoot = read('../src/platform/home/HomePresentationRoot.tsx');
const desktopRoot = read('../src/platform/home/presentations/DesktopHomePresentation.tsx');
const mobileRoot = read('../src/platform/home/presentations/MobileHomePresentation.tsx');
const tabletRoot = read('../src/platform/home/presentations/TabletHomeCompatibilityPresentation.tsx');
const policy = read('../src/shared/platform/platformCapabilities.ts');
const navigation = read('../src/shared/navigation/ShellNavigation.tsx');

assert.equal((app.match(/<AuthenticatedAppShell/g) || []).length, 1);
assert.match(appShell, /<ActivePageHost[\s\S]*platform=\{platform\}/);
assert.match(appShell, /<JourneyControllerProvider>/);
assert.match(home, /const \[initialUiState\] = useState\(readHomeUiState\)/);
assert.match(home, /useHomeNavigation\(/);
assert.match(home, /useHomeBarcodeLookup\(/);
assert.match(home, /MemoizedStocktakeModule/);
assert.match(home, /MemoizedStocktakeImportModule/);
assert.doesNotMatch(home, /DesktopHomeScreen|MobileHomeScreen|DesktopHomeState|MobileHomeState/);
assert.match(homeRoot, /<DesktopHomePresentation>/);
assert.match(homeRoot, /<MobileHomePresentation>/);
assert.match(homeRoot, /<TabletHomeCompatibilityPresentation>/);
assert.match(desktopRoot, /data-retailos-platform="desktop"/);
assert.match(mobileRoot, /data-retailos-platform="mobile"/);
assert.match(tabletRoot, /data-retailos-platform="tablet"/);
assert.match(policy, /cameraBarcodeScanner: MOBILE_ONLY_WITH_TABLET_REVIEW/);
assert.match(navigation, /platform === 'desktop'/);
assert.match(navigation, /platform === 'mobile'/);
assert.match(navigation, /return <TabletShellNavigation/);

console.log('SH-01D shared-state and platform-isolation integration contract tests passed.');
