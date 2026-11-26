# RetailOS Product & Engineering Standard

**Authority:** Governing product/design/engineering workflow for all current and future RetailOS work. The installed RetailOS Product Studio plugin skill is its executable cross-chat companion; this file is the repository source of truth.

## 1. Product objective
RetailOS is a modern operational workspace / OS-like environment for supermarket and retail operations—not an AppSheet reskin, generic admin dashboard or unrelated form collection. It must be distinctive, premium, operationally accurate, professional on desktop, adaptive on tablet, task-focused on mobile and usable on average/lower-end devices.

## 2. Identity and references
The sole active UI/UX direction and greenfield implementation contract is EXPERIENCE_BUILD_STANDARD.md.
Owner-confirmed anchors: burgundy/dark-red brand; Vietnamese-first typography; authentic supermarket/retail imagery. The supplied image guides art direction/composition; the video guides motion/transitions/interaction feedback. RetailOS owns business meaning, data truth and architecture. Do not import amber/yellow or green as brand colors, copy reference products/layouts, or invent exact motion values.

## 3. Open design system and reuse
Design System is an extensible language: design language; proven shared foundations; feature-owned experiences; future extension only when needed. Consistency means recognizable identity, semantics, interaction quality, accessibility and engineering standards—not identical layouts.

Reuse is semantic and behavioral, not cosmetic:
- Inspect existing consumers and ownership before building.
- Reuse only when responsibility, meaning, state behavior, accessibility and lifecycle are equivalent.
- Keep feature-owned components when workflows differ; share lower-level primitives only where the contract is genuinely common.
- Promote to shared only after multiple real consumers, stable API, explicit owner and regression tests demonstrate value.
- Avoid speculative abstractions, mega-components, duplicate systems and permanent override layers.

Follow COMPONENT_AND_PATTERN_GOVERNANCE.md for promotion, extension and deprecation.

## 4. Motion contract
Motion is first-class and not restricted to subtle effects. Use micro-interaction, navigation/state transitions, progressive reveal, loading/feedback, gesture and depth effects when useful. Every effect must acknowledge, orient, focus, reveal, explain state or preserve continuity. Input feedback is immediate. Motion never creates business state or triggers duplicate requests/writes/subscriptions. Respect reduced-motion and power-conserve; interrupted transitions converge to source truth; stale async results cannot replace current state. Scanner lifecycle never waits for decorative motion. Measure CPU, memory, frame stability, input-to-feedback and bundle impact. Expensive effects are allowed when value and cost are demonstrated.

## 5. Technology and creative exploration
Do not lock the product to today's library, browser, framework, design system, brand tooling, image source or motion implementation. Explore new options when a real problem or opportunity warrants it. Prototype in the actual RetailOS source/runtime or an isolated code experiment; Figma is not a required workflow or acceptance dependency.

Before adoption/replacement, compare current/native APIs, existing dependencies, adoption, replacement and focused custom implementation. Evaluate source compatibility, browsers/devices, accessibility, Vietnamese support, PWA/offline, licensing, security, maintenance, bundle/runtime cost, CPU/memory, low-end fallback, migration and rollback. Record KEEP / ADOPT / REPLACE / BUILD / DEFER / REJECT and define a revisit trigger. Use TECHNOLOGY_RADAR.md. A radar entry or prototype is not approval to add a dependency or change production architecture.

## 6. Architecture and protected contracts
Protect stable contracts without freezing replaceable implementations. Extension points must preserve stable IDs, public APIs, persisted data, lifecycle ownership, feature boundaries and compatibility. New implementations may be staged behind adapters or bounded interfaces where justified; migration must include consumers, tests, fallback and rollback. Do not create abstractions solely for hypothetical futures.

Presentation changes must not silently change business logic, persistence, permissions or APIs. Protect auth/session/employee identity; module registry/stable IDs/readiness; snapshot/cache/offline semantics; Scanner Engine/session/camera/decoder/ROI; Stocktake persistence/revisions/validation/history/export; Import parsing/precision/conflict/dirty-edit/persistence/output; overlay/body-scroll-lock/focus; PWA consent/staging/integrity/activation/boot health/rollback; Vite/GitHub Pages base /retailos-home/, deployment and lazy loading. Scanner stabilization is closed; do not reopen engine internals for UI redesign.

