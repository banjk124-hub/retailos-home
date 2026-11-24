# Scanner History — investigations, decisions and phase evidence

**Purpose:** preserve implementation archaeology without presenting historical plans as current production instructions.
**Current production specification:** [SCANNER_ENGINE.md](./SCANNER_ENGINE.md).

## Reading rules

1. `SCANNER_ENGINE.md` is the only current Scanner specification.
2. This document is an archive of investigations, phase work, incidents and decisions. Some recorded symptoms were fixed; some proposals were never adopted.
3. The Worker prototype and production QA diagnostics collector/monitor were retired from active code during scanner cleanup. They are historical only, not supported runtime features.
4. Verify any old finding against current source and CI before acting. Do not reapply a historical workaround without reproducing the symptom.
5. Do not treat CI as optical/device acceptance.

## Evolution summary

### Decoder replacement

The project moved from the legacy ZXing JavaScript decoder to ZXing-C++ WASM. The capability comparison and adapter evidence explain which operations moved to the native backend and which remain shared RetailOS preprocessing/validation responsibilities. The accepted result is a single WASM backend, not a dual-engine arrangement.

### Recognition pipeline and geometry

Earlier stages extracted a common recognition pipeline, source-frame ROI mapping, rotation/deskew, geometry correction, enhancement and bounded scale generation. The sequence of SCAN-01 through SCAN-12 documents the evolution from input contracts through adaptive runtime. These stage documents are retained as historical evidence, not separate current subsystems.

### Adaptive processing (A1/A2/A3)

A1 quality profiling, A2 adaptive processing and A3 runtime budgeting progressively bounded optional image work. The current production contract and hard resource limits are in SCANNER_ENGINE.md; the old plans preserve rationale and sequencing.

### Camera health and focus recovery

SC-02 introduced frame-progress health monitoring and bounded recovery through the existing session lifecycle. SC-03 added geometry signature/revision protection while preserving the existing mapper and fail-closed ROI contract. SC-04 added passive focus guidance with a zero post-preview camera-constraint write budget. The implementation boundaries are documented in the canonical engine specification.

### Integration and closure

SC-05 consolidated shared Home/Stocktake composition and added a cross-layer source-contract check. Its software scope closed through PR #149 and test-only follow-up PR #150. Physical device/corpus acceptance was tracked separately; do not interpret software closure as an exhaustive optical/device validation.

### Worker and diagnostics retirement

A Worker prototype was investigated during SC-01, but it did not become part of the production runtime. It lacked production integration and sufficient transport/device parity evidence. During scanner ecosystem cleanup PR #153, the unused Worker prototype and the production-facing diagnostics collector/QA Monitor surface were removed. The production path remains Main Thread ZXing-C++ WASM. The benchmark harness and actual WASM integration tests were retained.

## Phase and PR evidence

| Milestone | Evidence / change | Historical boundary |
|---|---|---|
| Decoder migration | PR07 capability adoption and decoder capability evidence | Current adapter contract is authoritative in SCANNER_ENGINE.md |
| SC-01A / SC-01B / SC-01C | Worker transport investigation/prototype | No production Worker path accepted |
| SC-02 | PR #144, camera health controller | Bounded recovery software contract; physical fault injection remains separate |
| SC-03 | PR #146, geometry diagnostics/revision guard | Preserved pure mapper and fail-closed ROI |
| SC-04 | PR #148, passive focus recovery | No camera constraint writes or autofocus command |
| SC-05 | PR #149 integration and QA protocol; PR #150 test-only follow-up | Software closure, not quantified optical acceptance |
| Ecosystem cleanup | PR #153 | Removed unused Worker prototype and production QA diagnostics surface; benchmark and WASM tests retained |

## Historical source inventory

The repository accumulated multiple Scanner files. They are retained for unique forensic context, but are no longer entry points, active specifications or required reading. The canonical Engine and History documents contain the consolidated operational guidance and decision summaries.

