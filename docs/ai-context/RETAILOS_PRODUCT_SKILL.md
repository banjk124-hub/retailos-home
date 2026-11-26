# RetailOS Product & Experience Engineering Standard

**Authority:** Product-wide principles and workflow for all RetailOS work. Technical domain contracts and architecture ADRs remain authoritative for their scopes.

## 1. Product objective
RetailOS is an OS-like operational workspace for supermarket and retail operations—not an AppSheet reskin or generic admin dashboard. It must support accurate business workflows and deliver a deliberate, high-quality experience across desktop, tablet and mobile, including average and lower-end devices.

## 2. Three decision classes

### Technical Invariants
Verified contracts that protect correctness and safe operation: identity/auth/session, stable module IDs and readiness, data schemas and persistence, snapshot/cache/offline truth, scanner camera/session/decoder lifecycle, stocktake revisions/history/export, import parsing/precision/conflicts/dirty edits, overlay focus/body-scroll-lock, PWA update consent/staging/activation/rollback, Vite/GitHub Pages base path, accessibility and release boundaries.

These are not aesthetic preferences. Do not alter them casually; a change requires impact analysis, migration, regression evidence and owner approval proportional to risk.

### Product Principles
Qualities to optimize against the actual user and workflow: clarity, task efficiency, trust, learnability, discoverability, accessibility, responsive composition, useful feedback, resilience, appropriate density and performance.

Principles guide trade-offs. They do not dictate one universal layout or visual style.

### Creative Decisions
Palette, typography, imagery, composition, layout, information density, visual hierarchy, iconography, surface/material, depth, motion, animation, transitions and component appearance.

There is no mandatory global default. Minimal, Liquid Glass, editorial, expressive, photographic, typographic, industrial, data-dense, skeuomorphic or other directions may be explored where appropriate. None is automatically preferred or prohibited. Do not infer that a previous choice, existing token or component is the design brief.

## 3. Experience discovery and creative workflow

For meaningful UI/UX work, use this sequence. Scale the depth to the task; do not turn a small copy or spacing fix into a design ceremony.

1. **Experience Discovery**
   - Identify user/persona, task, frequency, environment, device, interruptions and operational stakes.
   - Understand current pain points, existing workflow and data/state available.
   - Define the desired outcome and acceptance signals.
   - Record constraints separately from assumptions and aesthetic preferences.

2. **Creative Exploration**
   - Explore materially different concepts when the problem is open-ended.
   - Consider composition, hierarchy, typography, color, imagery, density, navigation, component form, materials and motion as a coherent whole.
   - Do not limit exploration to current components, CSS tokens, the last accepted screen or an AI's familiar style.
   - Use references only for the aspects the owner wants to study; do not copy unrelated product semantics.

3. **Concept and Prototype**
   - Explain the concept through a clear hierarchy, layout and interaction model.
   - Use static mockups for composition questions; use a source/runtime prototype when behavior, responsive layout, motion, data or technical feasibility matters.
   - Prefer a running prototype in RetailOS when practical. External design tools are optional and never a required blocker.
   - A prototype is evidence for discussion, not implementation approval.

4. **Technical Feasibility**
   - Map the concept to actual React/Vite architecture, state ownership, source data, components, APIs and lifecycle contracts.
   - Check browser/platform compatibility, keyboard/touch/accessibility, Vietnamese content where applicable, responsive behavior, PWA/offline constraints, licensing, bundle/runtime cost, CPU/memory and low-end fallback.
   - Identify what can be implemented directly, what needs adaptation, and what would require a migration or new dependency.

5. **Owner Review and Approval**
   - Present the recommended direction, meaningful alternatives, trade-offs and evidence.
   - Obtain explicit approval before treating a creative direction as accepted or implementing a substantial redesign.
   - Record the approval scope: screen, workflow, module or product-wide system.
   - Approval for one surface does not automatically authorize reuse across unrelated surfaces.

6. **Implementation and QA**
   - Implement the approved direction in bounded slices.
   - Verify real data, states, interactions, responsiveness, accessibility and performance.
   - Use browser automation and screenshots as evidence where useful; separate browser emulation from physical-device acceptance.
   - Update the decision record and handoff when direction or verified state changes.

For routine, narrowly scoped fixes with an already-approved local direction, proceed directly after checking source and acceptance criteria. Do not ask for approval of every implementation detail.

