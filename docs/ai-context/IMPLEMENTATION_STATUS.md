# Current verified implementation status — 2026-11-26

**Repository:** banjk124-hub/retailos-home  
**Product standard:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)  
**Active UI/UX authority:** [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md)  
**Main baseline used by M0-A2:** `a5ef3ffe176adfcfb3ccb7cf68941dd197de33d6`.

## Owner-confirmed direction
- Burgundy/dark-red identity; exact final palette remains open.
- Vietnamese-first typography; font selection requires glyph, readability, licensing and performance validation.
- Authentic retail imagery; rights, local delivery and offline fallback must be established.
- Supplied image informs art direction/composition; supplied video informs motion/interaction. Adapt rather than copy.
- Feature-specific compositions; consistency is identity, semantics, accessibility and interaction quality, not identical cards.

## M0 status
- M0-0 documentation consolidation: merged via PR #163.
- BATCH 02 technical-document consolidation: merged via PR #167 at `c46cfcc788e923d0f4c787ec8e15f2783a8e74af`; CI #1600 passed, including preflight, bundle baseline, responsive Playwright smoke and artifacts.
- M0-A0 source baseline and seven screen blueprints are recorded.
- M0-A1 source architecture audit is recorded in `UI_UX_M0_A1_ARCHITECTURE_AUDIT.md`; source-level only.
- **M0-A2 source/design-system audit completed** on `audit/m0-a2-design-system-css`; see `UI_UX_M0_A2_DESIGN_SYSTEM_CSS_AUDIT.md`.
- M0-A2 confirmed 24 tracked CSS files / 365,141 source bytes, 13 root stylesheet imports, five Home stylesheets, distributed responsive/motion/power rules, multiple token namespaces, no bundled font and no retail photography assets.
- M0-A2 source result is not full phase acceptance: computed CSS, browser screenshots, emitted CSS size, font specimen, image crops and runtime/device profiling remain open. No CSS file is authorized for retirement by this audit.
- Next: close the A2 runtime evidence gate; then A3 Motion and A4 Runtime/Performance audits. A5 technology decisions follow evidence. Prototypes require source/runtime and owner visual acceptance.
- M0-B, M0-C and M0-D remain open. No M1 authorization.

## Current UI work
- M0-A2 branch: `audit/m0-a2-design-system-css`.
- PR #169 / M0-A1 source architecture audit is part of the current main baseline; main SHA for this A2 audit is `a5ef3ffe176adfcfb3ccb7cf68941dd197de33d6`.
- Older PR #164 is based on a pre-consolidation baseline; do not treat it as a current implementation candidate.
- PR #157 is closed/unmerged; its CSS proposal is not accepted source behavior.

## Scanner
Runtime stabilization and ecosystem cleanup are closed. Production decoder is ZXing-C++ WASM through Scanner Engine adapter on Main Thread. Retired Worker prototype and production QA diagnostics collector/monitor remain retired. No active SC-01–SC-05 phase. See [SCANNER_ENGINE.md](./SCANNER_ENGINE.md) and [SCANNER_HISTORY.md](./SCANNER_HISTORY.md).

## Verification rules
CI proves only checks executed on its exact commit. Browser emulation is not physical-device acceptance. Development Pages is not department production promotion. Merge, deploy and production transfer are separate approval gates.


## Candidate M0 prototype — PR #174 (not merged)

- Branch: `feat/retailos-greenfield-experience`; implementation head verified before this status update: `0a5c90ca1bf95292b959a9c75ffbf32d87adee30`.
- Scope: Login/employee-access presentation prototype and responsive browser regression coverage. Existing local authentication, employee identity, session lifecycle and App journey remain in place.
- CI #1636 passed on `0a5c90ca1bf95292b959a9c75ffbf32d87adee30`: preflight, TypeScript/production/Pages builds, base-bundle comparison and Playwright browser evidence. Browser suite: 7/7 passed with no retries on the final run.
- Runtime artifact: 0 page errors, 0 failed requests, 0 duplicate DOM IDs across captured states, and 0 horizontal overflow at Home viewports 1440×900, 1280×800, 1024×768, 768×1024, 390×844, 360×740 and short landscape. Login screenshots cover desktop, tablet, mobile, compact mobile and short landscape; Settings, Library, Stocktake and Import are captured in their existing mobile overlay states.
- Bundle comparison against the PR base: initial entry closure reduced by 17,342 raw bytes (-4.4%) and 3,356 gzip-estimate bytes (-3.3%); total emitted artifact reduced by 16,238 raw bytes (-0.8%) and 3,159 gzip-estimate bytes (-0.5%). Current total Brotli estimate: 551,274 bytes. These are per-file compression estimates, not measured edge transfer.
- Limitations: Login prototype still lacks the authentic retail photography required by the M0 direction. Other workspaces remain their current implementations/overlay presentation; the mobile navigation overlap visible in Home remains an open design issue. Browser emulation is not physical-device acceptance. No owner visual acceptance, M0 completion, M1 authorization, merge or deployment is implied.
- Next: complete the remaining M0-A2 evidence/review, then prototype the remaining representative screens in bounded slices. Preserve all protected operational and PWA contracts.
