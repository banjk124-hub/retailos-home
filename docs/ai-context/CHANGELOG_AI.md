# AI implementation log

Use append-only entries. Each entry must say what was actually changed and tested.

## Template
### YYYY-MM-DD — Short title
- Intent:
- Files:
- Behavior:
- Checks run:
- Results:
- Unverified:
- Risks / rollback:

## 2026-11-10 — SCAN-05/06 post-merge audit and deployed acceptance

- PR #67 [SCAN-05/06] Continuous barcode orientation recovery is merged and closed at merge commit 9406ac30d53bc9984912bd1928a32fd78157cf60; main is identical to that commit at audit time.
- Final PR head c9794a5422aa2d6ace16480c2948c1bae3e0d06b passed GitHub Actions CI run #432 (full preflight, TypeScript, production build, GitHub Pages build and diff checks). Executable source head e0b28787f40db8c811bc7fde912bae2558289198 passed CI #425; the 13 commits between those heads were documentation-only.
- User confirms deployment and successful real-world operation; recognition is described as sensitive across multiple processing paths.
- Audited the merged source and technical records. Found stale Draft/pending/deploy wording, stale CI #411 references, and architecture/current-source notes still claiming a 110 ms cadence and every-third-frame binarizer policy.
- Updated SCAN-05/06, SCAN-04 supersession note, ADR-026/027, Architecture, Implementation Status, Roadmap, Acceptance Checklist, AI Handoff, Project Context and Session Log.
- Functional acceptance is recorded as user-confirmed. Detailed device/browser/module/symbology matrix and quantitative latency/CPU/success-rate evidence remain unreported and are not claimed.
- No executable logic or runtime behavior changed. One duplicated word in the scannerDeskew.ts resampling comment was corrected; this is a documentation/source-comment synchronization branch.

## 2026-11-10 — SCAN-05/06 corrective continuous orientation recovery

- Intent: correct the missed sideways and intermediate-angle barcode cases reported after the earlier consolidated delivery; prioritize accuracy and responsiveness over a strict ultra-low-end CPU budget.
- Baseline: PR #66 was merged to `main` at `8571db7ea75f558397abe618e88fb2d0e1395616`; corrective work is isolated on Draft PR #67, branch `fix/scan-05-06-continuous-orientation`.
- Files: `scannerDeskew.ts`, `scannerRotation.ts`, `zxingDecoder.ts`, `universalScannerSession.ts`, scanner rotation/deskew/production-adapter tests, SCAN-05/06 specs, ADRs, handoff, roadmap and acceptance records.
- Behavior: replace the single global structure tensor with a 180-bin Sobel gradient-orientation histogram and confidence gates; normalize continuous in-plane angles across ±90°; run upright, quarter-turn and deskew candidates on each valid ROI miss; use Hybrid and GlobalHistogram binarizers; reduce minimum session decode interval to 70 ms while keeping decode serialized; expose estimator misses; suppress only expected ZXing 0.23.0 NotFoundException warnings.
- Checks: CI run #425 passed full preflight, continuous angle sweep through ±75°, 90°/270°, combined quarter-turn+skew, Code 128, EAN-8/EAN-13, low-contrast 40/255, ambiguous texture, strict ROI/no-fallback, TypeScript, production build, GitHub Pages build and diff checks. Expected ZXing miss warning count was zero. A 40/255 contrast fixture exposed loss during rotation; percentile-based contrast normalization was added before deskew, and the final production-adapter test passed.
- Unverified: physical iOS Safari/PWA and Android Chrome/PWA optical accuracy, first-result latency, CPU cost and UI responsiveness in Home and Stocktake.
- Risks / rollback: revert PR #67 if device QA reveals incorrect orientation estimation, unacceptable latency or regressions; do not merge/deploy before physical QA and explicit user approval.

## 2026-10-21 — Governance pack initialized
- Intent: establish durable instructions/context so future coding agents use the same project constraints.
- Files: `AGENTS.md`, `.github/copilot-instructions.md`, `.github/skills/retailos-implementation/SKILL.md`, `docs/ai-context/*`.
- Behavior: instructions and context only; no application code changed by this pack.
- Checks run: file structure reviewed by generation process; no application build is implied.
- Unverified: current repository state and whether the previous architecture patch has been applied locally.


## 2026-11-10 — SCAN-01 input contract
- Intent: formalize module-owned scan region and camera request before ROI implementation.
- Files: scanner contracts and SCAN-01 architecture/implementation records.
- Behavior: type/documentation boundary only; existing runtime defaults and flows unchanged.
- Checks: pending PR CI.
- Unverified: geometry mapping and device behavior are deferred to SCAN-02/03.
- Risks / rollback: low; no runtime consumer is wired in this PR.


## 2026-11-10 — SCAN-02 pure geometry mapper
- Intent: map module preview regions into source-frame coordinates before ROI decoding.
- Files: `scannerGeometry.ts`, `test-scanner-geometry.mjs`, `preflight.mjs`, and SCAN-02 docs/status records.
- Behavior: pure mapping for CSS object-fit, normalized object-position, visible content and mirror transforms; no runtime consumer wired.
- Checks: merged main CI run #299 passed full preflight, TypeScript, production build and GitHub Pages build. User confirms deployed smoke test with no existing-flow regression.
- Unverified: real-device Home/Stocktake alignment belongs to SCAN-03.
- Post-merge audit: no runtime geometry or architecture defect found. Corrected the test's DOM-boundary regex and added self-checks for `document.` / `window.` detection; no production runtime behavior changed.
- Risks / rollback: no runtime behavior changed; revert SCAN-02 if a future audit identifies a mapping defect.


