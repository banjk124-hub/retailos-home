# AI handoff — Scanner roadmap reconciliation (2026-11-11)

**Repository:** banjk124-hub/retailos-home
**Current main:** PR #77 merge `2c3fc1bd4b37f19bcfba2b1d7974184eb5e42c49`; PR #77 is deployed and user-tested.
**Current work branch:** `fix/scanner-scan07-focus-and-optical-pipeline`; PR #78 in progress.
**Scope:** continue SCAN-07 only. Integrate native ROI detail, camera focus recovery, track constraint serialization and multi-scale decoder flow. Do not merge/deploy without explicit approval.
**Operational note:** user reports scanner operation relatively stable; do not convert this into unsupported claims about measured accuracy, latency or device coverage.

## Resume instructions
1. Read `docs/ai-context/SCAN_07_11_RESEARCH_AND_IMPLEMENTATION_PLAN.md` and `docs/ai-context/SCAN_07_ADAPTIVE_ROI_MULTISCALE.md` first.
2. Read current source in `zxingDecoder.ts`, `scannerGeometry.ts`, `scannerRoi.ts`, `scannerRotation.ts`, `scannerDeskew.ts`, `universalScannerSession.ts` and the Home/Stocktake ROI bindings.
3. Treat SCAN-02/03 mapping and SCAN-04 strict ROI as immutable contracts unless a separate compatibility design and regression evidence justify an additive extension.
4. Preserve the current decode candidate as the baseline. New transforms are optional candidates after baseline misses; never replace the existing path without corpus evidence.
5. Separate algorithm accuracy, false-positive rate, latency, memory and device responsiveness in all reports.
6. Stay in SCAN-07 until PR #78 and both module/device acceptance gates are complete. Do not begin SCAN-08/09 yet.

## Current project state — SCAN-07 remains active
- SCAN-01 through SCAN-06 implemented; PR #67 confirmed merged/deployed by user.
- PR #75 Code 39/diagnostic remediation merged.
- PR #76 Camera Request Bridge merged to main at `20ce22e`; run #610 passed on code/test head `b954b8a`. Device QA evidence for PR #76 must not be assumed from CI.
- PR #77 merged/deployed; user confirms modest small/far improvement and reticle-edge reads, but not enough range/precision.
- PR #78 branch preserves native ROI pixels up to 2048 px width / 1.5 MP native area; camera request prefers 1920×1080 / 30 FPS maximum; fallbacks remain 1.5×, then 1×/2× after a full miss.
- Focus is configured only after a fresh video frame. Shared helper preserves negotiated constraints and serializes autofocus/Torch updates. A low-rate ROI sharpness/motion watchdog can reassert continuous focus after sustained stable blur, only when supported.
- This is an autofocus re-arm request, not proof of physical lens movement. Real iOS/Android behavior must be tested.
- Outward padding remains disabled because modules publish only the reticle; no capture envelope contract exists.
- Do not attribute end-to-end scanner latency to SCAN-07 or claim an absolute reading distance/minimum barcode size without device evidence.
- Current user feedback: operationally relatively stable.

## Current PR #78 verification priorities
1. Run final-head CI and inspect every failing preflight test before changing source further.
2. Confirm the 1920×1080 ideal request is negotiated safely; inspect actual settings on low/mid/high devices.
3. Verify post-first-frame focus request is non-blocking and does not change active resolution/frame rate.
4. Verify focus and Torch track updates serialize and preserve both advanced settings.
5. Verify focus quality ignores blank/moving scenes and only re-arms after sustained stable blur.
6. Test both Home and Stocktake on iOS Safari/PWA and Android Chrome/PWA.
7. Record barcode source pixel height and physical distance. Do not report end-to-end latency as SCAN-07 performance.
8. Keep SCAN-08/09 blocked until SCAN-07 is accepted.

## Protected invariants
No silent expansion beyond module-authorized ROI; no full-frame/centered fallback; no replacement of geometry mapping; no decoder concurrency; no unbounded candidate queue; no changes to camera lease/lifecycle/recovery, preview presentation, barcode validation/result delivery, Home lookup or Stocktake form-fill/explicit-save without a separate approved scope.

---

---

## Historical branch scope — PR #75 (merged)
- Enable Code 39 in the existing ZXing adapter path, explicit supported-format allowlist and payload validation. ZXing's Code 39 enum/mapping existed before this branch; production activation did not.
- Add Code 39 validation tests and production-adapter upright/180-degree integration fixtures.
- Retain rotation/deskew diagnostics through the privacy allowlist and surface them in QA Monitor / CSV export.
- Add a privacy regression test for diagnostic collection/export.
- Correct stale audio gain documentation/comment: 50% = 0.30, 100% = 0.60, tone duration approximately 140 ms.
- Synchronize scanner architecture, acceptance and roadmap records.

## Protected invariants
No camera acquisition/lease, constraints/autofocus, lifecycle/recovery, decode cadence, strict ROI/no-fallback, Home presentation/lookup, Stocktake presentation/form-fill/explicit-save, auth, snapshot/cache, service worker or deployment configuration changes.

## Historical deferred architecture item — superseded by PR #76
At the PR #75 baseline, `ScannerModuleConfig.cameraRequest` was declarative and the shared camera lease used a fixed environment / 1280×720 / 30 FPS request. That deferral is superseded by the current Camera Request Bridge work tracked in PR #76, which wires intent through tap-origin acquisition, compatibility checks and recovery re-acquisition.

**Current CI:** GitHub Actions run #577 passed on final head `8f558511297596be0819baea01d49ed0993b86fb`: full preflight, Code 39 validation + production adapter upright/180° tests, diagnostic privacy/export tests, TypeScript, production build and Pages build. A synthetic 17° Code 39 fixture did not decode through existing deskew; angled Code 39 remains unverified and no deskew algorithm change was made.

## Required verification
1. Run Code 39 payload validation and production ZXing adapter integration (upright and 180-degree reversal).
2. Run diagnostic collector privacy/allowlist tests and verify QA Monitor / CSV fields.
3. Run full `npm run preflight`, TypeScript, production build and GitHub Pages build.
4. Review the entire diff against the exact branch base.
5. Keep PR unmerged and undeployed pending review and explicit user approval.

---

## PR #74 — delivered Stocktake Import requirements (historical)

