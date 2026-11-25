# RetailOS Product & Engineering Standard

**Authority:** Governing product/design/engineering workflow for all current and future RetailOS work. The installable skill `RetailOS Product Studio` contains the full executable workflow; this document is its repository-level source of truth.
**Repository:** `banjk124-hub/retailos-home`
**Last consolidated:** 2026-11-25

## 1. Product objective

RetailOS is a modern operational workspace / OS-like environment for supermarket and retail operations — not an AppSheet reskin, generic admin dashboard, or collection of unrelated forms.

The target is distinctive, premium, component-led, visual-first, operationally accurate, professional on desktop, adaptive on tablet, task-focused on mobile, and usable on average/lower-end devices. Reduce unnecessary text; prefer purposeful components, icons, imagery, cards, panels, charts, concise labels and clear actions. Never hide critical operational meaning or safety information.

## 2. Reference authority

- **Supplied image:** structural/visual composition — modular layouts, deliberate hierarchy, varied proportions, negative space, dimensional surfaces, light/dark treatments and polished craft.
- **Supplied video:** animation, motion, transitions, progressive readiness, interaction feedback and state behavior.
- **RetailOS:** authoritative for red/white brand identity, Vietnamese-first operational language, retail semantics, data truth, feature ownership and architecture.

Do not copy source palettes, typography, app domains, exact layouts or invented features. Amber/yellow in the image and unrelated palettes in the video are not RetailOS tokens. The owner accepts sophisticated/heavier effects when they serve a clear purpose and justify their runtime cost; do not impose a blanket “subtle motion only” rule.

## 3. Open design system

Design System is an extensible language, not a closed component catalogue. Its layers are:
1. Design language: brand, semantic color, typography, iconography, imagery, materials, spacing, responsive principles, motion and accessibility.
2. Shared foundations/components: only components with proven cross-feature value.
3. Feature-owned experiences: specialized composition and components required by real workflow semantics.
4. Future extension: add only when a concrete requirement exists.

Consistency means recognizable RetailOS identity, semantic meaning, interaction quality and engineering standards — not identical layouts. Reuse only when semantics and behavior fit. Promote feature-owned components to shared only after cross-feature value is demonstrated. Avoid speculative abstractions, mega-components, duplicate systems and permanent override layers.

## 4. Motion contract

Motion is a first-class capability, not decoration and not restricted to low-energy effects. Use micro-interaction, state/layout/navigation transitions, progressive reveal, loading/feedback, gesture and advanced depth effects when they improve the task.

Every effect must acknowledge, orient, focus, reveal, explain state change or preserve spatial continuity. Input feedback is immediate. Motion never creates business state or triggers duplicate requests/writes/subscriptions. Respect Reduced Motion and power-conserve while preserving task clarity. Interrupted transitions converge to source truth; stale async results cannot replace current state. Scanner cadence/camera lifecycle never waits for decorative animation. Measure CPU, memory, frame stability, input-to-feedback, bundle impact and low-end fallback. Expensive blur, filters, layered effects and image/video are allowed selectively when their value and cost are demonstrated.

## 5. Technology decision gate

Before a new foundation or major dependency, audit current framework/runtime, routing, CSS ownership/cascade, token/component systems, icon/image strategy, typography and Vietnamese glyphs, motion engine, responsive/accessibility support, test tooling, bundle/lazy boundaries, CPU, memory and low-end behavior.

Compare native/current implementation, adoption, replacement and focused custom implementation. Record the problem, alternatives, compatibility, migration/maintenance cost, license, bundle/runtime cost, fallback and tests. Mark each choice `KEEP`, `ADOPT`, `REPLACE`, `BUILD` or `DEFER`. No library/framework is selected until evidence and the decision are recorded. Do not add dependencies merely because they are popular.

## 6. Architecture and protected contracts

Ownership: App Shell owns global navigation/header/workspace outlet; Design System owns tokens/primitives/shared components; shared platform owns established cross-feature contracts; feature modules own workflow/state/validation/persistence; domain/platform contracts own business and runtime invariants.