| Historical record family | Content retained |
|---|---|
| `SCANNER_SC01A_SPIKE_FINDINGS.md` | Worker research and device QA checklist |
| `SCANNER_DECODER_REPLACEMENT_PHASE0_AUDIT_2026-11-14.md` | Decoder migration baseline and protected-contract audit |
| `SCANNER_WASM_CAPABILITY_ADOPTION_PR07.md`, `SCANNER_DECODER_CAPABILITY_EVIDENCE_PR07.md` | Native-vs-shared capability decisions and source evidence |
| `SCANNER_RECOGNITION_PIPELINE.md` | Earlier unified pipeline design and recognition contract |
| `SCANNER_DECODER_PR05_BENCHMARK_FOUNDATION.md` | Benchmark harness design and measurement methodology |
| `SCANNER_SOURCE_AUDIT_2026-11-08.md`, `SCANNER_C2_AUDIT_2026-11-08.md` | Initial audits and their point-in-time findings |
| `SCANNER_BACKGROUND_RECOVERY_AUDIT_2026-11-08.md`, `SCANNER_TORCH_AUDIT_2026-11-09.md`, `SCANNER_AUDIO_LIFECYCLE_2026-11-09.md`, `SCANNER_VIDEO_PRESENTATION_AUDIT_2026-11-09.md` | Platform, lifecycle, audio and presentation investigations |
| `SCAN_01_INPUT_CONTRACT.md` – `SCAN_06_BOUNDED_DESKEW.md` | Input, ROI, coordinate, rotation, geometry and deskew stage notes |
| `SCAN_07_11_RESEARCH_AND_IMPLEMENTATION_PLAN.md`, `SCAN_07_ADAPTIVE_ROI_MULTISCALE.md`, `SCAN_07_SYSTEM_SYNCHRONIZATION_AUDIT.md`, `SCAN_08_09_UNIFIED_IMPLEMENTATION.md`, `SCAN_10_ADAPTIVE_IMAGE_QUALITY_A1.md`, `SCAN_11_ADAPTIVE_PROCESSING_A2.md`, `SCAN_12_ADAPTIVE_RUNTIME_A3.md` | Research, synchronization, enhancement and adaptive processing evolution |
| `SESSION_LOG.md` | Chronological handoffs and issue breadcrumbs |

## Incident note template

For a new reproducible scanner incident, record:

- **Observed:** exact user-visible or measured symptom.
- **Environment:** device class, OS, browser/PWA, feature and scan mode.
- **Evidence:** reproduction steps, safe metrics, sample-image reference and commit.
- **Cause:** confirmed / suspected / unknown.
- **Resolution:** PR/commit and changed behavior.
- **Regression guard:** test or acceptance check.
- **Status:** open / mitigated / fixed / not reproducible / superseded.

Never record decoded barcode payloads, employee identifiers, camera IDs or personal data in diagnostics/history.

## Detailed historical phase notes

### SC-02 — Camera Health Controller

Added bounded frame-progress monitoring and recovery in the shared session. A 1-second watchdog detected 3-second frame stalls; native video-frame callbacks were preferred and RAF fallback required media timeline progression. Track mute degraded health; track-ended requested immediate recovery. Recovery used the existing serialized session replacement path, one automatic attempt per mounted activation and error escalation on exhaustion. PR #144 and CI evidence are preserved in the historical records. Live stall/reacquisition and device/browser matrix results must be treated as separate evidence.

### SC-03 — Geometry Diagnostics

Added privacy-safe geometry fingerprints, monotonic revision epochs, stale-ROI clearing and older-revision rejection while preserving the existing pure mapper. Invalid geometry remained fail-closed; no full-frame/center fallback was added. PR #146 and CI #1332 evidence were recorded. Physical iOS/Android viewport/orientation behavior was not inferred from CI.

### SC-04 — Focus Recovery Policy

Added passive states `observing`, `waiting-native-autofocus` and `recovered`, reusing baseline ROI samples, motion guard, four-sample blur gate and cooldown. No `applyConstraints`, autofocus re-arm, stream restart/reacquisition, extra capture or added timer. PR #148 merged at `0b6840c9b2872d93920d4eba5f628158e09679b4`; CI #1348 passed. Physical lens behavior remained a separate device observation.

### SC-05 — Integration & QA

PR #149 merged at `e0579fa1734eac989af051c4776cc88de912c946`; final PR-head CI #1375, post-merge CI #1376 and Pages deployment #151 passed. PR #150 test-only follow-up merged at `661241e721a5510cf3f61c8ba7c3971c82b6a63c`; CI #1384, post-merge CI #1385 and Pages deployment #152 passed. Software integration scope closed. Physical optical/device acceptance was tracked separately and must not be claimed without run records.