1. Move ZIP to a compact control beside “CÁC VÙNG”; render only when session has multiple zones.
2. Per-zone action status: Ready, Saved, Copied, TXT downloaded, ZIP exported, Dirty, Invalid.
3. TXT preview becomes a dedicated view in the selected-zone workspace, with return-to-table action.
4. Four summary metrics: compact source-file card, zone count, total row count and unique product-code count.
5. Each zone displays both row count and unique product-code count.
6. Optional product-name column parsed from `TÊN SẢN PHẨM`, `SẢN PHẨM`, exact `TÊN` and supported English aliases. Display between code and actual quantity only when present; never add it to TXT output.
7. Desktop-first fixed viewport frame with independent content, zone-list and table scrolling; wider workspace and no overlapping controls.
8. Mobile remains compact, touch-operable and suitable for quick review.

## Implementation and data contract

- Unique product identity is the resolved `barcode` value for all source types. Normalize Unicode NFKC, trim, compare case-insensitively; preserve punctuation and leading zeroes; exclude blank values.
- Global unique count is across all zones; duplicate codes across zones count once globally. Per-zone unique counts remain independent. Row count and duplicate rows are preserved.
- Product name is optional row metadata carried through session merge and IndexedDB history. No IndexedDB version bump; old records without this field remain valid.
- The TXT payload, employee/date line, zone format, file names, Excel decimal precision, code precedence, multi-file merge/skip, fingerprints/provenance and output validation remain unchanged.
- No changes to Stocktake scanner, Scanner Engine, camera lifecycle, authentication, snapshot/cache, service worker or deployment configuration.

## Current changed files

- `src/features/stocktake-import/services/stocktakeImportParser.ts`
- `src/features/stocktake-import/services/stocktakeImportSession.ts`
- `src/features/stocktake-import/components/StocktakeImportModule.tsx`
- `src/features/stocktake-import/components/stocktake-import.css`
- `scripts/test-stocktake-import.mjs`
- `docs/ai-context/ARCHITECTURE.md`
- `docs/ai-context/STOCKTAKE_FILE_IMPORT.md`
- `docs/ai-context/modules/EXPORT_FILE.md`
- This handoff.

## Remaining gates

1. Confirm PR #74 head and CI: full preflight, TypeScript, production build, Pages build and scanner regression suite.
2. Review PR diff for parser edge cases, per-zone state reset, ZIP visibility, preview navigation and nested scroll.
3. Test real workbooks with/without product-name columns; verify global unique counts and unchanged TXT output.
4. Manual desktop Chrome/Edge QA at multiple window sizes and viewport heights.
5. Manual iOS Safari/PWA and Android Chrome/PWA QA: compact navigation, table scrolling, preview, touch, file picker, clipboard and downloads.
6. Update exact CI/device evidence in this handoff and module record.
7. Do not merge or deploy without explicit user approval.

---

# Current task — Stocktake offline file import (2026-11-10)