## 2026-11-10 — SCAN-03 module-owned preview region integration
- Intent: wire each module's existing reticle to source-frame geometry without changing presentation or scanner lifecycle.
- Files: feature-level preview measurement service/hook, scanner session region contract, Home/Stocktake ref wiring, regression tests and synchronized SCAN-03 documentation.
- Behavior: map measured reticle rectangles through visible-content bounds and the SCAN-02 mapper; store source region in place. Decoder still receives the full video.
- Checks: automated geometry/session-update suite, TypeScript, production/Pages builds and full preflight passed in GitHub Actions run #309.
- Unverified: real iOS Safari/PWA and Android Chrome/PWA reticle alignment.
- Risks / rollback: no decoder ROI or camera/lifecycle changes; revert SCAN-03 if module geometry or in-place update contract fails.


### 2026-11-10 — SCAN-04 strict module-reticle ROI decoding

- Baseline audited: main merge commit `4804a0b0f06113e43a06e8b171d05dbad6fb1a8f` (SCAN-03). User confirms iOS and Android geometry and existing scanner-flow checks passed without detected issues.
- Audit found SCAN-03 documentation still described PR #61 as Draft and physical geometry QA as pending; reconciled SCAN-03 status across its design, architecture, decision, roadmap, implementation and acceptance records.
- Source finding: ZXing still decoded the full frame first, then tried a fixed centered 82% × 66% crop; it did not consume the measured session ROI.
- Added strict decoder input `{ timestamp, scanRegion }`; each frame passes the latest defensive session region to ZXing.
- Added pure source-normalized-to-pixel crop resolver with validation, floor/ceil boundary rounding and source-frame clamping.
- Replaced full-frame and fixed-centered passes with direct ROI draw/decode. Missing/invalid geometry returns no result; no full-frame fallback.
- Preserved camera/session lifecycle, 110 ms cadence, supported symbologies, validation/result delivery and Home/Stocktake business behavior.
- Added strict ROI regression test and registered it in preflight; added SCAN-04 design, ADR-025, roadmap, implementation status, acceptance and handoff updates.
- GitHub Actions run #324 passed TypeScript, production/Pages builds and full preflight on PR head `31405dae3cd2eb358dce1e11868e861ac4ace1a8`; the subsequent status-only documentation update does not change executable code. Physical post-deploy iOS/Android barcode accuracy/performance evidence remains pending. No merge or deployment performed.


### 2026-11-10 — SCAN-05 orthogonal rotation and SCAN-06 bounded deskew

- Audited the current ZXing 1D path before adding rotation: `TRY_HARDER` already performs 180° scanline reversal; EAN-8/EAN-13 share `OneDReader`; RetailOS `RGBLuminanceSource` does not support bitmap rotation.
- Added a runtime Code 128 0°/180° baseline test and dependency inheritance guards; CI run #337 passed.
- Added SCAN-05: a pure clockwise 90° ROI luminance transform, attempted every third valid ROI frame only after upright decode misses. A single quarter-turn plus existing 180° reversal covers both 90° and 270°. CI run #338 passed.
- Added SCAN-06: Sobel structure-tensor skew estimation, 1.2°–12° acceptance bounds, inverse-angle bilinear ROI correction, expanded bounds/white fill, and a single HybridBinarizer deskew pass after upright/orthogonal misses.
- Synthetic Code 128 tests pass at ±5°/±8° and after combined 90°/270° normalization. Blank, level, invalid and >12° inputs fail closed.
- Consolidated CI run #342 passed full preflight, TypeScript, production build and Pages build on head `7bd77ffd7acd6a04e65b731b3ffa3a3e9546a7f1`.
- Updated technical designs, ADRs, roadmap, implementation status, acceptance checklist and handoff. PR #65 remains Draft/open/unmerged/undeployed; physical iOS/Android QA and low-end performance comparison remain pending.


### 2026-11-10 — Final SCAN-05/06 consolidation

- Created final consolidated Draft PR #66 on branch `feat/scan-05-06-final-consolidation`, rebased directly on the restored `main` baseline.
- Final head `98796b1cb8d8a4bd30c9eb59a975c7f4515bece6`; GitHub Actions run #350 passed baseline, orthogonal rotation, bounded deskew, existing scanner ROI regressions, TypeScript, production build, GitHub Pages build and diff checks.
- Staged PRs #63/#64/#65 were closed without merging; their changes are included in #66. PR #66 remains Draft/open/unmerged/undeployed.
- Device QA remains mandatory on iOS Safari/PWA and Android Chrome/PWA, including low-end latency/CPU comparison.

- Final consolidated PR #66 CI run #360 passed after the final branch was rebased onto the restored `main` baseline. The PR remains unmerged/undeployed pending physical device acceptance.


## 2026-11-11 — Scanner Engine remediation and Code 39 enablement

- Main baseline: `6ac1eefad1c47d87d2c83f9002050c8a7d7802fe` (PR #74 merge).
- PR #75 branch `fix/scanner-engine-remediation-code39`: enabled Code 39 end-to-end using existing ZXing 0.23.0 support; no new dependency.
- Added standard Code 39 payload validation and production-adapter upright/180-degree regression fixtures.
- Repaired diagnostic metric filtering so ROI/rotation/deskew counters reach QA Monitor and CSV export; added privacy tests for payload/device identifier exclusion.
- Reconciled current audio values after PR #57 (50% gain 0.30, max gain 0.60, approximately 140 ms).
- Corrected scanner handoff, roadmap, architecture and acceptance documentation; clarified that the aggregate camera request contract remains declarative.
- PR #75 remains Draft/unmerged/undeployed pending review. CI #566 passed full preflight and builds. Code 39 upright/180° integration passes; a synthetic 17° deskew fixture did not decode, so angled Code 39 remains unverified. No camera/lifecycle/ROI/presentation/business-flow changes.
