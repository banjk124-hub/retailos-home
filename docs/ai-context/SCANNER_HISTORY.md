# Scanner technical history and incident index

**Purpose:** preserve historical evidence without presenting old designs, workarounds or unfinished proposals as current implementation instructions.

## Reading rule

The Worker prototype and the in-app Scanner QA diagnostics collector/monitor were removed from the active codebase during the scanner ecosystem cleanup. Historical records below preserve why those experiments existed and what evidence was missing; they are not a statement that the code remains present or supported.

1. Use [SCANNER_ENGINE.md](./SCANNER_ENGINE.md) for the current runtime contract.
2. Use [INDEX.md](./INDEX.md) for the repository-wide documentation map.
3. The records below are historical evidence. A note may describe a defect that has since been fixed, a proposed architecture that was not adopted, or a test result tied to an old commit.
4. Before acting on a historical note, verify its symptom against current source and current CI. Do not reapply a fix solely because an old note recommends it.
5. Do not delete an incident note merely because its implementation is obsolete. Update its status and link to the resolving PR/commit when known.

## Migration records

| Record | What it preserves | How to use it now |
|---|---|---|
| `SCANNER_SC01A_SPIKE_FINDINGS.md` | Source/API feasibility review for Worker transports, Vite and ZXing WASM; empirical proof pending | Transport remains exploratory; no measured transport is accepted
| `SCANNER_WORKSTREAM_SC01_05.md` | SC-01A/01B/01C Worker prototype sequence through SC-05 Integration & QA; 01B merged/device-verified by user, 01C scheduling prototype/software validation closed; empirical Worker gates pending | Current stage plan; use with `SCANNER_ENGINE.md`, not as evidence of production Worker integration
| `SCANNER_DECODER_REPLACEMENT_PHASE0_AUDIT_2026-11-14.md` | Replacement baseline, risk inventory and protected contracts before WASM production cutover | Historical migration evidence; current state is in SCANNER_ENGINE.md |
| `SCANNER_WASM_CAPABILITY_ADOPTION_PR07.md` | Capability-by-capability comparison and rationale for native vs shared responsibilities | Historical adoption decisions; check current adapter options before changing |
| `SCANNER_DECODER_CAPABILITY_EVIDENCE_PR07.md` | Source evidence supporting native WASM capabilities | Evidence reference, not a runtime specification |
| `SCANNER_DECODER_PR04_RECOGNITION_PIPELINE.md` | Earlier pipeline extraction decisions | Superseded where it describes legacy backend behavior |
| `SCANNER_DECODER_PR05_BENCHMARK_FOUNDATION.md` | Benchmark harness design and measurement definitions | Reuse methodology; update measurements against current WASM-only engine |
| `SCANNER_RECOGNITION_PIPELINE.md` | Original unified recognition pipeline design and early acceptance contract | Historical; current pipeline order and backend ownership are defined in SCANNER_ENGINE.md |
| `SCANNER_SOURCE_AUDIT_2026-11-08.md` | Initial scanner source audit and defects observed at that time | Consult only when reproducing a matching historical symptom |
| `SCANNER_C2_AUDIT_2026-11-08.md` | C2 audit findings and remediation context | Historical audit |
| `SCANNER_BACKGROUND_RECOVERY_AUDIT_2026-11-08.md` | Background/foreground recovery symptoms and lifecycle findings | Preserve as incident evidence; verify current lifecycle source first |
| `SCANNER_TORCH_AUDIT_2026-11-09.md` | Torch capability investigation and device limitations | Historical platform evidence |
| `SCANNER_AUDIO_LIFECYCLE_2026-11-09.md` | Audio feedback lifecycle observations | Historical incident/implementation evidence |
| `SCANNER_VIDEO_PRESENTATION_AUDIT_2026-11-09.md` | Camera presentation and preview behavior audit | Historical UI evidence |
| `SCAN_01_INPUT_CONTRACT.md` – `SCAN_06_BOUNDED_DESKEW.md` | Original staged ROI, coordinate, rotation and deskew implementation notes | Detailed implementation archaeology; do not treat stage labels as separate runtime engines |
| `SCAN_07_11_RESEARCH_AND_IMPLEMENTATION_PLAN.md` | Research and proposals for later scanner stages | Proposal archive; check current roadmap before implementing |
| `SCAN_07_ADAPTIVE_ROI_MULTISCALE.md` | Original adaptive ROI and scale design | Historical scale policy; current pixel limits are in SCANNER_ENGINE.md |
| `SCAN_07_SYSTEM_SYNCHRONIZATION_AUDIT.md` | Cross-layer synchronization issues and accepted fixes | Keep as a regression clue; confirm current source |
| `SCAN_08_09_UNIFIED_IMPLEMENTATION.md` | Combined enhancement/geometry implementation history | Historical implementation record |
| `SCAN_10_ADAPTIVE_IMAGE_QUALITY_A1.md` | A1 quality profile rationale | Historical design record; current behavior in source |
| `SCAN_11_ADAPTIVE_PROCESSING_A2.md` | A2 processing plan rationale | Historical design record; current behavior in source |
| `SCAN_12_ADAPTIVE_RUNTIME_A3.md` | A3 runtime budget rationale | Historical design record; current behavior in source |
| `SESSION_LOG.md` | Chronological implementation handoffs and observed symptoms | Incident breadcrumbs; not the current contract |

## Incident note format

When a new reproducible scanner issue occurs, append a compact entry to the relevant historical record or create a dated incident note with:

