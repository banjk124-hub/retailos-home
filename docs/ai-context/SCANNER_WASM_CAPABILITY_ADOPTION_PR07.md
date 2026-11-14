# PR-07 — ZXing-C++ WASM capability adoption matrix

**Branch:** `feat/scanner-wasm-capability-parity`  
**Pinned backend:** `zxing-wasm@3.1.6`  
**Purpose:** complete a capability-by-capability migration from the production ZXing JS adapter to the WASM adapter without reducing the new engine to a clone of the legacy backend.

## 1. Migration rule

Every capability is classified into one of five dispositions:

1. **Native — use directly:** the WASM backend already provides a useful capability; configure and test it.
2. **Native — tune/expand:** the capability exists but needs deliberate option/configuration or workload-specific validation.
3. **Transfer — implement:** the legacy adapter provides observable behavior that the new backend does not yet preserve; implement an equivalent at the correct architectural layer.
4. **Shared — preserve once:** RetailOS already owns the capability in its common recognition/session pipeline; both decoders consume it without duplicating work.
5. **Deferred — evidence required:** the backend offers the capability, but enabling it now would duplicate work, change payload semantics, add unbounded cost, or expose behavior with no current consumer. Record the reason and the evidence needed to revisit it.

“Complete adoption” means every relevant capability has an explicit disposition and acceptance evidence. It does **not** mean enabling every backend flag indiscriminately.

## 2. WASM-native capability inventory

| Capability | WASM support / current configuration | Disposition | Rationale and acceptance |
|---|---|---|---|
| Strict format selection | `formats` receives the RetailOS allowlist; empty/unsupported lists fail initialization | **Native — use directly** | Keep the allowlist authoritative. Never pass an empty list because ZXing-WASM interprets it as all formats. |
| Accuracy-oriented scan | `tryHarder: true` | **Native — use directly** | Matches the legacy accuracy preference. Pinned ZXing-C++ source also uses the harder scan path for normal/reversed 1D scanlines. |
| Local adaptive binarization | `LocalAverage` first | **Native — use directly** | ZXing-C++ LocalAverage is the HybridBinarizer-equivalent mode for matrix/local thresholding and its documented hybrid behavior. |
| Global histogram binarization | `GlobalHistogram` only after LocalAverage miss | **Transfer — implemented** | Preserves the legacy ordered fallback without running both algorithms when the first succeeds. |
| Reversed-reflectance / inverted symbols | `tryInvert: true` | **Native — enabled in this PR** | Useful native capability not duplicated by the shared RetailOS transforms. Runs as backend detection fallback; validate with positive and negative inverted fixtures and measure miss-path cost. |
| 180° linear scanline reversal | `tryHarder: true`; pinned `ODReader.cpp` reverses scanline patterns | **Native — use directly** | Do not add a duplicate 180° image transform. Source proof is not a substitute for the labelled corpus. |
| 90°/180°/270° full-image rotation | `tryRotate: false` | **Shared / deferred** | Shared pipeline owns bounded orthogonal candidates. Avoid multiplying backend and shared transforms. Revisit only if the labelled corpus shows a specific orientation gap, especially matrix formats or 270° cases. |
| Internal downscaling | `tryDownscale: false` | **Shared / deferred** | RetailOS already owns bounded ROI sizing and 1.5× / 1× / 2× candidates. Native downscale may be tested as a separate candidate policy, not stacked blindly. |
| Native denoising | `tryDenoise: false` | **Deferred** | Experimental and documented for 2D symbologies; current active retail allowlist is linear. Revisit only with supported 2D formats, representative noise fixtures and device-cost evidence. |
| Binarizers beyond LocalAverage/GlobalHistogram | `FixedThreshold`, `BoolCast` available in API, not selected | **Deferred** | Potential speed/threshold alternatives need controlled corpus evidence; do not replace current accuracy path by assumption. |
| Multiple symbols per image | `maxNumberOfSymbols: 1` | **Contract-aligned** | Current session and consumer contract accepts one result. Multi-symbol scanning requires a separate product/consumer contract and duplicate/order policy. |
| Text decoding | `textMode: Plain`, `characterSet: UTF8` | **Transfer — implemented** | Preserves the prior plain text payload boundary. ECI/HRI/Escaped/Hex modes remain available but would change payload semantics and require explicit consumers/tests. |
| Optional checksum | `validateOptionalChecksum: false` | **Transfer — implemented** | Retains legacy optional-checksum acceptance. RetailOS payload validation remains authoritative. |
| Invalid-read diagnostics | `returnErrors: true`; invalid/error results rejected before `DecoderOutput` | **Transfer — implemented** | Diagnostics may observe invalid reads; invalid payloads must never cross the adapter boundary as accepted output. |
| Pure-image optimization | `isPure` not enabled | **Deferred** | Live camera ROI is not guaranteed to contain only one perfectly aligned symbol. |
| EAN add-on handling | Backend default is Ignore | **Deferred / preserve current behavior** | No current consumer requirement for EAN-2/5 add-ons. Do not silently change retail payload semantics. |
| Minimum line count | Backend default retained | **Tune only with corpus evidence** | Native quality heuristic can affect false accepts/misses; baseline before changing it. |
| Code 39 extended mode | Legacy option is deprecated/no-op in current WASM API; explicit Code39Std/Code39Ext variants exist | **Deferred** | Current RetailOS contract maps the family to CODE_39. Introduce variant policy only with payload fixtures and validator agreement. |