### 2026-11-24 — Scanner ecosystem cleanup

PR #153, `chore(scanner): retire unused diagnostics and Worker prototype`, removed the Home-startup console collector, QA Monitor UI/settings entry/QA styling and exports, and the unused Worker prototype/bridge/test/command. Orphan capability types were removed; `ScannerPoint` was retained because it is still used by the result contract. Runtime camera/session/decoder/ROI/recovery logic was not the cleanup target. CI #1389 passed preflight, TypeScript/production build, Pages build and bundle comparison. The project owner subsequently confirmed merge, deployment and stable operation without observed errors.

## Consolidated history from repository-wide documents

The following Scanner-specific details were duplicated in general-purpose logs and are now treated as part of this archive:
- Early scanner foundation, camera lease ownership and lifecycle fixes (2026-11-05 to 2026-11-08).
- Home/Stocktake presentation ownership, first-frame readiness and Torch/audio feedback decisions (2026-11-08 to 2026-11-09).
- Module-owned input contract, geometry/ROI, rotation, deskew, adaptive image processing and WASM migration (2026-11-10 to 2026-11-14).
- Camera request bridge, focus constraints and native autofocus ownership decisions.
- SC-01 to SC-05 milestones and the PR #153 Worker/QA diagnostics retirement recorded above.

The long-form source audits, research plans and remaining QA records are retained at their original paths as archival evidence. `SCANNER_WORKSTREAM_SC01_05.md` and `SCANNER_SC05_INTEGRATION_QA.md` remain available as detailed historical records, but are intentionally omitted from the compact inventory above because their phase-level history is already summarized here. None is a current specification or default AI context entry point.


## Scanner-specific decisions migrated from DECISIONS.md

The following subsystem-specific decision records were removed from the cross-project decision register to avoid duplicate Scanner decision inventories. Their content is preserved below; current behavior is defined only by SCANNER_ENGINE.md.

## ADR-012 — Scanner-first adaptive resource profiles and shared engine completion
**Status:** A3 runtime-pressure controller merged by PR #100 at `913c0a59c234d55a22cdc0479beb8ce4ca78f6ba`. PR-07 (#114, Draft) implements advisory Low/Mid/High capability classification and corrected windowed timing diagnostics. Physical-device calibration and profile-specific policy tuning remain open.

### Context
The shared scanner is already separated into feature-owned UI, a React bridge, a platform session, camera leases and decoder adapters. Before PR-07, the hook passed `profile: 'HIGH'` unconditionally and the former profile type exposed `COMPACT | STANDARD | HIGH`; neither represented device classification.

### Decision
- Re-scope Phase 1.2I as Shared Scanner Engine Completion.
- Define scanner-first Low/Mid/High resource profiles in Phase 1.2J; defer app-wide activation until scanner policy is measured and proven.
- Use Low/Mid/High as an advisory scanner device profile, derived only from coarse `deviceMemory` and `hardwareConcurrency` hints when available.
- LOW is selected when either available hint indicates constrained capability; HIGH requires both independent hints to be strong; unknown devices fall back conservatively to LOW.
- Keep A3's measured runtime-pressure controller as the only processing-budget authority. Device tier alone does not reduce fallback budgets; tier-specific tuning requires representative physical-device measurements.
- Barcode allowlist/validation, baseline-first recognition, scan accuracy, session ownership, callback delivery, persistence and feature workflows are hard invariants.
- Home and Stocktake presentation remain independently owned while sharing the engine.
- Do not assume universal battery/temperature telemetry in iOS Safari or Android Chrome. Use privacy-safe runtime proxies with hysteresis and conservative fallback; do not claim direct thermal measurement.
- Never lower camera resolution, decode cadence, ROI coverage or recovery paths merely because a device is classified LOW. Such changes require measured scan-accuracy and per-stage processing-cost evidence.

