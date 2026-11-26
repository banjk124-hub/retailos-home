# RetailOS — Agent Operating Contract

## Mission
Build and evolve RetailOS as a reliable retail operations workspace. Product quality includes business correctness, workflow efficiency, visual communication, interaction quality and a coherent experience. None of these dimensions is automatically subordinate to another; their priority is determined by the task and owner intent.

## Authority and context
1. Explicit current owner direction for the stated scope.
2. Current source, tests, configuration and observed runtime for implemented behavior.
3. Canonical repository documents and domain contracts for accepted intent and invariants.
4. Current official technical documentation and reproducible evidence.
5. Historical records, prior chats and AI memory as investigative context, never proof.

Start with `docs/ai-context/INDEX.md`, `PROJECT_CONTEXT.md`, `IMPLEMENTATION_STATUS.md` and `AI_HANDOFF.md`. Load the Product Skill and only the domain contracts relevant to the task. For experience work, use the experience workflow in the Product Skill; do not load superseded M0 visual direction as an active constraint.

## Mandatory workflow
1. Define the user, task, context, desired outcome, scope and non-goals.
2. Verify current repository, branch, commit, working diff, relevant source, tests and CI state.
3. Separate technical invariants, product principles, creative decisions, verified facts, assumptions and open questions.
4. For experience work, explore more than one materially different direction when the problem warrants it. Do not begin by forcing the request into existing components or tokens.
5. Present concepts/prototypes as proposals until the owner explicitly approves a direction.
6. Validate technical feasibility, browser/device compatibility, accessibility, performance and protected contracts.
7. Implement only the approved scope in bounded, reviewable changes.
8. Run relevant checks, inspect the actual rendered experience and review the final diff.
9. Update the canonical status/handoff and decision records when their owned information changes.
10. Report exact branch/commit, files, evidence, checks and unverified gaps.

## Experience and design governance
- No mandatory global aesthetic, design language, color palette, typography, imagery style, layout grammar, surface material, icon style or motion signature is prescribed by repository defaults.
- Minimal, Liquid Glass, editorial, skeuomorphic, industrial, photographic, typographic, data-dense, expressive and other approaches are neither mandatory nor prohibited. Choose only after understanding the experience problem.
- Existing tokens, components, CSS, motion utilities and visual patterns are implementation resources, not a design brief or a reason to constrain exploration.
- Do not assume every screen needs cards, dashboards, the same shell, the same density or the same composition.
- Do not treat decorative work as inherently low-value. Visual hierarchy, typography, imagery, material, composition and motion can carry product meaning and are first-class design decisions.
- A reference informs only the aspect explicitly requested or agreed; do not copy its product semantics or infer unrelated requirements.
- Do not mark a design owner-approved based on an AI recommendation, a passing build, a prototype or silence. Approval must be explicit and scoped.
- Approval for one screen or feature does not automatically establish a product-wide design system.
- Preserve historical concepts for traceability, but never keep superseded direction active through hidden instructions, copied prompts or stale handoffs.

## Decision classes
**Technical Invariants:** verified contracts that must remain correct unless a separately approved migration changes them. Examples include auth/session semantics, stable module IDs, data truth and persistence, scanner lifecycle, import/export contracts, PWA release safety, deployment boundaries and accessibility requirements.

**Product Principles:** desired qualities such as clarity, task efficiency, trust, learnability, responsiveness, accessibility, appropriate feedback and performance. They guide evaluation but do not prescribe one visual style.

**Creative Decisions:** palette, typography, imagery, composition, layout, density, iconography, surfaces/materials, visual hierarchy, motion and animation. These are open until explored and explicitly approved for their scope.

## Non-negotiable engineering and safety
- Inspect actual consumers and lifecycle contracts before cross-feature changes.
- Do not change stable module IDs, payloads, persisted schemas, auth/session semantics, service-worker lifecycle or Vite Pages base without a migration plan and regression evidence.
- Preserve snapshot/offline truth and avoid unnecessary polling, full refetches and redundant writes.
- Do not fabricate business data, readiness, metrics, actions or success states.
- No broad CSS/component/dependency deletion based only on age, size or appearance.
- Do not add dependencies, services, migrations or architecture layers without a demonstrated need and explicit approval.
- Do not deploy, publish, merge, overwrite production, rotate credentials or change cloud settings without explicit owner approval.
- Do not commit secrets, credentials, personal data or production exports.
- Distinguish source inspection, automated CI, local execution, browser verification and physical-device acceptance.
- Keep user-facing copy in Vietnamese unless the feature convention requires otherwise.

## Application release lifecycle
Before changing application source, runtime dependencies, build/deploy configuration or preparing a release, read `docs/ai-context/PWA_RUNTIME_RELEASE.md`. Preserve BUILD_ID, consent-before-download, separate activation consent, safe handoff, integrity verification, rollback and production deployment boundaries. Data-only refresh must not trigger an application release. Development Pages is not a production preview target.

## Documentation ownership
Use `docs/ai-context/INDEX.md` as the navigation map. Product Skill owns product/experience workflow; ARCHITECTURE owns architecture ADRs and technical invariants; DECISIONS owns product/cross-domain decisions; domain contracts own subsystem details; component governance owns reuse contracts; ROADMAP owns future work; IMPLEMENTATION_STATUS owns verified state; AI_HANDOFF owns the continuation point. Do not create competing authorities.

## Completion report
Report objective, scope, files changed, decisions, evidence, tests actually run, untested paths, risks, rollback and next action. Never imply that a proposal is approved or that unrun checks passed.
