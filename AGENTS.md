# RetailOS — Agent Operating Contract

## Mission
Implement RetailOS as a reliable mobile-first supermarket operations workspace. Prefer correct business behavior, explicit state, and low-friction workflows over decorative UI. Treat existing production behavior as protected until inspected and tested.

## Mandatory workflow
1. Inspect the actual repository and current git diff before editing. Never assume an old ZIP/patch matches the working tree.
2. Read `docs/ai-context/INDEX.md`, then `PROJECT_CONTEXT.md` and `IMPLEMENTATION_STATUS.md`; read only the canonical architecture/topic document and skill relevant to the task.
3. Establish baseline: package manager, scripts, TypeScript/build result, current branch/status, and existing tests. Record failures before changing code.
4. Make a short plan with files and regression risks. Implement one coherent vertical slice at a time.
5. After edits, run the narrowest relevant tests, then TypeScript/build. Never report a check as passed unless it was actually run and its exit status is known.
6. Inspect the diff for unintended changes, secrets, generated files, schema changes, or removed behavior.
7. Update `IMPLEMENTATION_STATUS.md` with changed files, tests run, results, and known limitations.

## AI context, research and ChatGPT Web workflow

- **Context loading is selective, not exhaustive:** start with `AGENTS.md`, `docs/ai-context/INDEX.md`, `PROJECT_CONTEXT.md` and `IMPLEMENTATION_STATUS.md`. Then read only the canonical topic document(s), relevant skill and source files needed for the task. Read historical logs only to answer a specific question or trace a regression.
- **Repository state outranks memory and prose:** verify the current default branch, commit, working branch, PR state, CI and deployment state from GitHub before describing them. Treat old branch names, dates and status text as historical unless independently reconfirmed.
- **ChatGPT Web / connected GitHub:** when working in ChatGPT Web with GitHub access, use the connected repository as the source of truth and make reviewable changes on an isolated branch. Do not claim local commands, browser/device QA or tests ran unless the corresponding execution/result is actually available. Use GitHub Actions as CI evidence and state exactly which commit/run it validates.
- **Token discipline:** prefer INDEX navigation, targeted file/line reads, focused diffs and concise handoffs. Do not load every document, repeat long historical narratives, or create duplicate context files to compensate for poor navigation.
- **Composable skills:** load `.github/skills/retailos-core/SKILL.md` as the shared reasoning/safety layer, then select only the task skill needed (audit, technical research or implementation). Load domain contracts through `docs/ai-context/INDEX.md`; do not load all skills or duplicate canonical knowledge.
- **Engineering gates:** apply the Complexity Gate and Risk/Dependency Gate from the CORE skill. Trace producers/consumers and persisted/lifecycle contracts before cross-feature changes; require evidence, regression coverage and rollback proportional to risk.
- **Technical exploration:** when a task involves architecture, performance or a new technology, investigate credible current options (prefer official documentation and reproducible evidence), compare trade-offs against RetailOS constraints, and separate exploratory ideas from accepted decisions. Do not introduce a dependency, service, migration or architectural change without an explicit decision and a bounded validation plan.
- **Evidence-based completion:** distinguish source inspection, automated CI, local execution and physical-device acceptance. A successful build is not proof of runtime/device acceptance. Record the exact commit and checks; list unverified items without implying they passed.

## Non-negotiable safety rules
- Do not deploy, push, publish, overwrite production, rotate credentials, or change cloud settings without explicit user approval.
- Do not overwrite the user's current working tree with a ZIP. Work on a branch or a separate copy and preserve a rollback point.
- Do not commit `.env`, OAuth tokens, service-account keys, personal data, or production exports.
- Do not change stable module IDs, data contracts, Apps Script API payloads, IndexedDB snapshot schema, authentication/session semantics, service-worker caching, or Vite base path without a written migration plan and regression tests.
- Do not fabricate module functionality, metrics, data, availability, or success notifications. A snapshot being available does not prove the workflow UI is implemented.
- Prefer small, reversible changes. No broad CSS deletion, backend rewrite, dependency replacement, or full-sheet overwrite without evidence and explicit plan.
- Do not introduce a new dependency if existing platform APIs or installed dependencies solve the problem adequately.
- Keep user-facing copy in Vietnamese unless the feature's existing conventions say otherwise.

## Product/design principles
- Mobile-first for Android and iOS; desktop should use the extra space rather than merely stretch mobile cards.
- A design system must define tokens, typography, spacing, surface, borders, shadows, states, and breakpoints. Avoid accumulating last-loaded CSS overrides as the permanent solution.
- Accessibility: semantic controls, keyboard operation, visible focus, sufficient contrast, reduced-motion support, safe-area insets, and meaningful accessible names.
- Performance: avoid unnecessary polling, full dataset refetches, full-sheet rewrites, and redundant state. Preserve snapshot-first/offline behavior when present.
- Every interactive control must have a truthful, tested action. No dead buttons or “Demo” behavior masquerading as a working module.

## Greenfield UI implementation rule

For every UI/UX task, follow `docs/ai-context/EXPERIENCE_BUILD_STANDARD.md`. Build the new Experience Layer directly in source; do not use the legacy UI, component tree or CSS cascade as the design foundation. Inspect legacy source only for business behavior, data/session contracts, lifecycle ownership and regression constraints. Do not restart M0/M1 audit phases or broad legacy CSS inventories. Keep tests focused on the changed user journey; run Scanner regression suites only when Scanner source/contracts change or at an integration/release gate.

