import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [platform, registry, scanner, library] = await Promise.all([
  read('../src/shared/platform/platformCapabilities.ts'),
  read('../src/features/home/moduleRegistry.ts'),
  read('../src/features/scanner/services/scannerCapabilities.ts'),
  read('../src/features/home/components/HomeModuleLibrarySection.tsx'),
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
assert.doesNotMatch(library, /isScannerSupportedDevice|matchMedia|innerWidth|userAgent/,
  'module discovery must not infer workflow policy from viewport or device heuristics');
console.log('Owner-confirmed platform capability matrix and registry contract passed.');
