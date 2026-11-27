import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [platform, registry, scanner, library, stocktake, home] = await Promise.all([
  read('../src/shared/platform/platformCapabilities.ts'),
  read('../src/features/home/moduleRegistry.ts'),
  read('../src/features/scanner/services/scannerCapabilities.ts'),
  read('../src/features/home/components/HomeModuleLibrarySection.tsx'),
  read('../src/features/stocktake/components/StocktakeModule.tsx'),
  read('../src/features/home/HomeScreen.tsx'),
]);

assert.match(platform, /desktop: 'available',[\s\S]*tablet: 'review-required',[\s\S]*mobile: 'available'/);
assert.match(platform, /desktop: 'not-offered',[\s\S]*tablet: 'review-required',[\s\S]*mobile: 'available'/);
assert.match(platform, /cameraBarcodeScanner: MOBILE_ONLY_WITH_TABLET_REVIEW/);
assert.match(platform, /manualBarcodeLookup: SHARED_DESKTOP_MOBILE/);
assert.match(platform, /settingsAndUpdateCenter: SHARED_DESKTOP_MOBILE/);
assert.match(platform, /pushNotifications: RUNTIME_DEPENDENT_ALL_PLATFORMS/);
assert.match(registry, /platformAvailability: PlatformAvailability/);
assert.equal((registry.match(/platformAvailability: SHARED_DESKTOP_MOBILE/g) ?? []).length, 9,
  'all nine existing Home workflows must be explicitly shared on Desktop and Mobile');
assert.match(registry, /availability: 'integrating'/);
assert.match(registry, /availability: 'ready'/);
assert.match(registry, /workStatus\?/,
  'platform availability must remain separate from engineering readiness/work status');
assert.match(scanner, /CAMERA_SCANNER_PLATFORM_AVAILABILITY = PLATFORM_CAPABILITY_POLICY\.cameraBarcodeScanner/);
assert.match(scanner, /isScannerSupportedDevice/);
assert.match(stocktake, /CAMERA_SCANNER_PLATFORM_AVAILABILITY\[platform\] === 'available' && isScannerSupportedDevice\(\)/,
  'Stocktake camera scanner must combine Mobile-only product policy with runtime device support');
assert.match(stocktake, /if \(!scannerCapabilityAvailable \|\| scannerOpen\) return;/,
  'Stocktake camera-open action must fail closed when policy/runtime support is absent');
assert.match(stocktake, /scannerOverlay = scannerOpen && screen === 'scan' && scannerCapabilityAvailable/,
  'Stocktake must not mount a camera surface outside the allowed capability');
assert.match(stocktake, /CAMERA_SCANNER_PLATFORM_AVAILABILITY\[platform\] !== 'available'[\s\S]*?cameraLeaseRequestRef\.current\?\.cancel\(\)[\s\S]*?setScannerOpen\(false\)/,
  'Leaving an allowed platform must cancel and close an active Stocktake camera session');
assert.match(home, /MemoizedStocktakeModule employee=\{employee\} onClose=\{closeStocktake\} platform=\{platform\}/,
  'Home must pass the resolved platform into the Stocktake capability boundary');
assert.doesNotMatch(library, /isScannerSupportedDevice|matchMedia|innerWidth|userAgent/,
  'module discovery must not infer workflow policy from viewport or device heuristics');
console.log('Owner-confirmed platform capability matrix and registry contract passed.');