Presentation work may change structure, appearance and interaction, but must not silently change business logic, persistence, permissions or API contracts. Protect:
- Auth/session, employee identity and department mapping.
- Canonical module registry, stable IDs and readiness.
- Snapshot/cache freshness, stale/missing/error distinctions, batching and offline behavior.
- Scanner Engine/session, camera lease/lifecycle/recovery, decoder, ROI and feature handoff.
- Stocktake persistence, revisions, validation, history and export.
- Stocktake Import parsing, precision, duplicate/conflict, dirty-edit, persistence and exact output.
- Shared overlay/body-scroll-lock and focus behavior.
- PWA cache/update/release consent, staging, integrity, activation, boot health and rollback.
- Vite/GitHub Pages base `/retailos-home/`, build/deploy workflow and lazy-load boundaries.

Scanner stabilization is closed and owner-confirmed operationally. Do not reopen Scanner Engine internals or revive retired Worker/diagnostics experiments as part of UI redesign. Presentation-only Scanner work must preserve engine contracts.

## 7. Required workflow for every task and chat

1. Identify the requested deliverable.
2. Recover current truth from current `main`, source, tests, relevant PR/CI and canonical docs. Prior chat summaries and memory are not proof of current status.
3. Load only relevant context and feature contracts.
4. Separate verified facts, proposals, unknowns and owner-approved decisions.
5. Trace dependencies and protected boundaries before editing.
6. Work in bounded batches; resolve issues sequentially through the requested outcome.
7. Execute tests/builds and inspect actual rendered UI when applicable.
8. Update this canonical knowledge with decisions, evidence, status and next action.
9. Report exact branch/commit/PR/tests and distinguish merge, Pages deployment and production promotion.

Ask only when a missing decision blocks safe progress. Do not ask the user to repeat decisions already recorded. Do not replace execution with repeated plans or generic progress narration.

## 8. UI/UX redesign sequence

- **M0 — Direction & technology:** source audit, reference interpretation, representative desktop/tablet/mobile compositions, technology evaluation, source-backed prototype and explicit owner decisions.
- **M1 — Design foundation:** approved semantic tokens, typography, icon/image/material/motion foundations and only the components required by real consumers.
- **M2+ — Existing product migration:** replace current Shell/navigation and existing screens/workspaces in bounded slices; recompose for each viewport rather than shrinking desktop; preserve real states/actions/data; add feature-owned components when needed.
- **Consolidation:** retire superseded code only with consumer/cascade evidence; unify docs; validate accessibility, motion, browser/device behavior, performance and protected contracts.

A plan, token file, mockup or test alone does not complete a phase. Completion requires source implementation, running app, inspected rendered surfaces, required test evidence and explicit acceptance.

## 9. Verification and release

Inspect repository scripts before relying on remembered commands. Run applicable focused tests, `npm run preflight`, `npm run build` and `npm run build:pages` for relevant changes. Record exact commit and outcomes. For UI, run the app and inspect rendered desktop/tablet/mobile surfaces before asking the owner for physical-device testing. Record device model, OS/browser, viewport, PWA/tab mode, build ID, date and scenario. Browser emulation is not physical-device acceptance.

Measure bundle, lazy chunks, cold/warm entry, input-to-feedback, long tasks, scroll, CPU and memory for major changes. CI green is not visual, physical-device or business-workflow acceptance.

No merge without explicit owner approval. No deployment without explicit deployment authorization. Development Pages is not department production promotion.

## 10. Documentation governance

This document and the installable `RetailOS Product Studio` skill are the governing product workflow. The repository index and handoff must point here. Keep one concise current-status surface; detailed evidence belongs in the owning domain/history document. Preserve unique historical evidence, but mark superseded plans as non-authoritative. Resolve contradictions with current source/PR evidence or mark them unresolved — never guess. Keep Scanner knowledge only in `SCANNER_ENGINE.md` and `SCANNER_HISTORY.md`.

Treat the plugin skill and repository standard as a paired authority: the repository standard preserves durable product rules, while the plugin skill adds the operational procedure needed to execute them in ChatGPT/Codex. Any change to one must be checked against the other before release.

## 11. Reporting

For substantive work report: **Kết luận**, **Đã thực hiện**, **Bằng chứng**, **Chưa hoàn tất/rủi ro**, **Bước tiếp theo**. Use Vietnamese by default with exact technical terminology. Never claim work, tests, merge, deployment or acceptance without evidence.
