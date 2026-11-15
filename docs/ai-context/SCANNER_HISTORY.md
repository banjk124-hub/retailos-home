# Scanner technical history and incident index

**Purpose:** preserve historical evidence without presenting old designs, workarounds or unfinished proposals as current implementation instructions.

## Reading rule

1. Use [SCANNER_ENGINE.md](./SCANNER_ENGINE.md) for the current runtime contract.
2. Use [INDEX.md](./INDEX.md) for the repository-wide documentation map.
3. The records below are historical evidence. A note may describe a defect that has since been fixed, a proposed architecture that was not adopted, or a test result tied to an old commit.
4. Before acting on a historical note, verify its symptom against current source and current CI. Do not reapply a fix solely because an old note recommends it.
5. Do not delete an incident note merely because its implementation is obsolete. Update its status and link to the resolving PR/commit when known.

## Migration records

| Record | What it preserves | How to use it now |
|---|---|---|
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
