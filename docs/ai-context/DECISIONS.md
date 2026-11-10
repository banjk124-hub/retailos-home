# Architecture decision record

## ADR-001 — Treat module library as a product subsystem
**Status:** Proposed / staged for validation

### Context
Module metadata, grouping, search, presentation and opening behavior should not be maintained as unrelated lists in the Home screen. This creates duplication and makes a redesign fragile.

### Decision
Use a canonical module registry, derive library groups and search results from it, and keep module UI readiness separate from data snapshot availability. The library should route to actual workflows where implemented and clearly identify integrations that are not yet ready.

### Constraints
- Preserve stable IDs and data contracts.
- Do not pretend the registry alone makes a module functional.
- Validate the existing module data ID type and navigation before adopting any registry implementation.
- Avoid shipping a temporary CSS override as the final design system.

### Acceptance criteria
- One canonical identity/metadata record per module.
- Search and grouping use the same source.
- Every module tile has a truthful action/status.
- Existing business/data flows still pass regression tests.
- Responsive layout has no unexpected single-column shrink or nav/content overlap.


## ADR-012 — Scanner-first adaptive resource profiles and shared engine completion
**Status:** Proposed; documentation/architecture direction only (2026-11-08).

### Context
The shared scanner is already separated into feature-owned UI, a React bridge, a platform session, camera leases and a decoder adapter. However, the hook currently passes `profile: 'HIGH'` unconditionally. The profile type currently exposes `COMPACT | STANDARD | HIGH`, not the requested Low/Mid/High policy. This is not adaptive device classification.

### Decision
- Re-scope Phase 1.2I as Shared Scanner Engine Completion.
- Define scanner-first Low/Mid/High resource profiles in Phase 1.2J; defer app-wide activation until scanner policy is measured and proven.
- Resource adaptation may change optional visual/processing intensity only. Barcode allowlist/validation, scan accuracy, session ownership, callback delivery, persistence and feature workflows are hard invariants.
- Home and Stocktake presentation remain independently owned while sharing the engine.
- Do not assume universal battery/temperature telemetry in iOS Safari or Android Chrome. Use privacy-safe runtime proxies with hysteresis and conservative fallback; do not claim direct thermal measurement.
- Never lower camera resolution, decode cadence, ROI coverage or recovery paths merely because a device is classified Low. Such changes require measured scan-accuracy and latency evidence.

### Consequences
- Profile selection is advisory and must degrade safely when capability data is missing.
- Profile transitions must not create a second camera request, decoder, frame loop or session.
- Phase 1.2G is bounded at instrumentation/source audit; further optimization is issue- or measurement-driven.
- Angled/perspective decode is an optional capability within engine completion, not the entire 1.2I phase.

See `SCANNER_SOURCE_AUDIT_2026-11-08.md` for source evidence and acceptance gates.


## ADR-022 — Separate module scan intent from source-frame processing geometry (2026-11-10)
**Status:** SCAN-01 contract merged by PR #58; geometry mapping and Home/Stocktake wiring were completed in SCAN-02/03. SCAN-04 consumes the mapped source region.

### Decision
- Feature modules own a `ScannerModuleConfig` containing a `preview-content-normalized` scan region and a `ScannerCameraRequest`.
- Shared scanner processing consumes a resolved `source-frame-normalized` region only after the pure mapping step in SCAN-02.
- Rectangles use normalized fractions with a top-left origin and explicit coordinate-space discriminators.
- Camera preferences are independent of preview aspect ratio. Preserve the current environment / 1280×720 / 30 FPS default.
- Home and Stocktake retain independent presentation and reticle ownership.

### Constraints
- No DOM geometry barrier during camera startup.
- Mapping must account for object-fit, object-position, source dimensions and mirroring.
- Region updates must not recreate the camera/session/decoder/frame loop.
- Strict ROI mode must reject invalid/missing region data; no silent full-frame fallback after strict mode is enabled.
- No lifecycle, decoder algorithm, barcode policy, business flow or dependency changes in SCAN-01.

### Acceptance
See `docs/ai-context/SCAN_01_INPUT_CONTRACT.md`.


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


## ADR-025 — Strict decoder consumption of module-owned source ROI (2026-11-10)

**Status:** Merged/deployed by the user; normal scanner operation confirmed. Detailed optical stress scenarios were not individually recorded.

### Context
SCAN-03 publishes a mapped `source-frame-normalized` reticle region into the active session. The previous ZXing adapter still decoded the full frame first and then tried a hard-coded centered crop, so the actual module scan intent did not constrain decoder work.

### Decision
- Each decoder invocation receives the current session region with its timestamp.
- A pure resolver validates the coordinate-space tag and rectangle, then converts normalized bounds into integer source pixels using floor-leading/ceil-trailing rounding and source-frame clamping.
- ZXing draws only that source crop into its working canvas and decodes the ROI. The full-frame-first pass and fixed centered fallback are removed.
- Missing or invalid geometry is a decode miss, not a decoder error, and must never trigger full-frame fallback.
- Preserve the supported barcode allowlist, existing binarizer schedule, 1.5× aspect-preserving ROI upscale, 110 ms frame-loop cadence, validation and result-delivery policy.

### Constraints
- No camera acquisition/lease, readiness, lifecycle/recovery, frame scheduling, CSS, Home/Stocktake UI or business-flow changes.
- No rotation, deskew, perspective correction, adaptive exposure or camera-constraint changes in SCAN-04.
- Physical barcode accuracy/performance QA on iOS Safari/PWA and Android Chrome/PWA is required before release acceptance.

### Acceptance
See `docs/ai-context/SCAN_04_STRICT_ROI_DECODING.md` and `scripts/test-scanner-roi-decoder.mjs`.


## ADR-026 — Bounded orthogonal ROI rotation (2026-11-10)
**Status:** Implemented on final consolidated PR #66; CI run #368 passed before the audit follow-up commits. Fresh CI and physical QA pending.

- ZXing's existing `TRY_HARDER` path owns 180° 1D scanline reversal.
- One clockwise 90° ROI transform after an upright miss covers both 90° and 270° source orientations when combined with that reversal.
- The extra transform is scheduled every third valid ROI frame; the unrotated ROI remains first.
- Preserve strict ROI/no-fallback, 110 ms session cadence, camera/session and feature contracts.
- See `SCAN_05_ORTHOGONAL_ROTATION.md` and `scripts/test-scanner-rotation.mjs`.

## ADR-027 — Bounded ROI in-plane deskew (2026-11-10)
**Status:** Implemented on the consolidated SCAN-05/06 branch; CI run #368 passed before the audit follow-up commits. Fresh CI and physical QA pending.

- Estimate small-angle roll from a sampled Sobel structure tensor on the ROI luminance frame.
- Accept only coherent 1.2°–12° estimates; apply one inverse-angle bilinear transform with expanded bounds and white fill.
- Attempt one HybridBinarizer deskew decode only after upright and orthogonal decode misses on the scheduled extended frame.
- Fail closed for blank/invalid/low-confidence/out-of-range inputs. Perspective and curved-label correction remain out of scope.
- See `SCAN_06_BOUNDED_DESKEW.md` and `scripts/test-scanner-deskew.mjs`.