### Consequences
- Profile selection is advisory and must degrade safely when capability data is missing.
- Profile transitions must not create a second camera request, decoder, frame loop or session.
- Phase 1.2G is bounded at instrumentation/source audit; further optimization is issue- or measurement-driven.
- Angled/perspective decode is an optional capability within engine completion, not the entire 1.2I phase.

See `SCANNER_SOURCE_AUDIT_2026-11-08.md` for source evidence and acceptance gates.




---

## ADR-022 — Separate module scan intent from source-frame processing geometry (2026-11-10)
**Status:** Contract merged by PR #58. Preview geometry is now mapped and published through the SCAN-02/03 feature-owned binding, and SCAN-04 consumes the resulting source ROI. The aggregate `ScannerModuleConfig` is not yet a runtime input: `cameraRequest` remains declarative while the shared camera lease uses the fixed production default. Do not claim the full aggregate bridge is complete.

### Decision
- Feature modules own a `ScannerModuleConfig` containing a `preview-content-normalized` scan region and a `ScannerCameraRequest`.
- Shared scanner processing consumes a resolved `source-frame-normalized` region only after the pure mapping step in SCAN-02.
- Rectangles use normalized fractions with a top-left origin and explicit coordinate-space discriminators.
- Camera preferences are independent of preview aspect ratio. At the time of SCAN-01, the default was environment / 1280×720 / 30 FPS. **Superseded by SCAN-07 / ADR-038:** current preference is environment / 1920×1080 with a 30 FPS maximum; actual browser negotiation remains authoritative.
- Home and Stocktake retain independent presentation and reticle ownership.

### Constraints
- No DOM geometry barrier during camera startup.
- Mapping must account for object-fit, object-position, source dimensions and mirroring.
- Region updates must not recreate the camera/session/decoder/frame loop.
- Strict ROI mode must reject invalid/missing region data; no silent full-frame fallback after strict mode is enabled.
- No lifecycle, decoder algorithm, barcode policy, business flow or dependency changes in SCAN-01.

### Acceptance
See `docs/ai-context/SCAN_01_INPUT_CONTRACT.md`.




---

## ADR-023 — Pure preview-to-source scanner geometry mapping (2026-11-10)
**Status:** Merged by PR #59 at `891a3a6c8c85442d0b4a253c1fca43b36b590f1c`; Home and Stocktake runtime consumers were wired in merged SCAN-03 (PR #61).

### Decision
- Add a pure mapper from `preview-content-normalized` to `source-frame-normalized` coordinates.
- Model CSS `object-fit` (`fill`, `contain`, `cover`, `none`, `scale-down`), normalized `object-position`, visible image intersection and explicit horizontal mirroring.
- Require callers to provide intrinsic source dimensions and the video element's measured content-box dimensions.
- Return a discriminated success/failure result. Invalid input never silently falls back to full-frame geometry.

### Constraints
- The mapper must not read DOM, window, video elements, media streams, React state or camera/session resources.
- The platform session must not add a DOM geometry startup gate.
- Home and Stocktake remain presentation owners; SCAN-02 does not wire or infer their reticles.
- No camera lifecycle, decoder, ROI decode, barcode policy or CSS changes.

### Acceptance
See `docs/ai-context/SCAN_02_GEOMETRY_MAPPING.md` and `scripts/test-scanner-geometry.mjs`.




---

## ADR-024 — Feature-owned preview region integration (2026-11-10)
**Status:** Merged by PR #61 at `4804a0b0f06113e43a06e8b171d05dbad6fb1a8f`; user confirms iOS and Android geometry verification. SCAN-04 consumes the mapped region.

### Decision
- Home and Stocktake independently own their video and reticle elements.
- A feature-level adapter measures their DOMRects and computed object-fit/object-position after scanner readiness, then uses the pure SCAN-02 mapper.
- Publish the resulting source-frame region into the active session using an in-place setter/getter.
- Resize/viewport updates must not restart the camera, decoder, session or frame loop.
- Invalid geometry clears the region; no full-frame fallback is permitted.

### Constraints
- No shared UI/reticle or presentation ownership.
- No decoder crop/ROI-only decoding, camera/lifecycle/readiness/cadence, validation or business-flow changes.
- Verify real reticle alignment on iOS Safari/PWA and Android Chrome/PWA after deployment.

### Acceptance
See `docs/ai-context/SCAN_03_MODULE_REGION_INTEGRATION.md`.




