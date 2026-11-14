import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync('src/features/home/HomeScreen.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const stocktake = readFileSync('src/features/stocktake/components/StocktakeModule.tsx', 'utf8');
const stocktakeImport = readFileSync('src/features/stocktake-import/components/StocktakeImportModule.tsx', 'utf8');
const scannerQa = readFileSync('src/features/home/components/ScannerQaMonitor.tsx', 'utf8');
const mobileStyles = readFileSync('src/styles/mobile-tuning.css', 'utf8');
const motionStyles = readFileSync('src/shared/motion/motion.css', 'utf8');
const homeStyles = readFileSync('src/styles/home.css', 'utf8');
const responsiveStyles = readFileSync('src/styles/responsive.css', 'utf8');
const loginStyles = readFileSync('src/styles/login-experience.css', 'utf8');

assert.doesNotMatch(home, /Suspense\s+fallback=\{null\}/, 'Lazy-loaded UI must never disappear silently while its chunk is loading.');
assert.doesNotMatch(app, /Suspense\s+fallback=\{<div className="retailos-interface" aria-busy="true" \/>\}/, 'The root HomeScreen lazy boundary must not render a blank shell.');
assert.match(app, /home-loading-surface[\s\S]*aria-busy="true"/, 'The root HomeScreen lazy boundary must show immediate visible feedback.');
assert.equal((home.match(/fallback=\{<ModuleLoadingSurface/g) ?? []).length, 5, 'Settings, QA, scanner settings, Stocktake and Stocktake Import must provide immediate visible loading feedback.');
assert.match(home, /function ModuleLoadingSurface[\s\S]*aria-busy="true"/, 'The shared loading fallback must be an accessible, visible busy surface.');
assert.doesNotMatch(home, /isChromeIdle|scheduleChromeHide|hidden=\{isChromeIdle\}/, 'Primary navigation and header actions must not require a wake-up tap before they can receive a click.');
assert.doesNotMatch(mobileStyles, /chrome-hidden/, 'CSS must not disable pointer events on primary navigation after an idle timeout.');
assert.doesNotMatch(motionStyles, /animation-delay:\s*var\(--motion-stagger-short\)/, 'Shared page and dock entry motion must start in the first rendered frame.');
assert.doesNotMatch(homeStyles, /home-enter-active[^}]*animation-delay/, 'Home content must not wait for stagger timers before its entry animation starts.');
assert.doesNotMatch(responsiveStyles, /animation:panel-in\s+[^;]*\s\.1s\s/, 'The mobile login panel must not wait before its entry animation starts.');
assert.match(loginStyles, /animation: identity-panel-reveal[^;]*both/, 'The identity panel must start its reveal animation immediately.');
assert.doesNotMatch(loginStyles, /animation: identity-panel-reveal[^;]*\s(?:\d+(?:\.\d+)?|\.\d+)(?:ms|s)\s+both/, 'The identity panel must not have a pre-animation delay.');
assert.doesNotMatch(mobileStyles, /animation-delay/, 'Interactive Home cards and notices must not have pre-animation stagger delays.');
const topbarMotionStart = mobileStyles.indexOf('@keyframes topbar-dock-float');
const topbarMotionEnd = mobileStyles.indexOf('@media (max-width: 700px)', topbarMotionStart);
const topbarMotion = mobileStyles.slice(topbarMotionStart, topbarMotionEnd);
assert.ok(topbarMotionStart >= 0 && topbarMotionEnd > topbarMotionStart, 'Topbar ambient motion keyframes must remain present.');
assert.doesNotMatch(topbarMotion, /box-shadow|background-position/, 'Topbar ambient motion must remain on composited properties rather than repaint-heavy box-shadow/background-position changes.');
assert.match(stocktake, /const currentEntries = entries;/, 'Stocktake active entries must reuse the already scoped and sorted state snapshot.');
assert.doesNotMatch(stocktake, /entries\.filter\(\(entry\) => entry\.zoneId === currentZone\?\.id\)\.sort/, 'Stocktake must not filter and sort the active entries again on every render.');
assert.match(stocktakeImport, /const invalidCount = useMemo\(/, 'Stocktake Import row validation must not be recomputed on unrelated UI renders.');
assert.match(stocktakeImport, /const invalidZones = useMemo\(/, 'Stocktake Import cross-zone validation must not be recomputed on unrelated UI renders.');
assert.match(scannerQa, /const \{ accepted, errors, maxDuration \} = useMemo\(/, 'Scanner QA summary calculations must be memoized independently of filter/copy state.');
assert.match(scannerQa, /const ScannerQaEventRow = memo\(/, 'Existing diagnostic rows must not re-render when a new event is appended.');
assert.match(scannerQa, /filtered\.map\(\(event\) => <ScannerQaEventRow/, 'Scanner QA must render diagnostics through memoized event rows.');

function blockBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing block: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `Missing end marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

const beginZone = blockBetween(stocktake, 'const beginZone = async', 'const resumeZone = async');
assert.ok(beginZone.indexOf('setBusy(true)') < beginZone.indexOf('await '), 'Starting a zone must show immediate busy feedback before storage work.');
assert.match(beginZone, /finally\s*\{\s*setBusy\(false\)/, 'Starting a zone must always release the busy state.');

const resumeZone = blockBetween(stocktake, 'const resumeZone = async', 'const submitZone = async');
assert.ok(resumeZone.indexOf('setBusy(true)') < resumeZone.indexOf('await '), 'Resuming a zone must show immediate busy feedback before storage work.');
assert.match(resumeZone, /finally\s*\{\s*setBusy\(false\)/, 'Resuming a zone must always release the busy state.');

const saveEntry = blockBetween(stocktake, 'const saveEntry = async', 'const editEntry =');
assert.ok(saveEntry.indexOf('setBusy(true)') < saveEntry.indexOf('await '), 'Saving an entry must show immediate feedback before storage work.');
assert.match(saveEntry, /finally\s*\{\s*setBusy\(false\)/, 'Saving an entry must always release the busy state.');

const removeEntry = blockBetween(stocktake, 'const removeEntry = async', 'const openReview = async');
assert.ok(removeEntry.indexOf('setBusy(true)') < removeEntry.indexOf('await '), 'Deleting an entry must show immediate feedback before storage work.');
assert.match(removeEntry, /finally\s*\{\s*setBusy\(false\)/, 'Deleting an entry must always release the busy state.');

const openReview = blockBetween(stocktake, 'const openReview = async', 'const exportCurrentZone = async');
assert.ok(openReview.indexOf('setBusy(true)') < openReview.indexOf('await '), 'Opening review must acknowledge the tap before storage work.');
assert.match(openReview, /finally\s*\{\s*setBusy\(false\)/, 'Opening review must always release the busy state.');

const exportZone = blockBetween(stocktake, 'const exportCurrentZone = async', 'const clearAll = async');
assert.ok(exportZone.indexOf('setBusy(true)') < exportZone.indexOf('await '), 'Exporting a zone must show immediate feedback before storage work.');
assert.match(exportZone, /finally\s*\{\s*setBusy\(false\)/, 'Exporting a zone must always release the busy state.');

const clearAll = blockBetween(stocktake, 'const clearAll = async', 'const downloadPreviousExport');
assert.ok(clearAll.indexOf('setBusy(true)') < clearAll.indexOf('await stocktakeStore.clearAll()'), 'Clearing Stocktake must show feedback before clearing storage.');
assert.match(clearAll, /finally\s*\{\s*setBusy\(false\)/, 'Clearing Stocktake must always release the busy state.');

console.log('UI interaction immediacy contract tests passed.');
