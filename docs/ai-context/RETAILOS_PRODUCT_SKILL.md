# RetailOS Product & Engineering Standard

**Authority:** Governing product/design/engineering workflow for all current and future RetailOS work. The installed RetailOS Product Studio plugin skill is its executable cross-chat companion; this file is the repository source of truth.

## 1. Product objective
RetailOS is a modern operational workspace / OS-like environment for supermarket and retail operations—not an AppSheet reskin, generic admin dashboard or unrelated form collection. It must be distinctive, premium, operationally accurate, professional on desktop, adaptive on tablet, task-focused on mobile and usable on average/lower-end devices.

## 2. Identity and references
The sole active UI/UX direction is UI_UX_M0_GOVERNING_SPEC.md.
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

## 9. UI/UX sequence
- M0: follow UI_UX_M0_GOVERNING_SPEC.md: source-grounded visual direction, motion/interaction, cross-surface integration, technology evaluation and owner acceptance.
- M1: only after explicit M0 acceptance; implement approved foundations and components required by real consumers.
- M2+: migrate Shell/navigation and existing workspaces in bounded slices, composing per viewport and preserving real states/data.
- Consolidate only with consumer/cascade evidence; validate accessibility, motion, browser/device behavior, performance and protected contracts.
A plan, mockup, token file or test alone does not complete a phase.

## 10. Verification and release
Inspect scripts before use. Run applicable focused tests, preflight, production build and Pages build. Record exact commit/results. Inspect desktop/tablet/mobile renderings; physical-device checks are separate from browser emulation and CI. Measure bundle, lazy chunks, cold/warm entry, input feedback, long tasks, CPU and memory. No merge without explicit owner approval; no deployment without explicit authorization.

## 11. Documentation governance
This file is the product-wide authority. INDEX is navigation authority; IMPLEMENTATION_STATUS is verified state; AI_HANDOFF is continuation point; domain contracts own technical invariants; UI_UX_M0_GOVERNING_SPEC is the sole active M0 specification. Detailed component, technology, terminology and removal policies live in their linked canonical registers; do not duplicate their contents here.

## 12. Reporting
Report Kết luận, Đã thực hiện, Bằng chứng, Chưa hoàn tất/rủi ro, Bước tiếp theo. Use Vietnamese by default and exact technical terms. Never claim unverified work/tests/merge/deployment/acceptance.

## 13. Playwright-assisted implementation and verification
Use Playwright as the preferred browser automation and visual feedback layer for browser-relevant implementation work. It should help the engineer inspect the real application while coding—not merely run a final test after implementation.

Workflow:
1. Inspect the existing package scripts, test stack, app entry points, routing and test fixtures before adding or changing tooling.
2. Start the actual RetailOS development build and verify the target workflow in a real browser context.
3. Capture repeatable screenshots at agreed desktop, tablet and mobile viewport profiles. Use them to inspect composition, hierarchy, typography, image treatment, responsive transitions, clipping, overlap, density and overlay placement.
4. Exercise the actual interactions and meaningful states, including keyboard/focus behavior, loading, empty, error and success states as relevant.
5. Use assertions for behavior; use screenshots for visual inspection. Capture Playwright traces, console errors and failed requests when a test fails.
6. Prefer semantic locators (role, label, text) and stable test IDs only when necessary. Avoid brittle selectors based on CSS implementation details.
7. Keep browser tests focused on user journeys and integration boundaries; do not duplicate lower-level unit tests.
8. Separate deterministic screenshot setup from motion verification. Snapshot tests may stabilize time/data/animation, but motion, reduced-motion and interruption behavior must also be checked in a non-snapshot run.
9. Treat browser emulation as Browser-verified only. Physical-device checks remain mandatory for device-specific behavior such as camera permissions, scanner, vibration, installability and low-end performance.
10. Do not add Playwright to the production runtime/bundle. Tooling dependencies and CI integration require a scoped change, package/CI audit and owner approval; do not silently install or expand CI in a documentation batch.

For each relevant task, report browser/version or project browser profile, viewport, command, assertions, screenshot/trace evidence, failures and remaining device checks. Never claim Device-accepted from Playwright alone.