---

## ADR-025 — Strict decoder consumption of module-owned source ROI (2026-11-10)

**Status:** Merged/deployed by the user; normal scanner operation confirmed. Detailed optical stress scenarios were not individually recorded.

### Context
SCAN-03 publishes a mapped `source-frame-normalized` reticle region into the active session. The previous ZXing adapter still decoded the full frame first and then tried a hard-coded centered crop, so the actual module scan intent did not constrain decoder work.

### Decision
- Each decoder invocation receives the current session region with its timestamp.
- A pure resolver validates the coordinate-space tag and rectangle, then converts normalized bounds into integer source pixels using floor-leading/ceil-trailing rounding and source-frame clamping.
- ZXing draws only that source crop into its working canvas and decodes the ROI. The full-frame-first pass and fixed centered fallback are removed.
- Missing or invalid geometry is a decode miss, not a decoder error, and must never trigger full-frame fallback.
- Historical SCAN-04 baseline: supported barcode allowlist, then-current binarizer schedule, 1.5× aspect-preserving ROI upscale and 110 ms cadence. The cadence/binarizer policy was intentionally superseded by SCAN-05/06 (ADR-026/027); strict ROI, allowlist, validation and result-delivery policy remain.

### Constraints
- No camera acquisition/lease, readiness, lifecycle/recovery, frame scheduling, CSS, Home/Stocktake UI or business-flow changes.
- No rotation, deskew, perspective correction, adaptive exposure or camera-constraint changes in SCAN-04.
- Physical barcode accuracy/performance QA on iOS Safari/PWA and Android Chrome/PWA is required before release acceptance.

### Acceptance
See `docs/ai-context/SCAN_04_STRICT_ROI_DECODING.md` and `scripts/test-scanner-roi-decoder.mjs`.




---

## ADR-026 — Continuous ROI orientation recovery (2026-11-10)

**Status:** Accepted and merged by PR #67 at `9406ac30d53bc9984912bd1928a32fd78157cf60`; final PR-head CI #432 passed. User confirms deployed operation is good.

- ZXing's existing `TRY_HARDER` path retains 180° 1D scanline reversal.
- Keep an exact clockwise 90° ROI transform as a fast path after an upright miss; run it on the current valid ROI frame, not every third frame.
- Follow the quarter-turn miss with continuous orientation estimation over the signed half-turn range; do not enumerate a fixed angle list.
- Use the latest strict module-owned ROI only. Missing/invalid geometry remains fail-closed with no full-frame or centered fallback.
- The shared session minimum decode interval is 70 ms; decode calls remain serialized.
- Preserve camera/session/lifecycle, validation, result delivery and Home/Stocktake feature contracts.
- See `SCAN_05_ORTHOGONAL_ROTATION.md` and `scripts/test-scanner-rotation.mjs`.



---

## ADR-027 — Continuous in-plane orientation correction (2026-11-10)

**Status:** Accepted and merged by PR #67 at `9406ac30d53bc9984912bd1928a32fd78157cf60`; final PR-head CI #432 passed. User confirms deployed operation is good.

- Estimate the dominant ROI gradient orientation using a 180-bin Sobel histogram, directional-energy concentration and local coherence.
- Normalize the estimate modulo 180° into a signed ±90° range; ignore estimates below 0.65° and reject low-confidence/ambiguous textures.
- Apply a percentile-based contrast stretch only for compressed 1st–99th percentile ROI ranges (24–219 luminance levels), then inverse-angle bilinear correction with expanded bounds and a 6,000,000-pixel allocation ceiling.
- Evaluate the original and quarter-turned ROI representations; attempt correction candidates in ascending absolute angle.
- Use HybridBinarizer and GlobalHistogramBinarizer as successive decode strategies for each candidate. ZXing's valid format/checksum result remains the only accepted output.
- Count estimator invocations, confidence/angle-gate misses and decode hits separately.
- Perspective/keystone correction, curved-label dewarping and camera acquisition/focus changes remain out of scope.
- See `SCAN_06_BOUNDED_DESKEW.md` and `scripts/test-scanner-deskew.mjs`.




## Scanner implementation chronology migrated from CHANGELOG_AI.md