**PR:** [#69 — Offline file import, zone preview and export](https://github.com/banjk124-hub/retailos-home/pull/69).
**Branch:** `feat/stocktake-file-import`.
**Base main:** `16e296cc5d1074a15a179f186b5db7c2b37c2131`.
**Status:** Implementation and CI complete (RetailOS CI run #454 passed); do not merge/deploy until downstream format acceptance and real-device QA are complete.

## Current implementation

- `Xuất file` is a separate local-only workflow inside the existing Kiểm kê library.
- `RetailModuleId` is separate from `ModuleDataId`; importer does not enter snapshot sync.
- `.xlsx` parsing is local using JSZip and browser XML APIs; no source workbook upload or network fetch.
- Detects sheet list, header row, BARCODE, SỐ LƯỢNG and an explicit VÙNG/ZONE column when present; validates the zone against sheet metadata and preserves duplicates/source order.
- Supports decimal quantities, decimal-comma text values and percentage-formatted numeric cells.
- Resolves alphabetic+numeric and numeric-only zone codes; numeric-only output currently uses `ADRESSE,,540`.
- Preview output before download; ZIP contains one TXT file per zone; individual zone download is available.
- Import history/output uses a separate IndexedDB database and has its own clear-history action.
- Existing Stocktake and Scanner behavior is intentionally unchanged.

## Required next steps

1. CI/preflight passed in RetailOS CI run #454; keep this check green on subsequent changes.
2. Structural review of both supplied workbook examples is complete; execute actual import/output comparison on device.
3. Confirm downstream compatibility of `ADRESSE,,<number>` and percent-suffixed quantities.
4. Test file picker, local parsing, history persistence, individual TXT and ZIP downloads on iOS Safari/PWA and Android Chrome/PWA.
5. Do not merge/deploy without the user's explicit approval.

See `docs/ai-context/STOCKTAKE_FILE_IMPORT.md` and ADR-028 in `ARCHITECTURE.md`.

---

# Current AI handoff — post-merge SCAN-05/06 audit (2026-11-10)

- Repository: banjk124-hub/retailos-home; default branch: main.
- PR #67 merge baseline is 9406ac30d53bc9984912bd1928a32fd78157cf60; current main later advanced to PR #74 merge commit 6ac1eefad1c47d87d2c83f9002050c8a7d7802fe.
- PR #67 is merged and closed. The user confirms deployment and successful real-world operation; scanner recognition is working well and feels sensitive across multiple processing paths.
- Final PR-head CI #432 passed full preflight on c9794a5422aa2d6ace16480c2948c1bae3e0d06b. CI #425 passed on executable source head e0b28787f40db8c811bc7fde912bae2558289198; the subsequent 13 commits were documentation-only.
- SCAN-05/06 is complete. Current source uses a 70 ms minimum decode interval, continuous orientation estimation, strict module-owned ROI and serialized decoder calls.
- The engine owns camera/session/decoder scheduling. Home and Stocktake continue to own their UI/presentation and business policy.
- Accuracy and recognition responsiveness take priority over a strict ultra-low-end CPU budget. Do not reduce orientation candidates or cadence solely to optimize weak devices without evidence.
- No camera acquisition/autofocus, camera lease, lifecycle/recovery, module UI, validation, Home lookup or Stocktake form/save changes were part of SCAN-05/06.
- Detailed device matrix and quantitative latency/CPU/success-rate measurements were not supplied. Do not represent these as measured or as blockers to the user's functional acceptance.

## Current technical reference

1. src/platform/scanner/decoders/zxingDecoder.ts — upright → 90° fast path → continuous deskew candidates; both binarizers.
2. src/platform/scanner/scannerDeskew.ts — orientation estimator, contrast normalization and bounded bilinear transform.
3. src/platform/scanner/scannerRotation.ts — exact 90° ROI transform.
4. src/platform/scanner/universalScannerSession.ts — 70 ms minimum decode interval and serialized frame processing.
5. docs/ai-context/SCAN_05_ORTHOGONAL_ROTATION.md and SCAN_06_BOUNDED_DESKEW.md — detailed behavior and limitations.
6. docs/ai-context/IMPLEMENTATION_STATUS.md and ROADMAP.md — current verified status and next project scope.

## Immediate audit outcome

- [x] Confirm PR #67 merged and main equals merge commit 9406ac30d53bc9984912bd1928a32fd78157cf60.
- [x] Confirm final PR-head CI #432 passed.
- [x] Confirm the source head passed CI #425 and the remaining commits to final PR head were documentation-only.
- [x] Reconcile stale Draft/pending/deploy statements across current engineering documents.
- [x] Record the user's post-deployment functional acceptance without inventing device matrix or performance numbers.

## Next-session rules

1. Start from current main; verify latest SHA and working tree before edits.
2. Do not reopen SCAN-05/06 unless a reproducible defect or measured performance issue is presented.
3. Keep the strict module-owned ROI/no-fallback contract and all Home/Stocktake behavior intact.
4. Agree the next independent roadmap slice before changing source.
5. Keep quantitative performance claims separate from qualitative user feedback.


---

# Historical handoff — SCAN-03 module-owned preview regions (completed 2026-11-10)

- SCAN-01 merged by PR #58; SCAN-02 merged by PR #59 at `891a3a6c8c85442d0b4a253c1fca43b36b590f1c`.
- SCAN-02 audit follow-up PR #60 is merged; its corrected DOM-boundary guard passed full CI run #301.
- SCAN-03 merged by PR #61 at `4804a0b0f06113e43a06e8b171d05dbad6fb1a8f`; final PR-head CI run #312 passed. User confirms iOS/Android geometry and existing Home/Stocktake flows were checked without detected issues.
- Home and Stocktake retain independent video/reticle DOM and presentation. New feature-level adapter measures DOMRects and computed object-fit/object-position, clips reticle to visible content and maps to source coordinates.
- `ScannerSession.setScanRegion()/getScanRegion()` store a defensive source-region snapshot. Updates do not restart camera, decoder or frame loop.
- Decoder still receives the full video. No ROI-only decode, crop, rotation, deskew, perspective, barcode validation or cadence changes in SCAN-03.
- Protect camera lease/refcount, single-claim handoff, lifecycle/recovery, preview readiness, ZXing, validation, Torch, feedback, Home lookup and Stocktake save/revision/export.
- SCAN-03 is complete; decoder consumption was intentionally deferred to SCAN-04.
- No further SCAN-03 merge/deploy action is pending.

Canonical design: `docs/ai-context/SCAN_03_MODULE_REGION_INTEGRATION.md`.

---

# Historical handoff — SCAN-02 audit and SCAN-03 planning (completed 2026-11-10)

- SCAN-01 is merged by PR #58 at `47b991de8a0040aa44e500aa6228127f9e59f0f6`.
- SCAN-02 is merged by PR #59 at `891a3a6c8c85442d0b4a253c1fca43b36b590f1c`; main CI run #299 passed TypeScript, production/Pages builds and full preflight.
- User confirms the merged build is deployed and the existing scanner flows operate normally without regression.
- Audited the pure mapper `src/platform/scanner/scannerGeometry.ts`: object-fit sizing, object-position crop, visible-content intersection, mirror inversion, validation and explicit failures are consistent with the contract.
- Follow-up audit hardens the test guard so DOM/window access is actually detected; this is a test-quality correction, not a runtime scanner fix.
- No Home/Stocktake consumer is wired yet. SCAN-02 does not activate ROI decoding; full-frame decode remains the current behavior.
- SCAN-03 independently wires module-owned preview geometry and source-region updates. Region updates must not restart camera/session/decoder/frame loop.
- Physical iOS Safari/PWA and Android Chrome/PWA reticle-alignment QA is required after SCAN-03.
- SCAN-04 is the later phase for strict ROI-only decoding after both consumers are proven valid.
- Protect camera lease/refcount, single-claim handoff, lifecycle/recovery, preview readiness, ZXing, validation, Torch, feedback, Home lookup and Stocktake save/revision/export.
- No merge/deploy without explicit user approval.

Canonical SCAN-02 design: `docs/ai-context/SCAN_02_GEOMETRY_MAPPING.md`.

---

# Historical handoff — SCAN-01 contract implementation (merged 2026-11-10)

- Active implementation branch: `feat/scanner-input-module-config-contract`.
- Base: main `09cd3b5117ea38a16dd991f74320835b67ea04b5`.
- SCAN-01 defines `ScannerModuleConfig`, `ScannerPreviewScanRegion`, `ScannerSourceScanRegion`, `ScannerCameraRequest` and `DEFAULT_SCANNER_CAMERA_REQUEST` in `src/platform/scanner/contracts.ts`.
- Coordinate spaces are explicit: preview-content normalized (feature input) and source-frame normalized (core input after SCAN-02 mapping).
- Camera preferences are independent of UI aspect ratio. Existing default is unchanged: environment, ideal 1280×720, 30 FPS ideal/max.
- SCAN-01 is contract-only; Home and Stocktake are not wired yet. Do not claim ROI-only decode is active.
- Next: SCAN-02 pure geometry mapping; then SCAN-03 Home/Stocktake integration; then SCAN-04 strict ROI-only decode.
- Protect camera lease/refcount, lifecycle/recovery, preview readiness, decoder cadence, ZXing, validation, Torch, feedback, Home lookup and Stocktake save/revision/export.
- No merge/deploy without explicit user approval.

Canonical contract: `docs/ai-context/SCAN_01_INPUT_CONTRACT.md`.

---

# Historical handoff — shared Scanner settings and feedback QA (2026-11-09)

- Repository: `banjk124-hub/retailos-home`.
- Production implementation: PR #51/#52, shared Web MediaStreamTrack Torch path.
- Investigation: PR #53/#54 completed; see `ARCHITECTURE.md` ADR-018 and `SCANNER_TORCH_AUDIT_2026-11-09.md`.
- User-confirmed platform result: iOS Flash works; Samsung Galaxy S23 Ultra / Android Chrome does not expose Torch, and the explicit API-accepted probe did not illuminate the LED.
- Current decision: keep capability-gated behavior. Do not bypass `getCapabilities().torch`, infer support from device/browser identity, or add native CameraX solely for Flash.
- Cleanup PR #55: https://github.com/banjk124-hub/retailos-home/pull/55. Temporary PR #53 diagnostics and PR #54 probe code are removed; production Torch controls and regression tests remain. GitHub Actions run #42572378379 passed full preflight on head `53b14c7`. User confirms PR #55 was merged and deployed.

## Current verified state — shared Scanner settings (2026-11-09)

- PR #56: https://github.com/banjk124-hub/retailos-home/pull/56 is merged into `main` at merge commit `5eee1a6a565f6263907541dac6af6b4ba77b37be`. Do not describe it as Draft/open/unmerged. Deployment of this merge is not asserted here.
- PR #56 final head `0790e4f7d04ccaa8b6500e2e8c59b99131504318` passed full preflight in GitHub Actions run #42575773839.
- Settings Hub, independent Scanner QA Monitor and Scanner preferences entries, gear icon, device-local shared preference store and centralized feedback are present on main.
- Defaults: vibration enabled and beep volume 50%; after PR #57, 50% maps to Web Audio gain 0.30, 0% mutes, 100% maps to 0.60. Tone duration is approximately 140 ms. Slider steps are 10%.
- Home and Stocktake consume the same feedback service. Feedback reads the latest setting when a barcode is accepted; no per-feature override remains.
- iOS vibration remains unavailable where `navigator.vibrate` is absent. The UI reports unsupported capability and scanning remains non-fatal.
- Physical Android/iOS QA remains an explicit acceptance gate. CI does not prove perceived loudness, actual device vibration or hardware output.
- PR #57: https://github.com/banjk124-hub/retailos-home/pull/57 is merged at `09cd3b5117ea38a16dd991f74320835b67ea04b5`. It adds iOS AudioContext foreground recovery and executable Web Audio gain/preview/vibration-policy tests. Current mapping is 50%=0.30, 100%=0.60 and approximately 140 ms tone duration. Physical acoustic QA remains separate.
- See Architecture ADR-019/ADR-020, `scripts/test-scanner-settings.mjs` and `scripts/test-scanner-audio-runtime.mjs`.

---

## Torch implementation rules
1. Discover support from the active video track after `video.play()` and first usable frame.
2. Render Flash only when `getCapabilities().torch === true`.
3. Never turn Torch on automatically or send a Torch constraint when support is not advertised.
4. Unsupported/rejected constraints are non-fatal; preview and barcode decoding must continue.
5. Preserve existing track constraints when applying ON/OFF.
6. Guard async completion by active session generation and track identity; clear state on suspend/recovery/close.
7. Keep Home and Stocktake presentation independent. Engine/hook expose state and operation only.
8. iOS remains on the existing WebKit path. No native bridge is part of the current scope.

Read `ARCHITECTURE.md` ADR-018, `SCANNER_TORCH_AUDIT_2026-11-09.md`, source and `ACCEPTANCE_CHECKLIST.md` before changing Torch behavior.

---

# Historical handoff — post PR #49 video presentation ownership (2026-11-09)

## Verified baseline
- Repository: `banjk124-hub/retailos-home`.
- Current `main`: `1764c858a7d7855950ebe328a3a653d6935fa796`, merge commit for PR #49.
- PR #49 removed the engine-owned DOM video geometry barrier and deleted `src/platform/scanner/videoPresentationLayout.ts`.
- GitHub Actions run #200 passed the complete repository preflight.
- User confirms the merged build was deployed and tested without issues.
- Documentation synchronization branch: `docs/scanner-video-presentation-ownership` (documentation updates plus one source-comment-only correction; no executable/runtime behavior changes).

## Current architecture
1. The platform engine owns camera lease/session/stream resources, decoder lifecycle, recovery and truthful technical media/frame readiness.
2. The platform engine does **not** own feature DOM geometry. It must not require a parent element, container bounds, matching rectangles, CSS dimensions, aspect-ratio equality or stable layout before attaching/playing a stream.
3. `waitForVideoFrameReady()` remains a technical media check. Intrinsic `videoWidth/videoHeight` describe the decoded media frame, not the CSS size or position of the DOM element.
4. Startup order is stream attachment → `video.play()` → usable first frame → `onPreviewReady` / lifecycle `READY` → decoder initialization → scanning after decoder readiness.
5. `isPreviewReady` means a usable preview frame exists. It does not prescribe how the module displays, crops, scales, masks, animates or positions that frame.
6. Home and Stocktake own their separate video elements, DOM containers, layout, sizing, crop, visibility, overlays, reveal policy and close presentation.
7. Platform lifecycle events remain technical only: `OPENING`, `READY`, `SCANNING`, `SESSION_CLOSE_STARTED`, `CAMERA_LEASE_RELEASED`, `DISPOSED`. No presentation-completion event/API is sent to the engine.

## Protected invariants
- Do not reintroduce a DOM geometry gate in the platform engine.
- Do not remove technical first-frame/media readiness when changing presentation.
- Preserve camera acquisition/lease/refcount, stream attachment/release, foreground Recovery and lifecycle serialization.
- Preserve decoder initialization, scheduling/cadence, supported formats, barcode validation/delivery and single/continuous semantics.
- Preserve Home cached lookup and Stocktake form-fill, manual entry, duplicate rows and explicit persistence.
- Keep Home and Stocktake presentation independent; do not introduce a shared preview component or universal CSS contract without a separately approved design decision.
- Keep camera release prompt and independent of module animation/transition duration.

## Mandatory reading order
1. `AGENTS.md` — operating contract and safety rules.
2. `docs/ai-context/PROJECT_CONTEXT.md` — product constraints and session protocol.
3. `.github/skills/retailos-implementation/SKILL.md` — implementation workflow.
4. `docs/ai-context/ARCHITECTURE.md` — accepted boundaries and ADR-015.
5. `docs/ai-context/ROADMAP.md` — active phases and next work.
6. `docs/ai-context/IMPLEMENTATION_STATUS.md` — latest verified state.
7. `docs/ai-context/SCANNER_VIDEO_PRESENTATION_AUDIT_2026-11-09.md` — detailed source audit.
8. `docs/ai-context/ACCEPTANCE_CHECKLIST.md` and relevant source/tests.

Accepted architecture decisions are recorded in `ARCHITECTURE.md`. `DECISIONS.md` also exists and contains supplementary/proposed decision records; check each decision's status before treating it as accepted.

## Session start/end rules
- Confirm repository, branch, latest main SHA, branch base/head and diff before editing.
- Treat current source/tests/config as authoritative for runtime behavior. Treat old session notes and audit snapshots as historical when they predate the current baseline.
- Make narrowly scoped changes. Do not modify unrelated modules or runtime code during documentation-only work.
- Run targeted tests and the repository preflight when source changes are made; record exact evidence and distinguish CI from real-device acceptance.
- Update Architecture, Roadmap, Implementation Status, Handoff and Session Log together when a durable scanner boundary changes.
- Do not merge or deploy without explicit user approval.

# Historical handoff snapshot — 2026-11-08 (pre C1/Recovery merge)

Read this update before using older session notes below. Current source baseline is main merge `c7146b55f0c2210cd7b8474c6a72b1c915985793` (PR #32). PR #31 and #32 are merged; old Draft/unmerged statements are historical.

## User's current priorities
1. Android opening layout is now stable; iOS still jumps/reflows.
2. Verify startup is truly initiated from the module tap; source confirms it is.
3. Exit fades to dark because video teardown precedes completion of the dark overlay fade; visual fix still needed.
4. Reassess Phase 1.2G realistically; source instrumentation exists, but telemetry is not proof of GPU drops, battery or temperature.
5. Define Low/Mid/High adaptive resource profiles for the app eventually, but implement scanner-first and never trade scan accuracy/operational correctness.
6. Re-scope Phase 1.2I to shared scanner engine completion.

## Current source facts
- Home and Stocktake tap handlers call `requestCameraLease()` before setting scanner-open state. A cancellable, one-claim lease is handed to the mounted shared session.
- Remaining startup wait is browser permission/hardware acquisition, first usable frame and decoder initialization; no duplicate camera request should be added.
- Hook currently passes `profile: 'HIGH'` unconditionally; adaptive profile selection is not implemented.
- iOS geometry issue is not conclusively diagnosed. Home fixed inset root + percentage-height card differs from Stocktake dynamic viewport sizing. Measure visualViewport/safe-area/element bounds before patching.
- Home close currently initiates camera teardown while the dark fixed overlay remains for 180 ms; this likely explains black fade.

## Current task branch
`docs/scanner-source-audit-device-profiles` — documentation-only source audit and phase realignment. No runtime code or deployment changes. Review `SCANNER_SOURCE_AUDIT_2026-11-08.md` first.

## Recommended next work order
1. Review/merge documentation only after user approval.
2. Capture iOS Safari/PWA viewport geometry and reproduce opening layout jump; patch only after root cause evidence.
3. Design a visual exit state that preserves prompt camera teardown while avoiding dark-only fade; test iOS and Android.
4. Define shared engine completion contracts and tests (Phase 1.2I).
5. Implement scanner-first Low/Mid/High profiles with conservative fallback and no accuracy trade-off (Phase 1.2J).
6. Cross-platform release validation (Phase 1.2K).

Do not implement decoder tuning, adaptive camera constraints, or broad app-wide profile wiring as part of the documentation task. Do not merge/deploy without explicit user approval.

---

# RetailOS — AI Handoff (Canonical Entry Point)

> Read this file first when an AI agent, a new chat, or a new contributor starts work. Then follow the mandatory reading order below. This file is an index and current-state handoff, not a replacement for source code or detailed architecture.

## Project identity
- Repository: `banjk124-hub/retailos-home`
- Product: mobile-first supermarket operations PWA.
- Default language for user-facing work: Vietnamese.
- Primary development environment: Windows, VS Code, PowerShell.
- Stack: React 18, TypeScript, Vite 6, PWA/service worker, IndexedDB; existing Google Sheets/Apps Script integrations.
- Current deployment target: GitHub Pages. Verify `vite.config.ts` and workflow before relying on a base path or deploying.

## Mandatory reading order
1. `AGENTS.md` — non-negotiable operating contract.
2. `docs/ai-context/PROJECT_CONTEXT.md` — product intent and session protocol.
3. `.github/skills/retailos-implementation/SKILL.md` — implementation workflow.
4. `docs/ai-context/ARCHITECTURE.md` — boundaries and invariants.
5. `docs/ai-context/ROADMAP.md` — phases, dependencies, and acceptance gates.
6. `docs/ai-context/IMPLEMENTATION_STATUS.md` — latest verified state and chronological record.

Accepted architecture decisions are recorded in `ARCHITECTURE.md`; `DECISIONS.md` contains supplementary/proposed records, and each entry's status must be checked before treating it as accepted.
7. Relevant feature source, tests, package scripts, and current git diff.

If any item is missing or contradicts the current source, stop treating this handoff as authoritative for that detail. Inspect the repository, then update the relevant document in the same change set.

## Current verified repository snapshot
- Last reviewed main commit before this phase: `3c75f4886c2adeeaa216fd030f11f3bf8b5fd198` (2026-11-05).
- Latest active work branch: `phase-1-2e-scanner-feedback` (Phase 1.2E scan confirmation feedback), based on pushed main commit `ef7b6ff14e2cdfeeee24a7d6349f19b7b3405c1a`.
- Previous Phase 1.2 foundation branch has been merged into `main` and deployed; Phase 1.2E remains unmerged and undeployed.
- This branch is intentionally separate from `main`; do not merge or deploy without explicit user approval.
- Scanner stack uses `@zxing/library ^0.23.0` as its only decoder dependency; ZBar and browser-native decoding are not part of the runtime.
- Current package scripts observed: `dev`, `build`, `build:pages`, `preview`, `preview:pages`. No test or lint script was defined at the time of review.
- Main contains the Phase 1.2 scanner foundation: explicit EAN-13/EAN-8/CODE-128 whitelist and payload validation. The active Phase 1.2E branch adds a louder accepted-result beep and best-effort 25 ms vibration where supported.
- Scanner engine has a live-controls guard and handles a single-scan result arriving before ZXing returns its controls. Phase 1.2E local TypeScript/build and device verification are still pending.
- These are review findings, not proof of device-level failure. Confirm against the current branch before making claims.

## Non-negotiable working rules
- Inspect branch, status, diff, recent commits, and actual source before editing. Never assume the user's local working tree is clean.
- Never discard untracked files, artifacts, local changes, or user data. Never run destructive cleanup commands.
- Work on a task branch. Keep `main` protected.
- Do not push, merge, publish, deploy, change cloud settings, rotate credentials, or modify production without explicit user approval.
- Never place secrets, OAuth tokens, service-account keys, personal data, or production exports in the repository or chat.
- Do not change stable module IDs, Apps Script payloads, auth/session semantics, IndexedDB schema, service-worker behavior, or Vite base path without a written migration plan and regression coverage.
- Do not add dependencies before checking whether existing dependencies/platform APIs are sufficient.
- Separate verified facts, hypotheses, decisions, and open questions.
- Do not claim tests/build/device QA passed unless actually executed and the exit result is known.

## Required session start
1. Confirm repository and current default branch.
2. Fetch latest `main`; inspect task branch and whether it is behind/ahead.
3. Read mandatory documents in the order above.
4. Inspect local `git status --short`, current branch, and diff before checkout or edits.
5. Run baseline commands available in `package.json`; record pre-existing failures.
6. State the task, scope, files likely to change, protected contracts, tests, and stop conditions.

## Required session end
1. Run targeted checks and build commands that are available.
2. Inspect the complete diff and ensure no unrelated changes, generated artifacts, or secrets.
3. Update `IMPLEMENTATION_STATUS.md` with exact files, behavior, commands, results, unverified paths, and next step.
4. Update `ROADMAP.md` if phase scope, dependencies, or acceptance criteria changed.
5. Update `ARCHITECTURE.md` or `PROJECT_CONTEXT.md` only when durable invariants or project facts changed.
6. Record durable decisions in `ARCHITECTURE.md` until a dedicated decision log is justified.
7. Leave a concise handoff: branch, base/head commit, completed work, remaining work, blockers, exact next action.
8. Do not merge/deploy.

## Conflict resolution
When sources disagree, use this order:
1. Current executable source and tests for actual behavior.
2. Current package/config/CI files for tooling and deployment behavior.
3. This operating contract for process and safety.
4. Architecture and project context for intended invariants.
5. Roadmap and implementation status for planned/reported progress.
6. Older chat messages and old AI summaries as historical clues only.

Do not silently reconcile contradictions. Record the discrepancy and correct the authoritative document.

## Definition of done
A change is not complete merely because code was written. It is complete only when implementation, regression evidence, documentation, project status, and handoff agree. A phase may be marked complete only against its acceptance criteria; otherwise label it in progress, blocked, or unverified.


## Active task — Phase 1.2F camera lifecycle recovery (2026-11-06)
- Active GitHub branch: `phase-1-2f-camera-lifecycle`, created from `main`; it is intentionally unmerged and undeployed.
- Scope is limited to `cameraSession.ts` and `useScannerEngine.ts` plus the required architecture, roadmap, status and session handoff documents.
- The service now exposes a stream-identity ended-track subscription. The scanner hook invalidates stale startup/decoder work, stops controls and makes at most one automatic recovery attempt per open session; repeated interruption requires user retry.
- The user created a matching Local branch and ran `npm run preflight` successfully before this GitHub patch. That baseline is not a post-patch verification.
- Preserve the Local untracked paths `artifacts/` and `tatus --short`; their contents have not yet been reviewed. Do not clean, overwrite, or stage them as part of this task.
- Next: fetch/synchronize this branch in Local, review diff, rerun preflight, and perform Android Chrome/iOS Safari scanner lifecycle QA. No PR, merge, or deployment until the user approves.
### Review follow-up — stale stream ownership guard (2026-11-06)
- Full source review found that a stale startup path could invoke the shared global camera release after a newer scanner instance acquired its stream. This was a real ownership race in the singleton service.
- releaseCameraStream(expectedStream?) now supports identity-guarded release; no-argument calls preserve intentional global release semantics. Scanner startup cleanup passes the exact stream and ignores stale errors when its generation is no longer current.
- Source patch is on phase-1-2f-camera-lifecycle; no post-patch local build or device QA has been run yet.
- Next: fetch the latest branch, inspect the local diff, run npm run preflight, then perform scanner QA on Android Chrome (and iOS Safari if available). Preserve local untracked paths artifacts/ and tatus --short. Do not PR/merge/deploy until accepted.
- Stream-scoped release deliberately does not invalidate or clear a separately pending getUserMedia request; only the no-argument global release changes the request generation and clears the pending request.


## Current task handoff — P0 scanner lifecycle serialization (2026-11-07)
- Active branch: `fix/scanner-p0-lifecycle-serialization`, based on `main` at `7f35fc095dd89741919005af067ca3f4285c6ea6`.
- Source files changed: `src/shared/services/cameraSession.ts`, `src/platform/scanner/universalScannerSession.ts`, `src/features/scanner/hooks/useScannerEngine.ts`.
- Current source now uses reference-counted camera leases. Scanner sessions release their own lease; global release is reserved for logout/forced shutdown. The hook also retries startup after an awaited stale attempt settles without reaching scanning.
- Technical documents updated in the same branch: `ARCHITECTURE.md`, `ROADMAP.md`, `IMPLEMENTATION_STATUS.md`, `SESSION_LOG.md`.
- Verification status: not run in this remote editing session. No claim of build, tests, browser QA or device QA passing.
- Immediate next action: inspect the branch diff and run `npm run preflight`; add lifecycle tests for lease concurrency and pending-start races; then verify rapid open/close, background/foreground, Home and Stocktake on iOS Safari and Android Chrome.
- Do not merge or deploy. User approval is required after verification.



## Current handoff snapshot — 2026-11-07 (after P0 merge)

This section is the latest handoff snapshot and supersedes older task sections above where they describe P0 as active/unmerged. Older entries remain as history.

- Repository: `banjk124-hub/retailos-home`; default branch: `main`.
- P0 scanner lifecycle serialization PR #24 is merged to main at `0ece0c95523a3846f1f2e06ac9d732c3e5a2f2d8`; its GitHub CI passed TypeScript and production preflight. Do not infer physical-device QA or deployment from that CI result.
- Current source decode cadence is 110 ms; historical 70 ms references are stale and corrected in the roadmap/architecture addenda.
- Camera sessions own reference-counted leases. Global camera invalidation is reserved for app-level forced shutdown/logout.
- Latest agreed plan: P0 device QA → performance diagnostics/baseline → Phase 1.2G motion/rendering/interaction audit and fixes → 1.2H decoder optimization if profiling justifies it → 1.2I angled barcode capability → 1.2J cross-platform validation.
- Phase 1.2G–1.2J are planned only. This documentation update does not implement scanner source changes.
- Preserve Home cached lookup, Stocktake form-fill/explicit-save, duplicate rows, manual entry, barcode formats, auth/session, Apps Script, IndexedDB, service worker and PWA deployment contracts.
- Before source edits: inspect current source and branch/diff; gather baseline measurements; isolate one bottleneck and one coherent patch at a time. Do not tune decoder cadence/resolution or rewrite motion globally without evidence.
- No merge/deploy without explicit user approval.


## Current handoff snapshot — Phase 1.2G-A (2026-11-07)

- `main` is at `d17115046922d157405694f86afcf5951445a179`; current work is isolated on `feat/scanner-phase-1-2g-instrumentation`.
- G-A source instrumentation has been added to camera acquisition, autofocus, video/decoder readiness, first accepted result, decoder processing stages, teardown, callback gaps, long tasks, layout shifts (when supported) and React UI phase commits.
- A targeted mounted guard prevents scanner hook callbacks and async completion from updating React state after unmount/close.
- G-B source audit found motion candidates: 420 ms sheet entrance, 200 ms sheet/backdrop transitions, several 280–360 ms library-card transitions, and layered Home glass/backdrop blur/shadows. These are not yet proven bottlenecks.
- No motion timing, camera resolution, 110 ms decode cadence or decoder algorithm has been tuned. No Home/Stocktake business contract changed intentionally.
- GitHub CI run #63 passed scanner validation, TypeScript/production build, GitHub Pages build and whitespace checks on latest source commit `e46c19542ca1eef12b1ce03b21a7e3d404f6f500`. Local npm execution, browser Performance trace and physical iOS/Android QA remain outstanding.
- Next: inspect diff, run all available scanner/build checks, then collect comparable Android Chrome and iOS Safari traces before selecting one targeted G-E optimization. Do not merge/deploy without explicit user approval.

## Current handoff snapshot — Scanner Patch 1 early preview (2026-11-07)

This is the latest task snapshot and supersedes older “active task” labels above where they conflict. Earlier entries remain historical records.

- Repository: `banjk124-hub/retailos-home`; default branch: `main`.
- Active branch: `fix/scanner-phase-1-early-preview`, based on `main` at `3a6e9afc76d7e49c69b27c05371087ba6c29f706`.
- Source patch commit before documentation synchronization: `807ec386043a1cbfe5fccc9ef187b0c7b1fd5e5b`.
- Draft PR #29: https://github.com/banjk124-hub/retailos-home/pull/29 — not merged, not deployed.
- Patch 1 separates camera preview readiness from decoder/scanning readiness. The session calls `onPreviewReady` after the first usable video frame and before decoder creation; the hook exposes `isPreviewReady`; Home and Stocktake reveal the live video and hide the startup placeholder at that milestone.
- CI run #79 (`42388939459`) passed: TypeScript and production builds, including the local-equivalent preflight. This does not prove real-device camera behavior.
- No autofocus, resolution, decoder, ROI, cadence, barcode-validation, business-flow or persistence behavior was changed.
- Required next work: local branch synchronization and full diff review; local `npm run preflight`; first-open and resume QA on iOS Safari/PWA and Android Chrome/PWA; verify preview appears before decoder readiness without implying scanning is ready.
- Preserve existing untracked local files (including previously reported `artifacts/` and any other unreviewed paths). Do not clean or overwrite them.
- Patch 2 (autofocus acquisition behavior) remains separate and is not authorized by Patch 1. Phase 2 recognition improvements remain out of scope.
- Do not merge, publish or deploy without explicit user approval.


## Current handoff snapshot — Scanner Patch 2 non-blocking autofocus (2026-11-07)

- Repository: `banjk124-hub/retailos-home`; default branch: `main`.
- Base commit: `93eff4fa10154ea3d3499e12d946309850ab1164`, after Patch 1 / PR #29 was merged.
- Active branch: `fix/scanner-phase-1-2-autofocus-nonblocking`.
- Patch 2 changes only the camera acquisition boundary and its regression coverage: `cameraSession.ts` returns a live stream without awaiting optional autofocus; track-ended monitoring is installed before focus work begins.
- `requestContinuousAutofocus()` remains capability-gated and best-effort. Its existing result categories and privacy-safe diagnostics are retained. Late results for stale streams/generations are ignored.
- Added a regression test with a deliberately pending `applyConstraints()` Promise. It checks that the camera lease resolves before autofocus settles and that the ended listener is registered.
- Technical documents synchronized: Architecture ADR-009, Roadmap Patch 2, Implementation Status, Project Context and Session Log.
- Not yet verified in this task: local npm preflight, GitHub Actions CI, real iOS Safari/PWA and Android Chrome/PWA first-open/resume/focus behavior.
- Preserve camera constraints, 110 ms decode cadence, decoder/ROI, barcode validation, Home and Stocktake business behavior, persistence, auth/session and deployment configuration.
- Next: synchronize locally without disturbing untracked files; inspect full diff; run `npm run preflight`; collect device QA evidence. Do not merge or deploy without explicit user approval.


### Patch 2 verification update — 2026-11-07
- GitHub Actions run #84 (`42393062148`) passed the full `npm run preflight`, including the new delayed-`applyConstraints()` regression, TypeScript/production build, Pages build and diff checks.
- Non-blocking regression behavior is now verified in CI: camera lease acquisition resolves while the mocked autofocus Promise remains pending, and the ended listener is already installed.
- CI emitted a non-fatal EBADENGINE warning: `@zxing/library@0.23.0` declares Node >=24 while the current workflow uses Node 22. Vite also emitted its existing large-chunk warning. Neither caused failure.
- Local Windows/PowerShell execution and physical iOS Safari/PWA + Android Chrome/PWA QA are still required. Do not treat CI as device verification.


### Latest Patch 2 PR-head CI — 2026-11-07
- Final PR head `a31d40315eaeb9f90ce209da4fef6341e8836025` passed GitHub Actions run #85 (`42393150965`), including locked dependency install and full `npm run preflight`.
- This verifies the latest documentation-synchronized branch head, not only the earlier source/test commit.
- Local Windows/PowerShell preflight and physical iOS/Android camera QA remain outstanding.

## Current handoff snapshot — Supplemental Scanner UX Transition (2026-11-08)

This is the latest active task snapshot and supersedes older active-task labels above where they conflict. Earlier entries remain historical.

- Repository: banjk124-hub/retailos-home; base branch: main at 36b8ca7457c9df7bb3f26105660605c66070b9ea.
- Active branch: feat/scanner-ux-transition; Draft PR #31: https://github.com/banjk124-hub/retailos-home/pull/31.
- Latest recorded head: 9e2e1bbe568d0d7be41d253fde4dfd2218634955.
- Camera acquisition begins in the Home/Stocktake tap handler and is handed to the mounted scanner through a single-claim, cancellable lease request.
- Home scanner opens as a full-screen camera surface without a card/frame. Stocktake retains its existing framed scanner UI. Their presentation code remains independent.
- The animation does not gate camera acquisition or first-frame readiness. Browser/OS permission prompt timing remains browser-controlled.
- GitHub Actions run #89 (42400411255) passed full preflight. No local PowerShell or physical iOS/Android QA is claimed.
- Required next steps: preserve and inspect the local working tree before syncing; review the full branch diff including documentation; run local npm run preflight; perform first-open permission, denial/retry, close-while-pending, rapid open/close, background/foreground and scan regression checks on iOS Safari/PWA and Android Chrome/PWA.
- Do not merge, deploy or close the PR without explicit user approval.
- Once this supplemental patch is accepted, return to the existing Phase 1.2G–1.2J roadmap. The patch does not complete Phase 1.2G.


## Current handoff — Post-merge Scanner stabilization (2026-11-08)

- Main base: `56fbd1dab5e6fafd1976a7932a7a5a64e96c1bd4`.
- Active branch: `fix/scanner-lifecycle-preview-stability`; Draft PR #32.
- Main remains unchanged. No merge or deployment has been performed for PR #32.
- Implemented: Home transition class/style wiring; stale lifecycle UI write prevention; active-start promise ownership guard; Home/Stocktake preview flex sizing; independent module exit transitions; regression guards.
- Protected: camera lease/refcount, camera constraints, autofocus, decoder, ROI, 110 ms cadence, validation, Home lookup, Stocktake form-fill/explicit-save, duplicate rows, manual entry and persistence.
- GitHub Actions run #109 (`42451179152`) passed full preflight on the previous docs-synchronized head `e2ce5f6b2c70c3e6e2cd3660cde5e46ff9f698d4`. Additional documentation-only synchronization commits followed; CI has not yet rerun on the current documentation head. Next inspect the complete PR diff locally and run local `npm run preflight`.
- Physical QA still required on iOS Safari/PWA and Android Chrome/PWA: permission grant/deny/retry, open/close while pending, rapid reopen, background/foreground, first usable frame, result exit, scan accuracy, Stocktake explicit save, and reduced-motion behavior.
- Preserve all existing local changes and untracked files during sync. Do not use destructive Git cleanup. Do not merge/deploy without explicit user approval.

### PR #32 CI verification — 2026-11-08
- GitHub Actions run #107 (`42451111883`) passed on source/test head `b3df0a683ab76237c1908e4adb01f36109fc95c6`.
- Passed: locked dependency installation and full `npm run preflight`, including scanner regression suite, TypeScript/production build, GitHub Pages build and diff checks.
- Run #109 (`42451179152`) passed on the latest documentation-synchronized head `e2ce5f6b2c70c3e6e2cd3660cde5e46ff9f698d4`.
- Local Windows/PowerShell preflight and physical iOS Safari/PWA + Android Chrome/PWA QA remain outstanding.


## Historical task — PR B Scanner Lifecycle Contract (2026-11-08)

- Branch: `feat/scanner-lifecycle-contract`, based on main `fa0d007d42bf480799e29b6003aeea2b2cd52112`.
- Scope: shared lifecycle event vocabulary/adapter, truthful camera-release and disposal milestones, deterministic regression tests, synchronized technical documentation.
- The event vocabulary is not a compulsory linear workflow. READY/SCANNING may be skipped on early close; EXIT_PRESENTATION is optional and feature-owned. Suspend/resume is not terminal exit.
- Engine emits CAMERA_RELEASED after releasing its lease and before awaiting decoder disposal. DISPOSED follows completed engine teardown.
- Home and Stocktake are not migrated in PR B. PR A opening presentation and PR C snapshot/exit handoff remain separate.
- Run `npm run preflight` after syncing the branch. Current remote editing has not run tests/build or physical device QA.
- Preserve local changes/untracked files. Keep PR unmerged/undeployed until explicit approval.
\n\n### PR B corrective audit — CI run #130\n- Run #130 failed at the new lifecycle test, not dependency installation or the existing scanner test.\n- The source-order assertion incorrectly compared method declaration offsets. It was rewritten to inspect execution ordering inside each method boundary.\n- A second real defect was found: the hook declared `lifecycle` in its options type but failed to destructure and forward it. This is fixed and guarded by the test.\n- Await a new CI run on the latest branch head before treating the PR as passing. Local Windows and physical iOS/Android QA remain outstanding.\n\n- Follow-up CI run #137 failed on a brittle string assertion in the test guard (newline escaping); corrected the guard to be whitespace-independent. Recheck latest CI before claiming pass.\n\n\n### PR B CI verification — run #142\n- Latest synchronized branch head `3e67397260993778a69eb1a5d2eb7a8216bd3044` passed GitHub Actions run #142 (`42465469769`). Full preflight passed, including both scanner regression suites and both production builds.\n- Local Windows preflight and physical iOS/Android QA remain outstanding. Keep PR #36 Draft and do not merge/deploy without explicit user approval.\n