## 4. Decision lifecycle
Use these statuses when tracking a material creative or product decision:

- **Proposed** — an option suggested, not selected.
- **Explored** — compared with alternatives.
- **Prototyped** — represented in a mockup or running implementation for evaluation.
- **Owner-approved** — explicitly approved by the owner for a stated scope.
- **Implemented** — merged into the relevant source branch.
- **Verified** — required checks/evidence passed for the stated context.
- **Superseded** — replaced by a newer direction; retain history.
- **Rejected** — explicitly not selected; retain rationale and reconsideration trigger.

AI agents may recommend, compare and prototype. They must never promote a decision to Owner-approved. A green build, passing CI, a generated mockup, a prototype or owner silence is not approval.

## 5. Design systems and component reuse
A design system is an outcome of validated product needs, not a mandatory starting template. Existing tokens and components are reusable implementation assets, not creative constraints.

Reuse is based on equivalent responsibility, semantics, state behavior, accessibility and lifecycle—not visual resemblance alone. Keep feature-owned experiences when workflows differ. Promote a shared component only when multiple real consumers demonstrate value and a stable contract can be defined. Do not force every screen into cards, dashboards, one shell composition or one density.

See COMPONENT_AND_PATTERN_GOVERNANCE.md for the shared-component lifecycle.

## 6. Motion and interaction
Motion is a product communication tool, not automatically decoration and not automatically required. Use it when it acknowledges action, orients, reveals, explains state, directs attention or preserves continuity. Feedback must remain immediate. Animation must not own business state, trigger duplicate writes/requests, block workflows or delay camera/scanner lifecycle. Preserve reduced-motion and power-conserve behavior; interrupted transitions converge to source truth. Measure runtime cost and provide a suitable fallback.

## 7. Technology and creative exploration
Do not lock RetailOS to today's framework, browser APIs, design system, component library, icon set, image source or motion implementation. Explore new options when a real need warrants it. Compare current/native APIs, existing dependencies, adopt, replace and focused custom-build options.

Evaluate compatibility, accessibility, localization, PWA/offline, license, security, maintenance, bundle/runtime cost, CPU/memory, low-end fallback, migration and rollback. Record material choices in TECHNOLOGY_RADAR.md. A proposal or prototype is not permission to add a dependency, change architecture or deploy.

## 8. Protected product and technical boundaries
Preserve auth/session/employee identity; module registry and stable IDs/readiness; snapshot/cache/offline semantics; Scanner Engine/session/camera/decoder/ROI; Stocktake persistence/revisions/validation/history/export; Import parsing/precision/conflict/dirty-edit/persistence/output; overlay/body-scroll-lock/focus; PWA consent/staging/integrity/activation/boot-health/rollback; Vite/GitHub Pages base path and deployment/lazy-loading boundaries.

Scanner stabilization is closed. Do not reopen engine internals for presentation work without a reproducible defect, measured bottleneck or new requirement.

## 9. Research, implementation and evidence
- Verify current source, branch, commit, tests and CI; memory and stale documentation are not proof.
- Read the relevant domain contracts and decision/deprecation history.
- Trace producers, consumers, persisted state, async lifecycle and failure paths.
- Prefer the simplest solution that satisfies the complete requirement; do not create speculative abstractions.
- Work on isolated branches. No merge, deployment, production transfer, credential or cloud change without explicit approval.
- Run actual checks and inspect the final diff. Never claim an unrun test or device check passed.
- Distinguish source-inspected, CI-verified, browser-verified, device-accepted and owner-approved.

## 10. Documentation ownership
INDEX is navigation; PROJECT_CONTEXT stores durable facts and current owner direction; ARCHITECTURE owns technical ADRs/invariants; DECISIONS owns product/cross-domain decisions; domain contracts own subsystem details; COMPONENT_AND_PATTERN_GOVERNANCE owns reuse; TECHNOLOGY_RADAR owns technology evaluation; DEPRECATION_REGISTER owns removal; ROADMAP owns future scope; IMPLEMENTATION_STATUS owns verified state; AI_HANDOFF owns continuation.

Do not create duplicate authorities or load the entire archive for routine work.

## 11. Reporting
Report the objective, recommendation/decision status, options and trade-offs, files changed, exact checks/evidence, unverified risks and next action. Use Vietnamese by default and preserve technical terminology.