The following Scanner-related changelog entries are preserved as historical implementation evidence. The general changelog remains focused on cross-project changes.

## 2026-11-10 — SCAN-05/06 post-merge audit and deployed acceptance

- PR #67 [SCAN-05/06] Continuous barcode orientation recovery is merged and closed at merge commit 9406ac30d53bc9984912bd1928a32fd78157cf60; main is identical to that commit at audit time.
- Final PR head c9794a5422aa2d6ace16480c2948c1bae3e0d06b passed GitHub Actions CI run #432 (full preflight, TypeScript, production build, GitHub Pages build and diff checks). Executable source head e0b28787f40db8c811bc7fde912bae2558289198 passed CI #425; the 13 commits between those heads were documentation-only.
- User confirms deployment and successful real-world operation; recognition is described as sensitive across multiple processing paths.
- Audited the merged source and technical records. Found stale Draft/pending/deploy wording, stale CI #411 references, and architecture/current-source notes still claiming a 110 ms cadence and every-third-frame binarizer policy.
- Updated SCAN-05/06, SCAN-04 supersession note, ADR-026/027, Architecture, Implementation Status, Roadmap, Acceptance Checklist, AI Handoff, Project Context and Session Log.
- Functional acceptance is recorded as user-confirmed. Detailed device/browser/module/symbology matrix and quantitative latency/CPU/success-rate evidence remain unreported and are not claimed.
- No executable logic or runtime behavior changed. One duplicated word in the scannerDeskew.ts resampling comment was corrected; this is a documentation/source-comment synchronization branch.



---

## 2026-11-10 — SCAN-05/06 corrective continuous orientation recovery

- Intent: correct the missed sideways and intermediate-angle barcode cases reported after the earlier consolidated delivery; prioritize accuracy and responsiveness over a strict ultra-low-end CPU budget.
- Baseline: PR #66 was merged to `main` at `8571db7ea75f558397abe618e88fb2d0e1395616`; corrective work is isolated on Draft PR #67, branch `fix/scan-05-06-continuous-orientation`.
- Files: `scannerDeskew.ts`, `scannerRotation.ts`, `zxingDecoder.ts`, `universalScannerSession.ts`, scanner rotation/deskew/production-adapter tests, SCAN-05/06 specs, ADRs, handoff, roadmap and acceptance records.
- Behavior: replace the single global structure tensor with a 180-bin Sobel gradient-orientation histogram and confidence gates; normalize continuous in-plane angles across ±90°; run upright, quarter-turn and deskew candidates on each valid ROI miss; use Hybrid and GlobalHistogram binarizers; reduce minimum session decode interval to 70 ms while keeping decode serialized; expose estimator misses; suppress only expected ZXing 0.23.0 NotFoundException warnings.
- Checks: CI run #425 passed full preflight, continuous angle sweep through ±75°, 90°/270°, combined quarter-turn+skew, Code 128, EAN-8/EAN-13, low-contrast 40/255, ambiguous texture, strict ROI/no-fallback, TypeScript, production build, GitHub Pages build and diff checks. Expected ZXing miss warning count was zero. A 40/255 contrast fixture exposed loss during rotation; percentile-based contrast normalization was added before deskew, and the final production-adapter test passed.
- Unverified: physical iOS Safari/PWA and Android Chrome/PWA optical accuracy, first-result latency, CPU cost and UI responsiveness in Home and Stocktake.
- Risks / rollback: revert PR #67 if device QA reveals incorrect orientation estimation, unacceptable latency or regressions; do not merge/deploy before physical QA and explicit user approval.



---

## 2026-11-10 — SCAN-01 input contract
- Intent: formalize module-owned scan region and camera request before ROI implementation.
- Files: scanner contracts and SCAN-01 architecture/implementation records.
- Behavior: type/documentation boundary only; existing runtime defaults and flows unchanged.
- Checks: pending PR CI.
- Unverified: geometry mapping and device behavior are deferred to SCAN-02/03.
- Risks / rollback: low; no runtime consumer is wired in this PR.




---

