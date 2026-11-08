# Scanner C2 audit — Stocktake lifecycle migration

**Audit baseline:** `main` at `43f16379869b703e218e264040b859ab533c3193` (merge commit for PR #43).
**Audit branch:** `docs/scanner-c2-audit-sync`.
**Scope:** source audit and documentation synchronization to prepare PR C2. No runtime source or behavior is changed in this audit.

## 1. Baseline confirmation

- PR B lifecycle contract is present in `src/platform/scanner/contracts.ts` and `src/platform/scanner/scannerLifecycleAdapter.ts`.
- `UniversalScannerSession` owns the session ID and adapter; features provide an optional `ScannerLifecycleObserver` and must not instantiate their own adapter or invent IDs.
- `useScannerEngine` forwards the latest observer through a ref-backed callback, exposes `notifyExitPresentation()`, and retains the closing session reference so a feature can publish presentation completion after the active session reference is cleared.
- PR C1 Home migration is present in `BarcodeScanner.tsx`.
- PR #43 fresh-surface Recovery is present in the shared hook and both feature video elements. The user reports that after merge and testing the former preview-shrink issue no longer reproduces.

## 2. Current Stocktake integration

File: `src/features/stocktake/components/StocktakeScanner.tsx`.

Current behavior:

1. Stocktake uses the shared `useScannerEngine`; it does not own camera acquisition, stream, decoder or recovery.
2. It captures a frozen preview frame before manual close, then sets `isClosing` and calls `scanner.closeScanner()`.
3. On a decoded result, it captures the frame, sets `isClosing`, and forwards the barcode to `StocktakeModule.acceptBarcode()`.
4. `UniversalScannerSession.processFrame()` delivers a single accepted result and then calls `close()` in a `finally` block. The engine marks single-result mode as no longer desired-active before invoking the feature callback.
5. Stocktake's `finishClose()` currently calls parent `onClose()` directly when its own `scanner-stocktake-close` animation ends. It does not publish `EXIT_PRESENTATION` and does not wait for engine resource milestones.

Parent ownership: `src/features/stocktake/components/StocktakeModule.tsx`.

- The module owns `scannerOpen`, `cameraLeaseRequestRef`, the initiating tap-time `requestCameraLease()`, and the parent `closeScanner()` callback.
- `acceptBarcode()` only fills barcode/quantity/manual-entry state and retains the scanner surface through its exit transition. It does not persist a Stocktake entry.
- Persistence remains behind the existing explicit `saveEntry()` action. Manual entry, editing, review and duplicate-row behavior are separate business concerns and are outside C2.

## 3. Gap relative to C1

| Contract point | Home C1 | Stocktake current |
|---|---|---|
| Supplies `lifecycleObserver` | Yes | No |
| Uses engine-generated session ID | Yes | Not consumed |
| Captures exit snapshot before teardown | Yes | Yes |
| Calls `notifyExitPresentation()` | Yes | No |
| Waits for `EXIT_REQUESTED` | Yes | No |
| Waits for `CAMERA_RELEASED` | Yes | No |
| Waits for `DISPOSED` | Yes | No |
| Idempotent, order-independent close gate | Yes | No; animation directly calls parent |

## 4. C2 target contract

Implement the same feature-owned exit handoff in `StocktakeScanner`, without moving resource ownership out of the shared engine:

- Pass a feature observer to `useScannerEngine` and track `EXIT_REQUESTED`, `CAMERA_RELEASED`, and `DISPOSED` as independent milestones.
- Keep the presentation milestone owned by Stocktake. When the matching `scanner-stocktake-close` animation ends, mark presentation complete and call `scanner.notifyExitPresentation()`.
- Call the parent `onClose()` exactly once only after all four conditions are true: exit requested, camera released, engine disposed, and Stocktake exit presentation completed. Do not assume event arrival order.
- Keep an `onClose` ref or equivalent stable callback ownership so an updated parent callback does not restart the scanner or camera session.
- Preserve the current snapshot-before-teardown order for both manual close and successful scan.
- Do not call `closeScanner()` a second time when the single-result session already closes itself after delivering the result.
- Keep camera release independent of CSS animation duration. The animation reports presentation completion; it must never hold the camera lease.
- Preserve the reduced-motion CSS path that still dispatches the matching animation-end event.

## 5. C2 protected boundaries

Do not change:

- `useScannerEngine`, `UniversalScannerSession`, `cameraSession`, page lifecycle coordinator or fresh-surface Recovery.
- Camera constraints, autofocus, video readiness, decoder adapter, barcode validation, supported formats, ROI or 110 ms decode interval.
- `StocktakeModule` tap-time camera lease request, single-claim handoff, parent scanner visibility ownership or close callback semantics.
- Barcode-to-form fill, quantity defaults, manual-entry flag, edit/review behavior, duplicate rows, explicit save, IndexedDB schema or persistence.
- Stocktake layout, frame, animation names/timing, scanner CSS or visual design.
- Home C1 implementation, except a separately evidenced shared-contract defect.

## 6. Regression coverage required

Extend `scripts/test-scanner-lifecycle.mjs` (and only add assertions to `test-scanner-validation.mjs` if they protect an existing UI invariant) to verify:

1. Stocktake subscribes using `lifecycleObserver` and does not construct `ScannerLifecycleAdapter`.
2. The feature calls `notifyExitPresentation()` only after its own matching close animation completes.
3. The close gate requires all four milestones and is order-independent.
4. Repeated lifecycle callbacks or duplicate animation events cannot call parent `onClose()` more than once.
5. Manual close captures the preview before `closeScanner()`.
6. Successful single-result flow captures the preview before the session's automatic `close()` and does not initiate a duplicate close.
7. The parent callback is not invoked by animation completion alone.
8. Stocktake's explicit-save/form-fill/manual-entry/duplicate-row source invariants remain intact.
9. Reduced-motion close still reaches the presentation completion handler.

Then run `npm run preflight` (scanner validation, lifecycle tests, TypeScript/production build, Pages build and diff checks). Physical-device acceptance is separate.

## 7. Documentation reconciliation performed in this branch

- Replaced stale active roadmap ordering that still described PR #38 as the blocking Draft task.
- Updated Implementation Status to record PR B, C1 and PR #43 as merged and to identify C2 as the next unimplemented feature migration.
- Updated ADR-008, ADR-009 and ADR-013 status; added ADR-014 for fresh-surface Recovery.
- Updated AI Handoff and Project Context to point at current main and the C2-specific guardrails.
- Added C2 acceptance gates and a chronological Session Log entry.
- Kept older implementation notes and audit records as historical evidence rather than deleting useful history. Conflicting statements in active summaries were replaced; historical status claims are explicitly marked as historical.

## 8. Recommended implementation sequence

1. Create a C2 feature branch from current `main` after this documentation sync is accepted.
2. Modify only `StocktakeScanner.tsx` to add observer wiring and the four-milestone close gate.
3. Extend lifecycle regression tests for both manual and successful-result exit paths.
4. Run full preflight and inspect the complete diff against main.
5. Validate on iOS Safari/PWA and Android Chrome/PWA: manual close, successful scan, rapid reopen, background/foreground, close during recovery, reduced motion, and unchanged Stocktake form/save behavior.
6. Merge only after review and explicit approval. PR A remains a separate follow-up after C2.

## 9. Audit conclusion

C2 is a narrowly scoped feature migration, not a scanner-engine change. The required platform contract and shared recovery are already available. The only demonstrated gap is Stocktake's missing lifecycle observer and its direct animation-to-parent close path. Do not broaden C2 unless implementation or regression evidence reveals a concrete dependency.