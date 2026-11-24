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
| `SCANNER_WORKSTREAM_SC01_05.md`, `SCANNER_SC05_INTEGRATION_QA.md`, `SCANNER_SC01A_SPIKE_FINDINGS.md` | Phase gates, integration protocol, Worker research and device QA checklists |
| `SCANNER_DECODER_REPLACEMENT_PHASE0_AUDIT_2026-11-14.md` | Decoder migration baseline and protected-contract audit |
| `SCANNER_WASM_CAPABILITY_ADOPTION_PR07.md`, `SCANNER_DECODER_CAPABILITY_EVIDENCE_PR07.md` | Native-vs-shared capability decisions and source evidence |
| `SCANNER_DECODER_PR04_RECOGNITION_PIPELINE.md`, `SCANNER_RECOGNITION_PIPELINE.md` | Earlier pipeline decomposition and recognition contract |
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

The long-form source audit, phase plans and QA runbooks remain archival evidence in the original paths for now. They are not separate sources of current truth and must not be added to the default AI context load. A subsequent archival deletion/move may remove them only after the full repository backlink scan has been reconciled.
