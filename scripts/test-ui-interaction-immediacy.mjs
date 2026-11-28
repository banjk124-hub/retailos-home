import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync('src/features/home/HomeScreen.tsx', 'utf8');
const library = readFileSync('src/features/home/components/HomeModuleLibrarySection.tsx', 'utf8');
const engine = readFileSync('src/features/home/components/ModuleLibraryEngine.tsx', 'utf8');
const dock = readFileSync('src/shared/navigation/LiquidDock.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const shell = readFileSync('src/platform/shell/AuthenticatedAppShell.tsx', 'utf8');
const pageHost = readFileSync('src/platform/journey/ActivePageHost.tsx', 'utf8');
const pageRegistry = readFileSync('src/platform/journey/journeyPageRegistry.tsx', 'utf8');

assert.doesNotMatch(home, /Suspense\s+fallback=\{null\}/, 'Lazy Home features must not disappear silently while loading.');
assert.match(home, /function ModuleLoadingSurface[\s\S]*role="status" aria-live="polite" aria-busy="true"/);
assert.equal((home.match(/fallback=\{<ModuleLoadingSurface/g) ?? []).length, 2);
assert.match(app, /AuthenticatedAppShell/, 'App delegates authenticated loading composition to the shell.');
assert.match(shell, /<ActivePageHost/);
assert.match(pageHost, /journey-page-loading[\s\S]*aria-busy="true"/);
assert.match(home, /const MemoizedBarcodeScanner = memo\(/);
assert.doesNotMatch(home, /StocktakeImportModule|isStocktakeImportOpen/);
assert.match(home, /launchFeaturePage/);
assert.match(pageRegistry, /'stocktake-import': StocktakeImportPage/);
assert.match(home, /launchFeaturePage/);
assert.doesNotMatch(home, /MemoizedStocktakeModule|isStocktakeOpen/);
assert.match(home, /const MemoizedSettingsHub = memo\(/);
assert.match(home, /const MemoizedScannerSettingsPanel = memo\(/);
assert.match(home, /const HOME_DOCK_ITEMS = navItems\.map\(/);
assert.match(home, /const dockAction = useMemo\(/);
assert.match(home, /action: dockAction/);
assert.match(home, /useShellNavigationRegistration\('home'/);
assert.match(home, /const openBarcodeScanner = useCallback\(/);
assert.match(home, /requestCameraLease\(DEFAULT_SCANNER_CAMERA_REQUEST\)/);
assert.match(home, /const handleBarcodeDetected = useCallback\(/);
assert.match(home, /const closeBarcodeScanner = useCallback\(/);

assert.match(home, /<MemoizedBarcodeScanner/);

assert.match(home, /<MemoizedSettingsHub/);
assert.match(home, /<MemoizedScannerSettingsPanel/);
assert.match(library, /export const HomeModuleLibrarySection = memo\(/);
assert.match(library, /useState\(initialSearch\)/);
assert.match(engine, /export const ModuleLibraryEngine = memo\(/);
assert.match(dock, /export const LiquidDock = memo\(/);
console.log('Home interaction and render-isolation contracts passed.');
