# RetailOS Roadmap — 2026-11-27

This roadmap records future work, not a visual-style authority. Product and experience work follows [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md).

## Governance
- No active global visual language is selected. Explore and validate experience-specific directions; obtain owner approval before substantial creative implementation.
- Verify live branch, commit, PR, CI and deployment before volatile status updates.
- Merge, deployment and production transfer are separate approval gates.

## Experience development lifecycle
Discover the workflow, user context, environment and constraints; explore materially different directions; prototype where feasibility or interaction matters; validate technical constraints; obtain approval; implement and QA. Scale the process to the task. Do not inherit former M0 aesthetics or approval gates as active instructions.

## Cross-platform presentation governance
- Desktop and Mobile may own independent shells, navigation and presentation composition while sharing business logic, data contracts and operation results.
- A feature request without a platform qualifier defaults to shared Desktop + Mobile. Explicit platform-only scope must be recorded in the capability matrix.
- Nine current Home workflows are shared Desktop/Mobile. Camera barcode scanning and camera-only copy/presentation are Mobile-only; manual barcode lookup remains shared. Tablet is review-required.
- Responsive adapts the selected presentation; viewport breakpoints do not decide product capability.
- Canonical policy: DECISIONS.md PD-007/PD-008, ARCHITECTURE.md ADR-030 and PLATFORM_CAPABILITY_MATRIX.md.

## Technical workstreams
- **SH-01 shell/platform presentation — complete:** PR #193 merged to main at `58d478cf6e8d6e5277c7ca2b60b274731670dfd0`. Exact-head CI #1948 passed on `3381cdf9c79521f29641ab41ef95b60033d9169a`, including 10 Playwright tests. See SH-01_SHELL_PRESENTATION_OWNERSHIP.md.
- **PW-01 physical PWA acceptance — pending:** validate installed mode, system UI, safe areas, dynamic viewport, keyboard, orientation, permissions and lifecycle on target physical iOS/iPadOS and Android devices, including lower-end devices.
- **CSS-01 CSS ownership migration — pending:** map shared foundation, platform presentation and feature-owned layers; trace imports, cascade, consumers and computed styles before moving rules. No broad deletion is authorized by an audit.
- **AUDIT-03A production CSS baseline — proposed:** measure production CSS delivery and bundle composition before deciding whether optimization is warranted.
- **UI-04 feature presentation migration — complete:** UI-04A–F are merged. See UI_UX_PHASE_04_FEATURE_PRESENTATION.md.
- **UI-03 CSS consolidation — complete:** merged in PR #180; see UI_UX_PHASE_03_CSS_CONSOLIDATION.md.

## Technical invariants
Preserve auth/session, module registry and stable IDs, snapshot/cache/offline contracts, scanner engine/lifecycle, Stocktake persistence/export, Import parsing/precision/conflict handling, overlay lifecycle, PWA update-safety and GitHub Pages deployment boundaries. Scanner stabilization is closed; reopen only for a reproducible defect, measured bottleneck or new requirement.

## Verification discipline
Distinguish source inspection, automated CI, browser emulation, physical-device acceptance, owner approval, merge and deployment. Evidence for one gate does not imply completion of another.