- **Observed:** exact user-visible or measured symptom.
- **Environment:** device class, OS, browser/PWA, module and scanner mode.
- **Evidence:** logs, metrics, sample image identifier (never barcode payload or personal data), commit and reproduction steps.
- **Cause:** confirmed / suspected / unknown. Never label a hypothesis as confirmed.
- **Resolution:** PR/commit and changed contract.
- **Regression guard:** test or acceptance check added.
- **Status:** open / mitigated / fixed / not reproducible / superseded.
- **Do not repeat:** the specific unsafe or ineffective remediation, if established.

Keep raw sample images in a controlled test corpus, not in personal diagnostic exports. Never store decoded barcode payloads or employee/device identifiers in the incident log.


## SC-02 Camera Health Controller

SC-02 implementation adds bounded frame-progress monitoring and recovery in the shared scanner session. A 1-second watchdog detects 3-second frame stalls; native video-frame callbacks are preferred and RAF fallback requires `video.currentTime` progression. Track mute degrades health; track-ended triggers immediate recovery. Recovery uses the existing hook's serialized session-replacement path, one automatic attempt per mounted activation, and failure escalation to scanner ERROR. Deterministic controller/source-contract tests are registered in preflight. PR #144 head `416b168b1b00b858c2b7e34e751e33defb9afb50` passed CI #1313 including full preflight, TypeScript, production and Pages builds, and bundle comparison. Software/CI scope is closed; live stall/reacquisition, ended-track and device/browser matrix remain post-merge operational QA, not claimed as passed.


## 2026-11-23 — SC-03 Geometry Diagnostics software closure

- Baseline confirmed by user: deployed app flow currently operates normally with no observed errors. This is regression baseline acceptance, not physical orientation test evidence.
- PR #146 branch `feat/scanner-sc03-geometry-diagnostics` adds privacy-safe geometry fingerprinting for source dimensions, preview/reticle bounds, CSS fit/position/transform, viewport/visualViewport and pixel density.
- Added monotonic geometry revision epochs, immediate stale-ROI clear when measured inputs drift, versioned source ROI publication, and a platform-session guard rejecting malformed/older geometry revisions.
- Retained existing pure mapper math and strict fail-closed behavior. Unsupported CSS length/calc object-position and unsupported transforms remain null; no full-frame/center fallback.
- Added tests for signature sensitivity/normalization, valid/invalid epoch transitions, source/preview/reticle/viewport changes, stale revision rejection and observer/listener cleanup. Registered in preflight; all existing geometry/preview ROI suites remain enabled.
- CI #1332 passed on head `d4b8fcae54901f53cf45b4ebf7a73fc6436516ab`: full preflight, TypeScript/production build, PR-base build and bundle comparison.
- Software/CI scope is closed. Physical iOS Safari/PWA and Android Chrome/PWA orientation/viewport QA remains a separate device acceptance gate; do not infer it from CI.
- Next roadmap stage after SC-03 software closure: SC-04 Focus Recovery Policy.

## 2026-11-23 — SC-04 Focus Recovery Policy implementation

- PR #148 branch `feat/scanner-sc04-focus-recovery-policy` introduces the passive recovery states `observing`, `waiting-native-autofocus`, and `recovered` inside the existing focus-quality monitor.
- Reuses existing baseline ROI samples, motion stability guard, sharpness ratios, four-sample blur gate and 8-second cooldown; no second engine, extra frame capture or timer.
- Sustained blur produces a native-autofocus wait recommendation and simple steadiness/distance guidance; sharpness returning to the reference band marks recovery.
- Explicit zero post-preview camera-constraint write budget; no `applyConstraints`, autofocus re-arm, camera reacquisition or stream restart. Invalid/moving samples do not trigger the policy.
- Source tests cover transitions, cooldown, reset, low-texture/motion rejection and zero-camera-write contract. CI #1347 failed at a cooldown-boundary expectation; corrected test passed full CI #1348. Physical device QA remains outstanding.
- Scope closure: policy software only; real lens focus behavior is not asserted.

## 2026-11-23 — SC-05 Integration & QA audit

- Audited current main at SC-04 merge. Home BarcodeScanner and StocktakeScanner already share `useScannerEngine` and the feature-owned preview-region binding. Shared camera service retains acquisition/lease ownership.
- Camera health recovery, geometry revision rejection, passive focus recovery and adaptive runtime budget compose through `UniversalScannerSession` and the production WASM decoder adapter. Worker prototype was removed from active code after the production scope was closed; production remains Main Thread WASM.
- SC-05 adds one cross-layer integration contract test to preflight and consolidates a device/corpus acceptance protocol rather than duplicating subsystem tests or adding another engine.
- Device/corpus acceptance NOT RUN in the remote session; overall optical/device acceptance remains pending recorded physical runs.
- SC-05 follow-up audit found SC-04 recovery state/action/guidance were logged by the session but omitted from the diagnostics allowlist/visible QA metrics. The original SC-05 follow-up added bounded focus recovery fields to the former local QA collector/monitor. That observation-only subsystem was later retired during cleanup; no controller or camera behavior was changed.

## SC-05 software closure — 2026-11-23

- PR #149 merged to main at `e0579fa1734eac989af051c4776cc88de912c946`. CI #1375 on final PR head passed; post-merge CI #1376 and Pages deployment #151 passed.
- Added a cross-layer integration contract to preflight, QA-monitor visibility for passive SC-04 recovery metrics, and physical device/corpus acceptance instructions. No new scanner engine or dependency.
- PR #150 test-only follow-up merged at `661241e721a5510cf3f61c8ba7c3971c82b6a63c`; final-head CI #1384, post-merge CI #1385 and Pages deployment #152 passed. The diagnostic fixture asserts recovery state/action/guidance survive collection.
- Software integration scope closed. Physical iOS/Android/Desktop scanner acceptance and measured corpus results NOT RUN; remain the release gate.