## Completion report
Report: objective, files changed, behavior changed, tests actually run, results, untested paths, risks, rollback instructions, and next step. Separate facts from assumptions.


## Application release lifecycle contract (mandatory for every task)

- Before changing application source, modules, UI/UX, runtime dependencies, build/deploy configuration or preparing a release, read `docs/ai-context/PWA_RUNTIME_RELEASE.md` and classify the work as Application Lifecycle, Data Lifecycle or both.
- Every development build must publish a build-bound release manifest. `BUILD_ID` identifies each build; `package.json` version expresses the product release level and must not be used as the sole update detector. During development in the personal development GitHub/account, keep `release-notes.json` concise and generic; update it when needed to reflect ongoing development, but do not spend time producing a complete staff-facing changelog for every PR or iteration. Do not bump SemVer merely to force update detection.
- Full, user-facing release notes are a production-promotion deliverable, not a per-PR development requirement. Only when the user explicitly selects a completed version for transfer to the store's shared production account/repository and Cloudflare deployment, prepare and approve the complete release notes: meaningful title/summary, grouped features and fixes, compatibility, operational warnings and any required staff action. At that point synchronize the production release version and manifest as one coherent release package.
- The user must explicitly approve downloading a new application payload. Do not download/stage the full candidate runtime before consent. Deferring must leave the current release usable, including its existing offline capabilities.
- Download and verify the complete release payload (including unopened/lazy modules, UI assets, workers, WASM and media) before activation. Lazy evaluation is allowed; lazy first-time downloading after activation is not.
- Consent to download is not consent to activate. After staging and integrity verification, keep the current release active and require a separate, explicit `Xác nhận cập nhật` action at a safe business handoff. Never auto-activate after staging or after app restart. `Để sau` must persist per device and BUILD_ID across reload/reopen. Protect operational work and retain last-known-good rollback until the new build reports healthy.
- Data-only lookup/snapshot refreshes and recalculation using existing logic must not change the app build ID, stage/activate a release, reload the app or clear release caches. A new processing mechanism or capability is an application release change.
- Treat `PWA_RUNTIME_RELEASE.md` as a mandatory cross-project development and deployment contract. Update it and the relevant status/handoff documents whenever the accepted release policy or implementation state changes. Never claim the target flow is implemented until source, automated tests and physical acceptance support that claim.
- Production deployment workflows must be restricted to `main`, including manual `workflow_dispatch`; never use the production GitHub Pages target to preview a feature branch. Physical QA previews must use an isolated preview target and must not replace production.

## Cross-session continuity contract (added 2026-11-05)
- At session start, read `docs/ai-context/INDEX.md`, `PROJECT_CONTEXT.md` and `IMPLEMENTATION_STATUS.md`; use INDEX to select only the relevant architecture/topic document and skill. Do not bulk-read the archive.
- Keep document ownership aligned with `docs/ai-context/INDEX.md`: PROJECT_CONTEXT for durable product facts/current top-level state; ARCHITECTURE for invariants/decisions; ROADMAP for future scope; IMPLEMENTATION_STATUS for verified state; SESSION_LOG for concise handoffs; CHANGELOG_AI for implementation evidence.
- Every implementation session must update status and handoff evidence in the same change set. If a phase or acceptance criterion changes, update roadmap. If an invariant/decision changes, record it explicitly.
- Do not rely on chat history or model memory as the project source of truth. The repository documents and current source are authoritative.
- If GitHub connector or local tooling cannot create/update a required document, record the limitation; do not claim the document was created.


## Update Center and operational continuity (mandatory)

- A deferred update remains pending in the Settings Update Center; the Settings dock icon displays a numeric badge equal to the count of pending actionable notices. Do not repeatedly force the same deferred update into the foreground on app launch.
- If a business operation is active, show only a compact, expandable corner notice. Never cover the active workflow with a modal. When the operation becomes safe, show the centered confirmation. The update must not activate until the employee explicitly confirms.
- Deferring before download must not stage candidate payload. Deferring after verified staging may retain the verified candidate cache, but must never activate it. Both forms of deferral survive app restart.
- The update safety registry is not a substitute for module ownership: every module with non-DOM transactional, dirty, camera, import/export, save or sync state must register and notify its blocker transitions.
- Forced updates require an explicit, validated release policy and still wait for a safe business handoff. Do not infer forced status from version number, urgency wording or release notes. Until an authoritative force-policy source exists, treat releases as optional.
- Preserve a documented one-time migration exception for legacy clients whose old UI protocol cannot provide the new two-step consent/activation flow; never extend that exception to subsequent releases.


## Canonical decision and governance registers

- Use docs/ai-context/INDEX.md as the document ownership map; do not create competing standards or duplicate detailed policies.
- ARCHITECTURE.md owns project architecture ADRs and invariants. DECISIONS.md owns product/cross-domain decisions and rejected options. Subsystem contracts own their internal decisions.
- Before a major technology/dependency evaluation, consult TECHNOLOGY_RADAR.md. Before promoting shared components or patterns, consult COMPONENT_AND_PATTERN_GOVERNANCE.md. Before removing code, dependencies or documents, follow DEPRECATION_REGISTER.md. Use TERMINOLOGY_GLOSSARY.md for canonical product and engineering terms.
- These registers guide investigation and documentation; they do not independently authorize dependency changes, protected-contract migrations, merge, deployment or production promotion.
