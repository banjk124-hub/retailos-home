# RetailOS roadmap — 2026-11-25

## Governing direction

All new and continuing RetailOS work follows [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md). Do not maintain parallel product-wide UI/UX plans or competing status tables.

## UI/UX — next sequence

1. **M0 direction and technology:** audit current source and actual screens; use the image as structural/visual reference and video as motion/feedback reference; RetailOS remains authoritative for brand, operational semantics and architecture. Evaluate framework, routing, styling, component, icon, image, typography and motion options before committing.
2. **Representative prototype:** implement real source-backed examples across representative desktop, tablet and mobile surfaces; inspect the running app and obtain owner acceptance.
3. **M1 foundation:** implement only the approved design foundations and components required by actual consumers.
4. **M2+ migration:** replace current Shell/navigation and existing screens/workspaces in bounded slices. Add feature-owned components when a real workflow needs them; promote to shared only after cross-feature value is proven.
5. **Consolidation and acceptance:** retire superseded code with evidence; validate accessibility, motion, responsive behavior, performance, protected contracts and release readiness.

Do not call token migration, a mockup, a documentation phase or Login-only responsive tests a completed product-wide redesign. Do not prebuild speculative future features.

## Scanner — closed

Scanner runtime stabilization and cleanup are complete. Current implementation truth: [SCANNER_ENGINE.md](./SCANNER_ENGINE.md); historical evidence: [SCANNER_HISTORY.md](./SCANNER_HISTORY.md). Reopen only for a reproducible defect, measured bottleneck, new requirement or explicit acceptance task. UI redesign must not reopen Scanner Engine internals.

## Other domain roadmaps/contracts

- PWA release: [PWA_RUNTIME_RELEASE.md](./PWA_RUNTIME_RELEASE.md)
- Performance and bundle: [PERFORMANCE_BUNDLE_PWA.md](./PERFORMANCE_BUNDLE_PWA.md)
- Overlay lifecycle: [UI_OVERLAY_ARCHITECTURE.md](./UI_OVERLAY_ARCHITECTURE.md)
- Import workflow: [STOCKTAKE_FILE_IMPORT.md](./STOCKTAKE_FILE_IMPORT.md)

## Governance

- Verify live branch, PR, CI and deployment before updating status.
- No merge without explicit owner approval; no deployment without explicit authorization.
- CI, visual acceptance, physical-device acceptance, business workflow acceptance and production promotion are distinct.
