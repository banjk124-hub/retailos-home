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
