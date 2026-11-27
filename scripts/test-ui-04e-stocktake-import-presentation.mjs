import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const coordinator = readFileSync("src/features/stocktake-import/components/StocktakeImportModule.tsx", "utf8");
const presentation = readFileSync("src/features/stocktake-import/components/StocktakeImportPresentation.tsx", "utf8");
const styles = readFileSync("src/features/stocktake-import/components/stocktake-import.css", "utf8");

assert.match(coordinator, /import StocktakeImportPresentation/);
assert.doesNotMatch(coordinator, /stocktake-import\.css|stocktake-import-backdrop|stocktake-import-review-dialog/);
assert.match(coordinator, /parseStocktakeWorkbook/);
assert.match(coordinator, /detectStocktakeImportConflicts/);
assert.match(coordinator, /mergeStocktakeImportSession/);
assert.match(coordinator, /stocktakeImportStore/);
assert.match(coordinator, /registerPwaUpdateBlocker/);
assert.match(coordinator, /notifyPwaUpdateSafetyChanged/);
assert.match(coordinator, /dirtyZones/);
assert.match(coordinator, /confirmPendingImport/);
assert.match(coordinator, /saveActiveZone/);
assert.match(coordinator, /exportAll/);

assert.match(presentation, /import '\.\/stocktake-import\.css'/);
assert.match(presentation, /StocktakeImportPresentationModel/);
assert.match(presentation, /StocktakeImportPresentationActions/);
assert.match(presentation, /stocktake-import-review-dialog/);
assert.match(presentation, /stocktake-import-zone-workspace/);
assert.match(presentation, /stocktake-import-history-list/);
assert.match(presentation, /stocktake-import-preview-screen/);
assert.match(presentation, /stocktake-import-confirm-backdrop/);
assert.doesNotMatch(presentation, /useState|useEffect|parseStocktakeWorkbook|mergeStocktakeImportSession|stocktakeImportStore\\.|navigator\.clipboard|registerPwaUpdateBlocker|downloadFile/);
assert.match(presentation, /actions\.onConfirmPendingImport/);
assert.match(presentation, /actions\.onUpdateRow/);
assert.match(presentation, /actions\.onSaveActiveZone/);
assert.match(presentation, /actions\.onExportAll/);
assert.match(presentation, /actions\.onRestoreHistoryItem/);
assert.match(styles, /stocktake-import-review-dialog/);
assert.match(styles, /stocktake-import-preview-screen/);
assert.match(styles, /@media \(max-width:640px\)/);

console.log("UI-04E Stocktake Import presentation/coordinator ownership contract passed.");
