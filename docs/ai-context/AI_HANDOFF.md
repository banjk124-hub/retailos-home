# Current handoff — RetailOS

**Repository:** banjk124-hub/retailos-home  
**JRN-03 audit baseline:** `b30505a86511909d94406bfd8467be4ec204c620` (main before documentation-only reconciliation)  
**Latest runtime merge:** PR #212 — JRN-02 persistent Shell navigation ownership; exact-head CI #2047 and main CI #2048 passed; Pages deployments #204 and #205 succeeded  
**Documentation reconciliation:** this handoff is updated on the documentation PR branch; its eventual merge commit will advance main without changing the audited runtime baseline.  
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

- JRN-00 source audit is complete. App owns auth/session and Login → Identity → authenticated handoff. HomeScreen previously owned both feature mounts and navigation rendering.
- JRN-01 is merged in PR #211 at `2e0b9ee90e99a39d96ebe8598bcf00a4ec6a0020`. It defines authenticated destination identity, Home return context, push/pop/replace, safe-exit semantics and the Single-App, Multi-Page, Persistent Shell architecture.
- JRN-02 is merged in PR #212 at `b958d9033d8f5c1f7a0a48844bde1a9909ca66de`: AuthenticatedAppShell owns ShellNavigation rendering; Home registers its navigation model through an owner-scoped shell context. Desktop Dock/Mobile navigation are rendered outside HomeScreen at the authenticated Shell boundary.
- Post-merge evidence: CI #2047 (PR head) and #2048 (main) passed, each with 15 Playwright tests; docs CI #2049 and main CI #2050 passed; Pages deployments #204 and #205 succeeded. Physical-device QA is not implied.
- JRN-03 source audit is complete at baseline `b30505a86511909d94406bfd8467be4ec204c620`; see [AUDIT_JRN_03_PAGE_HOST.md](./AUDIT_JRN_03_PAGE_HOST.md).
- JRN-03A is implemented on PR #215 (pending merge): JourneyController, Home-only lazy Page Registry, ActivePageHost and owner-scoped async Exit Guard foundation are mounted below the existing Shell. Exact-head CI #2058 passed on `ba70bc1b563e2ae1e5b0336b2df3b1a785a13cc6`, including preflight, TypeScript, production/Pages builds, bundle comparison and 15 Playwright tests. Stocktake and Import remain Home-owned until JRN-03B/03C; no deployment or physical-device QA is claimed.
- JRN-03 does not include Global Quick Actions. JRN-04 remains the later workstream for Quick Search, Scanner, Settings, Calendar and Notifications at Shell level.
- Stocktake and Stocktake Import remain the only operationally ready feature workflows. Their business logic, persistence and offline behavior are protected.
- One Experience System governs global semantics; each Page owns its layout, density and workflow-specific composition. Shared system data must not become a global mega-store.
- Do not select a backend/database or move to production/shared Gmail in this workstream.

## Next technical gates

1. **JRN-03A:** review and merge PR #215 after owner review; then implement JRN-03B Stocktake Page extraction with a complete feature exit guard. JRN-03C Import extraction follows separately, then JRN-03D removes the Home-owned mounts and performs integrated QA.
2. **PW-01:** physical iOS/iPadOS and Android installed-PWA validation, including low-end devices, permissions, safe areas, keyboard, orientation and lifecycle.
3. **CSS-01:** evidence-based CSS ownership map across shared foundation, platform presentation and feature presentation. Trace imports, cascade, consumers and computed styles before moving rules.
4. **AUDIT-03A:** establish production CSS delivery/bundle baseline before proposing optimization.

These are separate workstreams; do not combine them into a broad UI rewrite. Preserve auth/session, stable IDs, data snapshot/cache contracts, scanner engine/lifecycle, Stocktake persistence/export, Import parsing/precision, overlay lifecycle and PWA update-safety.

## Governance

[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) is the verified state source; [ROADMAP.md](./ROADMAP.md) owns future work. This handoff is a concise continuation point, not a competing technical contract. Verify live GitHub state before changing volatile status. Merge, deployment and production transfer remain separate approval gates.
