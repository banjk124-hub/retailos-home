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
**Status:** Accepted as the SCAN-01 source contract; runtime wiring is deferred to SCAN-02/03.

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