## 3. Shared RetailOS capabilities — one owner, both adapters

These are not missing WASM features and must not be reimplemented inside the WASM adapter:

- Feature-owned strict ROI and source-frame coordinate mapping; invalid/missing ROI fails closed.
- Bounded ROI sizing and baseline-first scale candidates.
- Shared orientation candidate ordering, quarter-turn transform and bounded in-plane deskew.
- Image-quality observation, glare-aware enhancement policy and bounded geometry correction.
- A1 quality profile, A2 optional processing plan and A3 runtime candidate budget.
- Temporal snapshot ownership/fallback and accepted-result ordering.
- Barcode allowlist, format/payload validation, single/continuous session semantics and Home/Stocktake handoff.
- Camera lease, preview readiness, frame scheduling, lifecycle/recovery, generation guards and teardown.

The decoder is a technical execution backend. It must not own camera acquisition, frame scheduling, UI, module policy or business behavior.

## 4. Legacy observable behavior transferred to WASM

| Legacy behavior | WASM implementation | Status |
|---|---|---|
| Hybrid then GlobalHistogram fallback | LocalAverage then GlobalHistogram, stop on first valid output | Implemented; automated ordering guard present |
| Plain text payload semantics | Explicit Plain + UTF8 | Implemented |
| Optional checksum acceptance | Optional checksum validation disabled; RetailOS validator remains final authority | Implemented |
| Invalid read visibility for diagnostics | Return errors enabled; invalid/error results filtered before output | Implemented |
| Strict allowlist | Initialization validates requested formats and maps only supported formats | Implemented |
| Shared enhancement/pipeline integration | Async shared pipeline, A1/A2/A3 and temporal snapshot path | Implemented; regression coverage required |
| Recognition and processing diagnostics | Pipeline counters, quality profile and stage costs | Implemented; diagnostics isolation fix included |
| Legacy 180° linear behavior | Native WASM scanline reversal under tryHarder | Source-confirmed; corpus/device validation pending |

## 5. Additional WASM strengths and output surface

The WASM reader exposes richer result data than the current RetailOS adapter consumes, including raw bytes/ECI bytes, symbology identifier, position, rotation, mirrored/inverted state, line count and structured-append metadata.

Current Home/Stocktake consumers require validated text + symbology, not symbol geometry or multi-symbol ordering. Therefore the adapter deliberately projects only the fields required by the existing `DecoderOutput` contract. Preserve the richer surface as a documented extension point; do not expand the public contract until a concrete consumer and privacy-safe QA requirement exist.

## 6. Automated and optical acceptance

Automated source/contract tests are necessary but not optical parity evidence. Required before decoder cutover:

- [ ] Tests prove option policy, strict allowlist, LocalAverage → GlobalHistogram fallback, invalid-result rejection and diagnostic-window isolation.
- [ ] Tests cover disposal during initialization/decode, no output after disposal and temporal fallback behavior.
- [ ] Same labelled image corpus runs against both adapters, with each active symbology and positive/negative controls.
- [ ] Orientation set includes 0°/90°/180°/270°, including inverted-reflectance symbols.
- [ ] Optical set includes small/distant symbols, skew, curved carriers, low contrast, blur/motion, glare/occlusion and ROI-edge cases.
- [ ] Record exact match, miss, wrong decode, false positive, p50/p95 decode duration, initialization time and peak memory where measurable.
- [ ] Physical iOS Safari/PWA and Android Chrome/PWA validation; include a low-end Android device.
- [ ] Keep ZXing JS as production default until all gates pass and explicit cutover approval is given.

## 7. Explicit non-goals for this PR

- No production default switch and no deletion of `@zxing/library` or `zxingDecoder.ts`.
- No camera/session/lifecycle/presentation/business-flow changes.
- No Worker migration or threading redesign.
- No speculative enabling of every ReaderOptions flag.
- No claim of physical parity from TypeScript/build CI alone.

## 8. Upstream references

- [zxing-wasm 3.1.6 ReaderOptions API](https://sec-ant.github.io/zxing-wasm/docs/interfaces/full.ReaderOptions.html)
- [zxing-wasm 3.1.6 package](https://github.com/Sec-ant/zxing-wasm/tree/v3.1.6)
- [Pinned ZXing-C++ ODReader.cpp](https://github.com/zxing-cpp/zxing-cpp/blob/2c3dcfeffa7878950a58c1703c86774a428b0c91/core/src/oned/ODReader.cpp)
- [Pinned ZXing-C++ ReaderOptions.h](https://github.com/zxing-cpp/zxing-cpp/blob/2c3dcfeffa7878950a58c1703c86774a428b0c91/core/src/ReaderOptions.h)
