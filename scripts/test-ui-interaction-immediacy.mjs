import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync('src/features/home/HomeScreen.tsx', 'utf8');
const moduleLibrary = readFileSync('src/features/home/components/ModuleLibraryEngine.tsx', 'utf8');
const homeModuleLibrary = readFileSync('src/features/home/components/HomeModuleLibrarySection.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const stocktake = readFileSync('src/features/stocktake/components/StocktakeModule.tsx', 'utf8');
const stocktakeStyles = readFileSync('src/features/stocktake/components/stocktake.css', 'utf8');
const stocktakeImport = readFileSync('src/features/stocktake-import/components/StocktakeImportModule.tsx', 'utf8');
const scannerQa = readFileSync('src/features/home/components/ScannerQaMonitor.tsx', 'utf8');
const mobileStyles = readFileSync('src/styles/mobile-tuning.css', 'utf8');
const motionStyles = readFileSync('src/shared/motion/motion.css', 'utf8');
const homeStyles = readFileSync('src/styles/home.css', 'utf8');
const homeUxStyles = readFileSync('src/styles/home-ux.css', 'utf8');
const responsiveStyles = readFileSync('src/styles/responsive.css', 'utf8');
const performanceStyles = readFileSync('src/styles/performance.css', 'utf8');
const loginStyles = readFileSync('src/styles/login-experience.css', 'utf8');




const topbarMotionEnd = mobileStyles.indexOf('@media (max-width: 700px)', topbarMotionStart);
const topbarMotion = mobileStyles.slice(topbarMotionStart, topbarMotionEnd);

const stocktakeExport = blockBetween(stocktake, 'const exportCurrentZone = async', 'const clearAll = async');
assert.ok(stocktakeExport.indexOf('setBusy(true)') < stocktakeExport.indexOf('await yieldToNextPaint()'), 'Stocktake export must publish its busy state before building the file.');
assert.ok(stocktakeExport.indexOf('await yieldToNextPaint()') < stocktakeExport.indexOf('createStocktakeFile('), 'Stocktake export must yield a paint before synchronous file generation.');
assert.match(stocktake, /visibleReviewEntries\.map/, 'Stocktake review must render only the current bounded slice.');
assert.match(stocktake, /visibleHistoryLogs\.map/, 'Stocktake history must render only the current bounded slice.');
assert.doesNotMatch(stocktake, /currentEntries\.map\(/, 'Stocktake review must not mount every row at once.');
assert.doesNotMatch(stocktake, /entries\.filter\(\(entry\) => entry\.zoneId === currentZone\?\.id\)\.sort/, 'Stocktake must not filter and sort the active entries again on every render.');
assert.match(stocktake, /const currentSessionZones = useMemo\(/, 'Stocktake session zones must be derived once per zone/session snapshot.');
assert.match(stocktake, /const currentSessionExports = useMemo\(/, 'Stocktake session exports must be derived once per export/session snapshot.');
assert.match(stocktake, /visibleSessionZones\.map/, 'The Stocktake home screen must reuse its memoized visible zones.');
assert.match(stocktake, /currentSessionZones\.map/, 'Stocktake history must reuse its memoized session zones.');
assert.match(stocktake, /currentSessionExports\.map/, 'The exports screen must reuse its memoized session exports.');
assert.doesNotMatch(stocktake, /\{zones\.filter|\{exports\.filter/, 'Stocktake render paths must not repeatedly filter session zones or exports.');
assert.match(stocktakeImport, /const invalidCount = useMemo\(/, 'Stocktake Import row validation must not be recomputed on unrelated UI renders.');
assert.match(stocktakeImport, /const invalidZones = useMemo\(/, 'Stocktake Import cross-zone validation must not be recomputed on unrelated UI renders.');
assert.match(stocktakeImport, /function yieldToNextPaint\(\)/, 'CPU-heavy local actions must use a one-frame paint handoff rather than blocking their first feedback.');
const saveImport = blockBetween(stocktakeImport, 'const saveActiveZone = async', 'const copyOutput = async');
assert.ok(saveImport.indexOf('setBusy(true)') < saveImport.indexOf('await yieldToNextPaint()'), 'Stocktake Import save must publish its busy state before local validation.');
assert.ok(saveImport.indexOf('await yieldToNextPaint()') < saveImport.indexOf('activeZone.rows.map'), 'Stocktake Import save must yield a paint before validating every row.');
assert.doesNotMatch(saveImport, /validateRow\(row\)\.length/, 'Stocktake Import save must not validate the same normalized rows twice.');
const confirmImport = blockBetween(stocktakeImport, 'const confirmPendingImport = async', 'const resetActiveSession =');
assert.ok(confirmImport.indexOf('await yieldToNextPaint()') < confirmImport.indexOf('commitIncoming('), 'Confirming a large import must paint its busy state before synchronous merge work.');
const exportAll = blockBetween(stocktakeImport, 'const exportAll = async', 'const clearHistory = async');
assert.ok(exportAll.indexOf('setBusy(true)') < exportAll.indexOf('await yieldToNextPaint()'), 'ZIP export must publish its busy state before packaging.');
assert.ok(exportAll.indexOf('await yieldToNextPaint()') < exportAll.indexOf('await createZipArchive()'), 'ZIP packaging must begin after the busy state has had a paint opportunity.');
const copyOutput = blockBetween(stocktakeImport, 'const copyOutput = async', 'const exportZone =');
assert.ok(copyOutput.indexOf('setNotice(\'Đang sao chép nội dung TXT…\')') < copyOutput.indexOf('navigator.clipboard.writeText'), 'Copy must acknowledge the action before waiting for the Clipboard API.');
assert.match(stocktakeImport, /key=\{zone\.zoneCode\} type="button" disabled=\{busy\}/, 'Zone navigation must not change the active edit target while a save is in progress.');
assert.match(stocktakeImport, /aria-label=\{\'Mã hàng dòng \' \+ row\.sourceRow\} disabled=\{busy\}/, 'Barcode fields must not accept edits while the active zone is being saved.');
assert.match(stocktakeImport, /aria-label=\{\'Kết quả thực tế dòng \' \+ row\.sourceRow\} disabled=\{busy\}/, 'Quantity fields must not accept edits while the active zone is being saved.');
assert.match(stocktakeImport, /onClick=\{resetActiveSession\}>Tạo phiên mới/, 'The new-session confirmation action must remain present.');
assert.match(stocktakeImport, /disabled=\{busy\} onClick=\{resetActiveSession\}/, 'Session reset must not race with another pending write.');
const historyExportStart = stocktakeImport.indexOf('setHistoryExportingId(item.id)');
const historyExportEnd = stocktakeImport.indexOf('aria-label="Tải lại kết quả"', historyExportStart);
const historyExport = stocktakeImport.slice(historyExportStart, historyExportEnd);
assert.ok(historyExport.indexOf('setHistoryExportingId(item.id)') < historyExport.indexOf('await yieldToNextPaint()'), 'History ZIP export must publish its spinner before packaging.');
assert.ok(historyExport.indexOf('await yieldToNextPaint()') < historyExport.indexOf('await createZipArchive()'), 'History ZIP packaging must begin after the spinner has had a paint opportunity.');
assert.match(scannerQa, /const \{ accepted, errors, maxDuration \} = useMemo\(/, 'Scanner QA summary calculations must be memoized independently of filter/copy state.');
assert.match(scannerQa, /const ScannerQaEventRow = memo\(/, 'Existing diagnostic rows must not re-render when a new event is appended.');
assert.match(scannerQa, /filtered\.map\(\(event\) => <ScannerQaEventRow/, 'Scanner QA must render diagnostics through memoized event rows.');
const scannerCopy = blockBetween(scannerQa, 'const copyReport = async', 'return <div className="scanner-qa-backdrop"');
assert.ok(scannerCopy.indexOf("setCopyState('copying')") < scannerCopy.indexOf('navigator.clipboard.writeText'), 'Scanner QA copy must acknowledge the action before awaiting Clipboard.');
assert.match(scannerQa, /disabled=\{copyState === 'copying'\} aria-busy=\{copyState === 'copying'\}/, 'Scanner QA copy must prevent duplicate clicks while Clipboard is pending.');
assert.match(scannerQa, /copyState === 'copying' \? 'Đang sao chép…'/, 'Scanner QA must show immediate pending copy feedback.');

function blockBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing block: ${start}`);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `Missing end marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

const refresh = blockBetween(stocktake, 'const refresh = useCallback', 'useEffect(() =>');
assert.doesNotMatch(refresh, /getLogs/, 'Opening or refreshing Stocktake must not eagerly read the full action history.');
const openHistory = blockBetween(stocktake, 'const openHistory = async', 'const beginZone = async');
assert.ok(openHistory.indexOf('setBusy(true)') < openHistory.indexOf('await stocktakeStore.getLogs()'), 'History loading must acknowledge the tap before reading IndexedDB.');
assert.ok(openHistory.indexOf('await stocktakeStore.getLogs()') < openHistory.indexOf("setScreen('history')"), 'History must only open after its requested records are available.');
assert.match(stocktake, /void openHistory\(\)/, 'The history navigation must use the explicit on-demand loader.');

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