## 7. Decision, terminology and removal governance
Before proposing a solution:
1. Check current owner decisions, architecture ADRs, relevant domain contracts and prior rejected/deprecated options.
2. Separate verified facts, owner-confirmed decisions, proposals, experiments and unknowns.
3. If an option was rejected, do not repeat it without a defined reconsideration trigger and new evidence.
4. If terminology or technical direction is owner-locked, use the canonical glossary and do not silently redefine it.
5. Remove incorrect/obsolete items only through consumer, behavior, replacement, risk, test and rollback evidence.

Authorities:
- DECISIONS.md — product/cross-domain decisions and rejected options.
- ARCHITECTURE.md — architecture ADRs and invariants.
- TERMINOLOGY_GLOSSARY.md — canonical terms and status vocabulary.
- DEPRECATION_REGISTER.md — deprecation, migration and removal lifecycle.

## 8. Required workflow
1. Identify deliverable and acceptance criteria.
2. Verify current main, source, tests, PR/CI and canonical docs; memory is not proof.
3. Load only relevant context/contracts and check the decision/deprecation history.
4. Separate facts, proposals, unknowns and owner decisions.
5. Trace producers, consumers, dependencies and protected boundaries.
6. Explore options where appropriate; prototype and measure before choosing.
7. Work in bounded batches and resolve one issue at a time.
8. Run applicable checks and inspect rendered UI when relevant.
9. Update canonical docs with evidence, status, decision and next action.
10. Report exact branch/commit/PR/tests and distinguish merge, deployment and production promotion.

Do not ask the user to repeat recorded decisions. Do not replace execution with generic narration.

## 9. UI/UX implementation
Follow EXPERIENCE_BUILD_STANDARD.md. Rebuild the Experience Layer as a greenfield product surface; do not restyle or inherit the legacy UI as the visual/component foundation. Inspect legacy source only to preserve business behavior, contracts, lifecycle ownership and regression constraints. Keep the existing Business Core stable and connect the new experience through thin adapters. Deliver visible, working vertical slices; do not introduce M0/M1 audit gates or broad legacy CSS audits as prerequisites.

## 10. Verification and release
Inspect scripts before use. Run applicable focused tests, preflight, production build and Pages build. Record exact commit/results. Inspect desktop/tablet/mobile renderings; physical-device checks are separate from browser emulation and CI. Measure bundle, lazy chunks, cold/warm entry, input feedback, long tasks, CPU and memory. No merge without explicit owner approval; no deployment without explicit authorization.

## 11. Documentation governance
This file is the product-wide authority. INDEX is navigation authority; IMPLEMENTATION_STATUS is verified state; AI_HANDOFF is continuation point; domain contracts own technical invariants; EXPERIENCE_BUILD_STANDARD is the sole UI/UX implementation authority. Detailed component, technology, terminology and removal policies live in their linked canonical registers; do not duplicate their contents here.

## 12. Reporting
Report Kết luận, Đã thực hiện, Bằng chứng, Chưa hoàn tất/rủi ro, Bước tiếp theo. Use Vietnamese by default and exact technical terms. Never claim unverified work/tests/merge/deployment/acceptance.

## 13. Lean browser testing
Use Playwright to verify real user journeys, not to generate recurring diagnostic archives.
- Keep a small smoke suite for Login, authenticated Home and the feature changed in the current slice.
- Cover representative desktop, tablet and mobile profiles; add a viewport only for a demonstrated layout risk.
- Assert user-visible behavior through roles, labels and actions. Avoid brittle CSS/cascade assertions and selector inventories.
- Keep traces/screenshots on failure. Do not dump the full DOM, computed styles, CSS rules or all-screen screenshots on every CI run.
- Run domain regression tests when their source/contracts change; Scanner tests are scoped to Scanner changes and planned integration/release gates.
- Run full regression before major integration acceptance and production promotion, not for every documentation or small visual change.
- Browser emulation is not physical-device acceptance. Perform device-specific QA on coherent feature slices and before release.
- Do not add Playwright to the production runtime/bundle.
