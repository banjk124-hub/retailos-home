import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/mobile-tuning.css', import.meta.url), 'utf8');
const homeCss = readFileSync(new URL('../src/styles/home-ux.css', import.meta.url), 'utf8');
const homeSource = readFileSync(new URL('../src/features/home/HomeScreen.tsx', import.meta.url), 'utf8');

assert.match(css, /\.app-library-backdrop\s*\{[^}]*safe-area-inset-top[^}]*safe-area-inset-right[^}]*safe-area-inset-bottom[^}]*safe-area-inset-left/s,
  'library backdrop must respect all safe-area edges');
assert.match(css, /\.app-library-backdrop\s*\{[^}]*overflow-y:\s*auto/s,
  'library backdrop must remain scrollable when the viewport is shorter than its content');
assert.match(css, /\.app-library-modal\s*\{[^}]*max-height:\s*min\([^}]*100dvh/s,
  'library modal must be bounded by both design limits and the dynamic viewport');
assert.match(css, /\.notice-detail-backdrop\s*\{[^}]*safe-area-inset-top[^}]*safe-area-inset-right[^}]*safe-area-inset-bottom[^}]*safe-area-inset-left/s,
  'notice backdrop must respect all safe-area edges');
assert.match(css, /\.notice-detail-modal\s*\{[^}]*max-height:\s*calc\(100dvh/s,
  'notice modal must fit within the dynamic viewport');
assert.match(css, /\.notice-detail-content\s*\{[^}]*overflow-y:\s*auto/s,
  'long notice content must scroll inside the modal instead of being clipped');
assert.match(css, /\.calendar-modal-backdrop\s*\{[^}]*overflow-y:\s*auto/s,
  'calendar backdrop must remain reachable in short viewports');
assert.match(css, /\.calendar-modal-backdrop\s*\{[^}]*safe-area-inset-right[^}]*safe-area-inset-left/s,
  'calendar backdrop must respect horizontal safe areas in landscape');
assert.match(css, /\.calendar-modal\s*\{[^}]*max-height:\s*calc\(100dvh/s,
  'calendar modal must be bounded by the dynamic viewport');
assert.match(homeCss, /\.barcode-result-backdrop\s*\{[^}]*safe-area-inset-right[^}]*safe-area-inset-left/s,
  'barcode result backdrop must respect horizontal safe areas in landscape');
assert.match(homeSource, /useBodyScrollLock\([\s\S]*?isBarcodeScannerOpen/s,
  'opening the full-screen Home scanner must lock background scrolling');

console.log('PASS cross-platform overlay viewport and content-scroll layout tests');
