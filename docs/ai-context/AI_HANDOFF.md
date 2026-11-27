# Current handoff — RetailOS

**Repository:** banjk124-hub/retailos-home  
**Verified main HEAD:** `58d478cf6e8d6e5277c7ca2b60b274731670dfd0`  
**Latest merged work:** PR #193 — SH-01 authenticated shell and platform presentation  
**Exact PR-head validation:** CI #1948 passed on `3381cdf9c79521f29641ab41ef95b60033d9169a` (10 Playwright tests)

## Current owner direction

- No global visual language is selected. Explore and obtain approval for experience-specific creative decisions; do not revive superseded M0 direction.
- Shared business logic/data/results remain common where the underlying operation is shared. Desktop and Mobile own independent presentation composition and navigation.
- Default scope for an unspecified workflow is Desktop + Mobile.
- Camera barcode scanning and camera-only copy/presentation are Mobile-only. Manual barcode lookup remains shared.
- Tablet remains review-required; viewport width is responsive input, not product capability policy.

Canonical policy: [DECISIONS.md](./DECISIONS.md) PD-007/PD-008, [ARCHITECTURE.md](./ARCHITECTURE.md) ADR-030 and [PLATFORM_CAPABILITY_MATRIX.md](./PLATFORM_CAPABILITY_MATRIX.md).

## Verified repository state

- PA-02 capability matrix: merged in PR #187.
- UI-04A–F feature presentation migration and cross-feature closure: merged; see [UI_UX_PHASE_04_FEATURE_PRESENTATION.md](./UI_UX_PHASE_04_FEATURE_PRESENTATION.md).
- SH-01B/C/D: merged in PR #193. Authenticated shell composition is separated from App auth/session ownership; Desktop/Mobile presentation roots are explicit; Tablet remains a compatibility fallback; Home business state is shared.
- SH-01 exact-head CI #1948 passed: preflight, TypeScript, production/Pages build, bundle comparison and 10 Playwright tests.
- No physical-device acceptance is claimed. PW-01 remains open.
- CSS-01 remains separate; SH-01 did not perform a broad CSS ownership migration.
- Scanner stabilization SC-00–SC-05 remains closed unless a reproducible defect, measured bottleneck or new requirement appears.

## Next technical gates

1. **PW-01:** physical iOS/iPadOS and Android installed-PWA validation, including low-end devices, permissions, safe areas, keyboard, orientation and lifecycle.
2. **CSS-01:** evidence-based CSS ownership map across shared foundation, platform presentation and feature presentation. Trace imports, cascade, consumers and computed styles before moving rules.
3. **AUDIT-03A:** establish production CSS delivery/bundle baseline before proposing optimization.

These are separate workstreams; do not combine them into a broad UI rewrite. Preserve auth/session, stable IDs, data snapshot/cache contracts, scanner engine/lifecycle, Stocktake persistence/export, Import parsing/precision, overlay lifecycle and PWA update-safety.

## Governance

[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) is the verified state source; [ROADMAP.md](./ROADMAP.md) owns future work. This handoff is a concise continuation point, not a competing technical contract. Verify live GitHub state before changing volatile status. Merge, deployment and production transfer remain separate approval gates.