## 2026-11-10 — SCAN-02 pure geometry mapper
- Intent: map module preview regions into source-frame coordinates before ROI decoding.
- Files: `scannerGeometry.ts`, `test-scanner-geometry.mjs`, `preflight.mjs`, and SCAN-02 docs/status records.
- Behavior: pure mapping for CSS object-fit, normalized object-position, visible content and mirror transforms; no runtime consumer wired.
- Checks: merged main CI run #299 passed full preflight, TypeScript, production build and GitHub Pages build. User confirms deployed smoke test with no existing-flow regression.
- Unverified: real-device Home/Stocktake alignment belongs to SCAN-03.
- Post-merge audit: no runtime geometry or architecture defect found. Corrected the test's DOM-boundary regex and added self-checks for `document.` / `window.` detection; no production runtime behavior changed.
- Risks / rollback: no runtime behavior changed; revert SCAN-02 if a future audit identifies a mapping defect.




---

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




---

## 2026-11-11 — Scanner Engine remediation and Code 39 enablement

- Main baseline: `6ac1eefad1c47d87d2c83f9002050c8a7d7802fe` (PR #74 merge).
- PR #75 branch `fix/scanner-engine-remediation-code39`: enabled Code 39 end-to-end using existing ZXing 0.23.0 support; no new dependency.
- Added standard Code 39 payload validation and production-adapter upright/180-degree regression fixtures.
- Repaired diagnostic metric filtering so ROI/rotation/deskew counters reach QA Monitor and CSV export; added privacy tests for payload/device identifier exclusion.
- Reconciled current audio values after PR #57 (50% gain 0.30, max gain 0.60, approximately 140 ms).
- Corrected scanner handoff, roadmap, architecture and acceptance documentation; clarified that the aggregate camera request contract remains declarative.
- PR #75 remains Draft/unmerged/undeployed pending review. CI #577 passed full preflight and builds. Code 39 upright/180° integration passes; a synthetic 17° deskew fixture did not decode, so angled Code 39 remains unverified. No camera/lifecycle/ROI/presentation/business-flow changes.


### 2026-11-14 — Cross-platform overlay lifecycle and documentation cleanup (PR #102)

- Intent: finish the shared UI/overlay audit on top of merged PR #101 without changing scanner camera or retail data contracts.
- Files: HomeScreen, shared body-scroll-lock service/hook, SettingsHub, Scanner QA, Scanner Settings, Stocktake and Stocktake Import; Home overlay CSS; preflight regression tests; UI overlay architecture/acceptance/index and AI context documents.
- Behavior: Home's full-screen Barcode Scanner now participates in body scroll locking. Calendar and barcode-result overlays respect dynamic viewport and horizontal safe areas. Shared lock manager remains reference-counted and idempotent.
- Documentation: added one overlay architecture source of truth and a cross-platform acceptance matrix; merged two unreferenced Login Phase 2 history files into one file while preserving distinct snapshots.
- Checks: earlier CI #832 passed on an earlier source tree. Latest PR-head CI after these changes must be checked separately.
- Unverified: physical desktop, Android and iOS device/browser acceptance; modal focus trap.
- Risks / rollback: revert the focused PR commits if the overlay lock causes a reproducible page-position or camera regression; camera/decoder, persistence and deployment files are out of scope.


---

### 2026-11-16 — Delta-aware PWA release staging
- Intent: reduce network bytes for application updates without sacrificing full offline readiness.
- Files: Service Worker template, PWA update prompt, worker runtime regression test and canonical PWA/status/handoff documentation.
- Behavior: reuse only active-cache responses whose exact bytes match candidate manifest size and SHA-256; fetch changed/missing/corrupt entries; omit removed entries; keep candidate caches complete. Report network bytes separately from reused and total release bytes.
- Storage policy: still reserve for the complete candidate because copied resources are stored in a separate release cache while the current release remains available.
- Checks run: GitHub Actions CI #1250 (`43800583013`) passed on head `c7da10651b39d517782912baf9fd0cc4a252b55f`: full preflight, worker runtime/cache-policy/platform tests, TypeScript, production/Pages builds, PR-base bundle comparison and artifact upload. Earlier CI #1243/#1246 exposed a test fixture consuming the stored Response body; the test now reads a clone.
- Risks / rollback: candidate staging remains isolated and failure cleanup removes only candidate caches. Revert the feature branch commits to restore full-download staging; do not alter active release/data caches.

