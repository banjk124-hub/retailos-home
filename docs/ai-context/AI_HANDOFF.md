# Current handoff — RetailOS

**Repository:** banjk124-hub/retailos-home  
**Verified main HEAD:** `e2976d807ad9bc596ec38dd5852ddadbc48d2f49`  
**Latest merged work:** PR #209 — AUDIT-03E CSS ownership closure and device acceptance boundary; documentation-only, no runtime changes  
**Exact PR-head validation:** PR #193 CI #1948 passed on `3381cdf9c79521f29641ab41ef95b60033d9169a` (10 Playwright tests); PR #195 CI #1968 passed on `ed466383ceaad2d619fd7e99932e65ebf23e311c` (preflight, TypeScript, production/Pages builds, bundle comparison and Playwright responsive/runtime evidence)

## Current owner direction

- No global visual language is selected. Explore and obtain approval for experience-specific creative decisions; do not revive superseded M0 direction.
- Shared business logic/data/results remain common where the underlying operation is shared. Desktop and Mobile own independent presentation composition and navigation.
- Default scope for an unspecified workflow is Desktop + Mobile.
- Camera barcode scanning and camera-only copy/presentation are Mobile-only. Manual barcode lookup remains shared.
- Tablet remains review-required; viewport width is responsive input, not product capability policy.

Canonical policy: [DECISIONS.md](./DECISIONS.md) PD-007/PD-008, [ARCHITECTURE.md](./ARCHITECTURE.md) ADR-030 and [PLATFORM_CAPABILITY_MATRIX.md](./PLATFORM_CAPABILITY_MATRIX.md). The experience/Journey umbrella is [EXPERIENCE_SYSTEM_SPEC.md](./EXPERIENCE_SYSTEM_SPEC.md); it is proposed and does not authorize runtime migration.

## Verified repository state

- PA-02 capability matrix: merged in PR #187; PCM-01–06 documentation reconciliation merged in PR #196 at `adc2ec310c46f3f050b2af81b02ba622e8dc18b3`.
- UI-04A–F feature presentation migration and cross-feature closure: merged; see [UI_UX_PHASE_04_FEATURE_PRESENTATION.md](./UI_UX_PHASE_04_FEATURE_PRESENTATION.md).
- SH-01B/C/D: merged in PR #193. Authenticated shell composition is separated from App auth/session ownership; Desktop/Mobile presentation roots are explicit; Tablet remains a compatibility fallback; Home business state is shared.
- PR #195: closes the post-SH-01 Stocktake camera entry-point policy gap. Home and Stocktake camera surfaces enforce Mobile-only product policy plus runtime support; scanner preferences have independent Mobile-only policy; manual lookup remains shared.
- SH-01 exact-head CI #1948 passed: preflight, TypeScript, production/Pages build, bundle comparison and 10 Playwright tests.
- PR #195 exact-head CI #1968 passed: preflight, TypeScript, production/Pages builds, bundle comparison and Playwright responsive/runtime evidence.
- No physical-device acceptance is claimed. PW-01 remains open.
- CSS-01 remains separate; SH-01 did not perform a broad CSS ownership migration.
- Scanner stabilization SC-00–SC-05 remains closed unless a reproducible defect, measured bottleneck or new requirement appears.

## Current Journey direction

- JRN-00 static source audit is complete at main HEAD `dc952b3204d7d7eaf53b82f805218e56f7ea2562`. App owns auth/session and Login → Identity → Home timing; HomeScreen still renders Stocktake and Stocktake Import inside its own tree.
- JRN-01 contract is implemented on the current branch in `src/platform/journey/journey.types.ts` and ADR-043. Stable `RetailModuleId` now lives in `src/shared/domain/retailModule.ts` to prevent Platform depending on Home. Auth/session stays in App; Home sections/quick overlays stay Home-owned; authenticated page stack uses Home/Feature destinations, Home return context, push/pop/replace, and typed safe-exit guards. No runtime controller or router has been added.
- After JRN-01 merges and exact-head CI passes, next work is JRN-02: create the lazy Feature Page host and move only Stocktake and Stocktake Import out of HomeScreen.
- Stocktake and Stocktake Import are the only operationally ready feature workflows. Keep placeholders as placeholders; do not infer a roadmap from registry entries.
- Keep Settings, quick lookup, quick Scanner, Calendar and Notifications Home-owned. Do not start backend/database or production Gmail migration in this workstream.

## Next technical gates

1. **PW-01:** physical iOS/iPadOS and Android installed-PWA validation, including low-end devices, permissions, safe areas, keyboard, orientation and lifecycle.
2. **CSS-01:** evidence-based CSS ownership map across shared foundation, platform presentation and feature presentation. Trace imports, cascade, consumers and computed styles before moving rules.
3. **AUDIT-03A:** establish production CSS delivery/bundle baseline before proposing optimization.

These are separate workstreams; do not combine them into a broad UI rewrite. Preserve auth/session, stable IDs, data snapshot/cache contracts, scanner engine/lifecycle, Stocktake persistence/export, Import parsing/precision, overlay lifecycle and PWA update-safety.

## Governance

[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) is the verified state source; [ROADMAP.md](./ROADMAP.md) owns future work. This handoff is a concise continuation point, not a competing technical contract. Verify live GitHub state before changing volatile status. Merge, deployment and production transfer remain separate approval gates.
