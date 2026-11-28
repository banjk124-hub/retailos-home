# Current handoff — RetailOS

**Repository:** banjk124-hub/retailos-home  
**Verified main HEAD:** `8b204a20d0959e291e4835f5977f0b313e56ab60`  
**Latest merged work:** PR #203 — CSS-01E documentation/status closeout; latest runtime change remains PR #201 (CSS legacy selector retirement)  
**Exact PR-head validation:** PR #193 CI #1948 passed on `3381cdf9c79521f29641ab41ef95b60033d9169a` (10 Playwright tests); PR #195 CI #1968 passed on `ed466383ceaad2d619fd7e99932e65ebf23e311c` (preflight, TypeScript, production/Pages builds, bundle comparison and Playwright responsive/runtime evidence)

## Current owner direction

- No global visual language is selected. Explore and obtain approval for experience-specific creative decisions; do not revive superseded M0 direction.
- Shared business logic/data/results remain common where the underlying operation is shared. Desktop and Mobile own independent presentation composition and navigation.
- Default scope for an unspecified workflow is Desktop + Mobile.
- Camera barcode scanning and camera-only copy/presentation are Mobile-only. Manual barcode lookup remains shared.
- Tablet remains review-required; viewport width is responsive input, not product capability policy.

Canonical policy: [DECISIONS.md](./DECISIONS.md) PD-007/PD-008, [ARCHITECTURE.md](./ARCHITECTURE.md) ADR-030 and [PLATFORM_CAPABILITY_MATRIX.md](./PLATFORM_CAPABILITY_MATRIX.md).

## Verified repository state

- PA-02 capability matrix: merged in PR #187; PCM-01–06 documentation reconciliation merged in PR #196 at `adc2ec310c46f3f050b2af81b02ba622e8dc18b3`.
- UI-04A–F feature presentation migration and cross-feature closure: merged; see [UI_UX_PHASE_04_FEATURE_PRESENTATION.md](./UI_UX_PHASE_04_FEATURE_PRESENTATION.md).
- SH-01B/C/D: merged in PR #193. Authenticated shell composition is separated from App auth/session ownership; Desktop/Mobile presentation roots are explicit; Tablet remains a compatibility fallback; Home business state is shared.
- PR #195: closes the post-SH-01 Stocktake camera entry-point policy gap. Home and Stocktake camera surfaces enforce Mobile-only product policy plus runtime support; scanner preferences have independent Mobile-only policy; manual lookup remains shared.
- SH-01 exact-head CI #1948 passed: preflight, TypeScript, production/Pages build, bundle comparison and 10 Playwright tests.
- PR #195 exact-head CI #1968 passed: preflight, TypeScript, production/Pages builds, bundle comparison and Playwright responsive/runtime evidence.
- No physical-device acceptance is claimed. PW-01 remains open.
- CSS-01A–E is closed at bounded scope; see `CSS_01_CSS_OWNERSHIP_MIGRATION.md`. Remaining `.mobile-nav` declarations are intentionally retained cleanup debt; PR #202 was closed unmerged.
- Scanner stabilization SC-00–SC-05 remains closed unless a reproducible defect, measured bottleneck or new requirement appears.

## Next technical gates

1. **AUDIT-03A — active:** establish a reproducible production CSS delivery baseline from current `main`: Vite manifest, emitted CSS chunks, eager/lazy import graph, and raw/gzip/Brotli sizes. Measurement only; no source optimization or CSS movement.
2. **PW-01 — deferred:** physical iOS/iPadOS and Android installed-PWA acceptance remains deferred by owner; do not treat browser emulation as device acceptance.

## Governance

[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) is the verified state source; [ROADMAP.md](./ROADMAP.md) owns future work. This handoff is a concise continuation point, not a competing technical contract. Verify live GitHub state before changing volatile status. Merge, deployment and production transfer remain separate approval gates.
