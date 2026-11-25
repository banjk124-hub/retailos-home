# RetailOS Product & Engineering Standard

**Authority:** Governing product/design/engineering workflow for all current and future RetailOS work. The installed `RetailOS Product Studio` plugin skill is its executable cross-chat companion; this file is the repository source of truth.

## 1. Product objective
RetailOS is a modern operational workspace / OS-like environment for supermarket and retail operations—not an AppSheet reskin, generic admin dashboard or unrelated form collection. It must be distinctive, premium, operationally accurate, professional on desktop, adaptive on tablet, task-focused on mobile and usable on average/lower-end devices.

## 2. Identity and references
The sole active UI/UX direction is [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md).
Owner-confirmed anchors: burgundy/dark-red brand; Vietnamese-first typography; authentic supermarket/retail imagery. The supplied image guides art direction/composition; the video guides motion/transitions/interaction feedback. RetailOS owns business meaning, data truth and architecture. Do not import amber/yellow or green as brand colors, copy reference products/layouts, or invent exact motion values.

## 3. Open design system
Design System is an extensible language: design language; proven shared foundations; feature-owned experiences; future extension only when needed. Consistency means recognizable identity, semantics, interaction quality, accessibility and engineering standards—not identical layouts. Promote components to shared only after cross-feature value is demonstrated. Avoid speculative abstractions, mega-components, duplicate systems and permanent override layers.

## 4. Motion contract
Motion is first-class and not restricted to subtle effects. Use micro-interaction, navigation/state transitions, progressive reveal, loading/feedback, gesture and depth effects when useful. Every effect must acknowledge, orient, focus, reveal, explain state or preserve continuity. Input feedback is immediate. Motion never creates business state or triggers duplicate requests/writes/subscriptions. Respect reduced-motion and power-conserve; interrupted transitions converge to source truth; stale async results cannot replace current state. Scanner lifecycle never waits for decorative motion. Measure CPU, memory, frame stability, input-to-feedback and bundle impact. Expensive effects are allowed when value and cost are demonstrated.

## 5. Technology decision gate
Before new foundations/dependencies, audit framework/runtime, routing, CSS ownership, tokens/components, icon/image strategy, Vietnamese typography, motion engine, responsive/accessibility, tests, bundle/lazy boundaries and low-end performance. Compare current/native, adoption, replacement and focused custom implementation. Record compatibility, migration/maintenance, license, runtime/bundle cost, fallback and tests. Mark KEEP / ADOPT / REPLACE / BUILD / DEFER. No dependency without evidence and a recorded decision.

## 6. Protected architecture
Presentation changes must not silently change business logic, persistence, permissions or APIs. Protect auth/session/employee identity; module registry/stable IDs/readiness; snapshot/cache/offline semantics; Scanner Engine/session/camera/decoder/ROI; Stocktake persistence/revisions/validation/history/export; Import parsing/precision/conflict/dirty-edit/persistence/output; overlay/body-scroll-lock/focus; PWA consent/staging/integrity/activation/boot health/rollback; Vite/GitHub Pages base `/retailos-home/`, deployment and lazy loading. Scanner stabilization is closed; do not reopen engine internals for UI redesign.

## 7. Required workflow
1. Identify deliverable.
2. Verify current `main`, source, tests, PR/CI and canonical docs; memory is not proof.
3. Load only relevant context/contracts.
4. Separate facts, proposals, unknowns and owner decisions.
5. Trace dependencies and protected boundaries.
6. Work in bounded batches.
7. Run checks and inspect rendered UI when applicable.
8. Update canonical docs with evidence/status/next action.
9. Report exact branch/commit/PR/tests and distinguish merge, deployment and production promotion.
Do not ask the user to repeat recorded decisions. Do not replace execution with generic narration.

## 8. UI/UX sequence
- **M0:** follow [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md): documentation consolidation, source-grounded visual direction, motion/interaction, cross-surface integration, technology evaluation and owner acceptance.
- **M1:** only after explicit M0 acceptance; implement approved foundations and components required by real consumers.
- **M2+:** migrate Shell/navigation and existing workspaces in bounded slices, composing per viewport and preserving real states/data.
- Consolidate only with consumer/cascade evidence; validate accessibility, motion, browser/device behavior, performance and protected contracts.
A plan, mockup, token file or test alone does not complete a phase.

## 9. Verification and release
Inspect scripts before use. Run applicable focused tests, preflight, production build and Pages build. Record exact commit/results. Inspect desktop/tablet/mobile renderings; physical-device checks are separate from browser emulation and CI. Measure bundle, lazy chunks, cold/warm entry, input feedback, long tasks, CPU and memory. No merge without explicit owner approval; no deployment without explicit authorization.

## 10. Documentation governance
This file is the product-wide authority. INDEX is navigation authority; IMPLEMENTATION_STATUS is verified state; AI_HANDOFF is continuation point; domain contracts own technical invariants; UI_UX_M0_GOVERNING_SPEC is the sole active M0 specification. Historical plans/audits retain evidence, not competing instructions. Keep Scanner knowledge in SCANNER_ENGINE and SCANNER_HISTORY. Keep this repository standard paired with the installed Product Studio skill; verify both before claiming cross-chat governance is synchronized.

## 11. Reporting
Report Kết luận, Đã thực hiện, Bằng chứng, Chưa hoàn tất/rủi ro, Bước tiếp theo. Use Vietnamese by default and exact technical terminology. Never claim unverified work/tests/merge/deployment/acceptance.