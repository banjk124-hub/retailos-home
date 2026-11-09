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


## ADR-021 — Module-owned scan region and bounded recognition recovery (2026-11-10)

**Status:** Proposed for user review. Documentation/change-map only; no runtime contract or implementation is merged by this record.

### Context
The current shared scanner is already used by Home and Stocktake. Camera lease/lifecycle/preview, validation, Torch and shared feedback are established. The current ZXing adapter decodes the full frame before a fixed centered crop, so the decoder does not obey each module's actual reticle. Home and Stocktake have different preview layouts and CSS crop behavior. The current engine must not regain a DOM-layout startup barrier.

### Proposed decision
- Each consuming module owns the active scan rectangle and its preview/presentation policy.
- A module-side adapter or pure shared geometry helper resolves the displayed rectangle into normalized coordinates relative to the unrotated source frame. Mapping must account for object-fit, object-position, crop, responsive dimensions and mirror state when present.
- The platform session receives a resolved region and forwards it to the decoder. The engine does not inspect CSS or infer the user's intended reticle.
- Region updates must be applied without recreating camera stream, session, decoder or frame loop.
- Camera capture constraints are a separate module-owned request passed through the existing tap-origin lease path. Current environment / ideal 1280×720 / 30 FPS defaults remain unchanged until measured and separately approved.
- After both consumers provide valid regions, strict ROI-only decoding becomes the normal path; a barcode outside the active ROI must not be accepted. Migration must be backward-compatible until both consumers are wired.
- Recovery is conditional, bounded and measurement-led. A normal no-result frame does not trigger expensive recovery. No always-on AI/object detection/OCR or unbounded rotation/scale variants.
- Keep the existing EAN-8/EAN-13/CODE-128 whitelist, EAN check-digit validation and opaque CODE-128 payload behavior.

### Protected boundaries
- Do not alter camera lease/refcount, cancellation, session lifecycle, preview readiness, foreground recovery or release ordering.
- Do not reintroduce a DOM geometry gate into startup (ADR-015 remains accepted).
- Do not move reticle UI, transitions, exit decisions or business callbacks into the platform engine.
- Do not merge Home and Stocktake presentation implementations.

### Planned slices
SCAN-01 input/module-config contract → SCAN-02 geometry mapping → SCAN-03 module integration → SCAN-04 ROI-only baseline → SCAN-05 benchmark → conditional recovery/rotation/small-code work → cross-platform resource validation.

### Acceptance
The detailed file-level Change Map, contract fields, compatibility default, invalid-region behavior and tests must be approved before implementation. See RETAILOS_CURRENT_STATE_2026-11-10.md.
