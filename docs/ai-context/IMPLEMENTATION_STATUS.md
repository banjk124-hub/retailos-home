# Current verified implementation status — 2026-11-28

**Repository:** banjk124-hub/retailos-home  
**Verified main HEAD:** `e2976d807ad9bc596ec38dd5852ddadbc48d2f49`  
**Latest merge:** PR #210, merge commit `e2976d807ad9bc596ec38dd5852ddadbc48d2f49`

This file records verified repository state. It does not authorize deployment or production-account transfer.

## Owner direction and governance

- No global visual language is selected. Creative decisions remain experience-specific and require owner approval before substantial implementation.
- Cross-platform policy is canonical in DECISIONS.md PD-007/PD-008 and ARCHITECTURE.md ADR-030. The owner-confirmed matrix is in `PLATFORM_CAPABILITY_MATRIX.md`: nine Home workflows shared Desktop/Mobile; camera scanner and camera-only presentation Mobile-only; manual lookup shared; Tablet review-required.
- Merge, deployment and production transfer are separate approval gates.

## Verified merged work

| Work | State | Evidence |
|---|---|---|
| UI-03 CSS consolidation | PR #180 merged | Merge commit `7b679da9bbd3b3a21b50711a8b56be8ca14e2e54`; final docs CI #1817 passed |
| UI-04 initial presentation slices | PR #181 merged | Merge commit `e58bce634b9ff67e95250d36c8653593680463e9` |
| AUDIT-02 ownership implementation | PR #184 merged | Verified PR metadata |
| AUDIT-03 CSS & Design Foundation audit | PR #185 merged | Static audit only; no source implementation |
| Cross-platform governance | PR #186 merged | Merge commit `01c814e546688595d2796c70bd72df228047e5e8` |
| PA-02 capability matrix | PR #187 merged | Merge commit `ae0ee4cde5ce8ccd160b77cf5198dbb103b82b45` |
| UI-04D Stocktake presentation | PR #189 merged | Merge commit `e88ae240959a8deea85aee2fd2992d40563ad365`; CI #1877 passed |
| UI-04E Stocktake Import presentation | PR #190 merged | Merge commit `38192b2ce1c426edd6285594a57a2c2970bc14ee`; CI #1902 passed |
| UI-04F cross-feature closure | PR #191 merged | Merge commit `6925cf968ea2b9c37377856abaf4c4a2ca6785a0`; exact-head CI #1909 passed |
| SH-01B/C/D authenticated shell and platform roots | PR #193 merged | Merge commit `58d478cf6e8d6e5277c7ca2b60b274731670dfd0`; exact-head CI #1948 passed on `3381cdf9c79521f29641ab41ef95b60033d9169a`; 10 Playwright tests passed |
| Mobile-only camera capability enforcement across Home and Stocktake | PR #195 merged | Merge commit `a64a49fe516b03cc7c8641a6e23c54a3391a6887`; exact-head CI #1968 passed on `ed466383ceaad2d619fd7e99932e65ebf23e311c`; preflight, TypeScript, production/Pages builds, bundle comparison and Playwright responsive/runtime evidence passed |
| PCM-01–06 Platform Capability Matrix reconciliation | PR #196 merged | Merge commit `adc2ec310c46f3f050b2af81b02ba622e8dc18b3`; documentation-only reconciliation of platform policy and status references |
| CSS-01C Login legacy CSS retirement | PR #198 merged | Merge commit `ec10d1ceaa05ff95a232d3ad276866b63e612282`; first bounded retirement in `mobile-tuning.css` |
| CSS-01C remaining Login responsive retirement | PR #199 merged | Merge commit `2c2a5b60e87c05b06153fb534a0a4bbdc5c77e5`; removed legacy Login rules from `responsive.css` and obsolete `.login-identity-dock` cluster; exact-head CI #1985 passed on `e1e84f55829d374d676233ebefeff97dc72c3863` |
| CSS-01C orphan keyframe cleanup | PR #200 merged | Merge commit `b0b36487c27239fa283b380767e43ec4092f928f`; removed orphan Login keyframes and refreshed CSS status documentation |
| CSS-01C first mobile navigation legacy slice | PR #201 merged | Merge commit `7e787576d2ad1013eb2e2e8f0cbed3efd7d3d02f`; exact-head CI #1990 passed on `88fee8c6ca6374941bc5d47a57a9291547c986e5` |
| AUDIT-03E CSS ownership closure | PR #209 merged | Merge commit `dc952b3204d7d7eaf53b82f805218e56f7ea2562`; documentation-only; CI #2025 evidence and Build & Deploy #200 were verified on its pre-merge baseline; physical iOS/Android acceptance remains pending |
| CSS-01C closeout | PR #202 closed unmerged | No source changes accepted; remaining `.mobile-nav` groups intentionally retained because safe grouped-selector isolation was not demonstrated |

## Open work and acceptance gates

### Platform experience
- **SH-01:** implementation and automated integration closure are merged. PR #195 subsequently closed the Stocktake camera policy enforcement gap. See `SH-01_SHELL_PRESENTATION_OWNERSHIP.md` and `PLATFORM_CAPABILITY_MATRIX.md`.
- **PW-01:** physical iOS/iPadOS and Android installed-PWA validation is deferred by owner, not passed or complete. Browser emulation is not device acceptance.
- **CSS-01:** CSS-01A/B complete; CSS-01C closed after the bounded PR #198/#199 Login retirements, PR #200 orphan-keyframe cleanup and PR #201 first mobile-navigation legacy slice. CSS-01D exact-head automated/browser regression passed on PR #199 (CI #1985) and PR #201 (CI #1990). Remaining `.mobile-nav` declaration groups are intentionally retained as documented cleanup debt; PR #202 was closed unmerged with no source changes. AUDIT-03E CSS ownership closure is recorded in `AUDIT_03E_CSS_OWNERSHIP_CLOSURE.md` and merged through PR #209. No broad selector rewrite was justified; physical iOS/Android acceptance remains pending. See `AUDIT_03E_CSS_OWNERSHIP_CLOSURE.md` and `CSS_01_CSS_OWNERSHIP_MIGRATION.md`.
- **AUDIT-03A:** production CSS delivery/bundle baseline is proposed; implementation has not started.

### UI-04
UI-04A–F are merged. The canonical phase record is `UI_UX_PHASE_04_FEATURE_PRESENTATION.md`. Physical-device acceptance remains a separate gate where specified.

## Experience and Journey workstream (proposed)

- JRN-00 static source audit is complete at `dc952b3204d7d7eaf53b82f805218e56f7ea2562`. The audit confirms that HomeScreen still mounts Stocktake and Stocktake Import, while App owns auth/session and the login/identity/home timing.
- **JRN-01 implementation on PR #211:** typed authenticated destination contract in `src/platform/journey/journey.types.ts`; stable `RetailModuleId` is neutral in `src/shared/domain/retailModule.ts`; Home return context, push/pop/replace, safe-exit and semantic transition direction are defined. The owner clarification adds Single-App Multi-Page, persistent authenticated Shell, fixed Desktop Dock, adaptive Mobile navigation, shell-level global quick actions, one shared Experience System with Page-level presentation freedom, and shared system-data/domain/UI-state boundaries. ADR-043 and the canonical Experience System spec record the contract. PR #211 remains draft/unmerged; runtime Shell, Journey Controller, Page Host and data-layer migration are not implemented.
- The experience specification is an umbrella contract. ARCHITECTURE.md remains ADR authority; COMPONENT_AND_PATTERN_GOVERNANCE.md remains component reuse authority; PLATFORM_CAPABILITY_MATRIX.md and PWA_RUNTIME_RELEASE.md retain their existing authority.

## Protected technical boundaries

Preserve auth/session and employee identity, stable module/workflow IDs, snapshot/cache/offline truth, scanner engine/camera lifecycle, Stocktake persistence/revisions/history/export, Stocktake Import parsing/precision/conflicts/dirty edits/persistence/output, overlay focus/body-scroll-lock, PWA update consent/staging/integrity/activation/boot-health/rollback, Vite Pages base path and lazy-loading. Scanner stabilization SC-00–SC-05 remains closed unless a reproducible defect, measured bottleneck or new requirement appears.

## Evidence classification

- PR #193 and PR #195 merge states and merge commits were verified from GitHub repository state.
- Exact PR-head CI #1948 succeeded on `3381cdf9c79521f29641ab41ef95b60033d9169a`: preflight, TypeScript, production/Pages build, bundle comparison and 10 Playwright tests.
- Exact PR-head CI #1968 succeeded on `ed466383ceaad2d619fd7e99932e65ebf23e311c`: preflight, TypeScript, production/Pages builds, bundle comparison and Playwright responsive/runtime evidence.
- Exact PR #199 head CI #1985 passed preflight, TypeScript, production/Pages build, PR-base bundle comparison and Playwright responsive/runtime evidence.
- Exact PR #201 head CI #1990 passed; no merge/deployment or physical-device acceptance is inferred from this result.
- No post-merge Pages deployment or physical-device QA is claimed.
