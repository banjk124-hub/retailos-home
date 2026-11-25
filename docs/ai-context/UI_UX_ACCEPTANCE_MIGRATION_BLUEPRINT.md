# UI/UX Acceptance and Migration Blueprint — Batch 00H

**Status:** Proposed execution/acceptance contract. Owner approval is required before application-source migration.
**Source baseline:** `main` at `2003ea24966755d0ad4e0298b34422b053267e77`
**Documentation branch:** `docs/uiux-architecture-00b-00c`
**Depends on:** 00B Technology Audit, 00C Screen Map, 00D Design System Specification, 00E Information Architecture, 00F Component Ownership Audit, 00G Screen Blueprints.
**Scope:** Define measurable acceptance, implementation slices, test gates, rollout/rollback and decisions required to authorize the first UI implementation.

## 1. Purpose and decision status

00H turns the architecture and screen blueprints into a controlled migration plan. It does not itself implement the UI or declare the proposals accepted.

Decision vocabulary:
- **Observed:** verified in source, test or repository metadata.
- **Proposed:** recommended by this blueprint; not yet approved.
- **Accepted:** explicitly approved by the product owner.
- **Implemented:** source change exists on a branch.
- **Validated:** the specified automated/manual evidence passed; name the evidence.
- **Blocked:** a required dependency, decision or acceptance has not been satisfied.

Current status:
- 00B–00G are documented on the documentation branch.
- No UI application source has been changed by this workstream.
- No new UI dependency has been installed.
- No physical-device acceptance is claimed.
- 00E navigation, 00D visual system, typography and contrast decisions still require owner acceptance/prototype validation.
- 00F full selector-level CSS/computed-style proof and complete runtime consumer graph remain open. These are mandatory before deleting shared CSS/components, but they do not block isolated additive prototypes that preserve all old consumers.

## 2. Scope boundaries

### 2.1 In scope

- App Shell and workspace navigation presentation.
- Login presentation while retaining local authentication/session semantics.
- Home Overview and Module Library presentation.
- Settings and Update Center presentation adapter.
- Stocktake and Stocktake Import presentation, one feature at a time.
- Scanner entry/presentation only when separately included in an approved slice.
- Shared design-system primitives and patterns justified by actual consumers.
- Responsive, accessibility, interaction, performance, documentation and regression work required by these surfaces.

### 2.2 Explicitly out of scope unless a separate plan is approved

- Authentication algorithm, employee directory, session schema or identity provider.
- Snapshot/API payloads, cache invalidation, business rules or data-source semantics.
- Stable RetailModule IDs, ModuleDataId and workflow readiness truth.
- Scanner Engine, camera lease/acquisition, getUserMedia/applyConstraints, decoder, recognition pipeline, lifecycle, recovery, ROI and camera settings persistence.
- Stocktake/Import IndexedDB schema, parser, decimal precision, duplicate/source precedence, validation, history semantics and TXT/ZIP output.
- PWA Service Worker install/stage/activate/cache/rollback protocol and release manifest.
- Backend, database, security, hosting, account promotion, recurring paid service or GitHub Pages deployment contract.
- Activity event ingestion or future module business workflows without a data/workflow specification.

A visual change can still alter the way an operator experiences a protected behavior. The owning feature must demonstrate that the behavior remains intact.

## 2.3 M0 global visual decision gate\n\nM0 is product-wide, not Home-only. The governing separation of references and motion correctness is defined in [UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md](./UI_UX_M0_REFERENCE_ROLES_MOTION_CONTRACT.md). The image defines structural composition; the video defines motion/feedback/state behavior; RetailOS remains authoritative for brand, business semantics and data truth. Before M1, validate the shared language across Login, Home Overview, Module Library, Stocktake, Stocktake Import, Scanner presentation (presentation-only), Settings/Update Center, Search/Notifications and responsive shell. M0 does not authorize source migration, Scanner Engine changes or business/platform contract changes. A Home-only mockup does not satisfy M0. Motion acceptance must prove that animation is presentation-only, cannot commit/advance business state, does not trigger duplicate requests/writes/subscriptions, rejects stale async results, converges correctly when interrupted, and retains full function under reduced-motion/low-performance modes.\n\nThe first cross-surface concept review is recorded in [UI_UX_M0_CROSS_SURFACE_PROTOTYPE_REVIEW.md](./UI_UX_M0_CROSS_SURFACE_PROTOTYPE_REVIEW.md). The concept board is not sufficient for M0 exit; separate readable frames, source-verified workflow semantics, responsive variants, accessibility and low-end performance evidence remain mandatory.\n\n## 3. Acceptance model

A slice is accepted only when all applicable gates below pass. A not-applicable gate must include a short reason; it must not be silently omitted.

| Gate | Evidence required | Pass condition |
|---|---|---|
| G0 Scope and ownership | Slice brief, affected files/callsites, old-to-new responsibility map | No hidden domain/platform ownership moved into presentation |
| G1 Functional behavior | Feature workflow tests and manual task walkthrough | Every visible action works; state and completion truth preserved |
| G2 Regression | Relevant preflight/test scripts and build outputs | All required automated checks pass on exact PR head |
| G3 Responsive | Screenshots/recordings at required viewport matrix | No clipping, unreachable actions, unintended overflow or broken scroll |
| G4 Accessibility | Keyboard/focus, labels/semantics, reduced motion, zoom and contrast evidence | No critical blocker; known limitations documented and assigned |
| G5 Performance | Before/after bundle, interaction and device evidence | No unexplained critical-path regression; low-end behavior remains usable |
| G6 Offline/PWA | Offline/reload/update behavior where touched | Local workflow and release safety remain correct |
| G7 Documentation | Canonical docs and PR summary | Ownership, decisions, tests, limitations and rollback are current |
| G8 Owner approval | Explicit review of slice output | Slice may merge only after approval |

### 3.1 Required definition of done per screen

- Purpose, entry/exit and primary task match the approved 00G blueprint.
- All controls have a real action and immediate acknowledgement.
- Loading, empty, stale, missing, offline, error, pending, success, validation and dirty states are truthful where relevant.
- No fabricated KPI, Activity, Calendar, availability or success state.
- Desktop, tablet and mobile use intentional layouts; no desktop squeeze-only adaptation.
- Keyboard, focus, accessible names, screen-reader status and reduced-motion behavior are covered.
- Safe areas, dynamic viewport, keyboard-open and short landscape are considered.
- Lazy-loading and existing feature chunk boundaries remain unless a measured change is approved.
- Protected data/platform contracts are unchanged or migrated under a separate approved plan.
- Relevant tests/builds pass on the exact commit; manual evidence is linked.
- Rollback is known and executable.

## 4. Migration strategy

### 4.1 Principles

1. One independently reviewable slice at a time.
2. One canonical owner for every behavior, destination identity and design token.
3. Prefer replacing a bounded surface over building a parallel app-wide framework.
4. Add shared components only after their actual consumers and semantic contract are proven.
5. Do not delete old components/styles until all callsites are migrated and the replacement has passed regression.
6. Do not mix presentation migration with domain logic, data schema, scanner runtime or PWA release changes.
7. Preserve a working path through every migration; avoid flagging a partially migrated route as complete.
8. No merge, deployment or production promotion without explicit owner approval.

### 4.2 Recommended sequence and exit gates

| Slice | Priority | Scope | Prerequisites | Exit gate |
|---|---|---|---|---|
| M0 — Visual decision prototype | P0 | One high-fidelity Shell + Home composition; compare desktop and mobile; validate typography, imagery, surface/material and navigation density | Owner confirms visual direction and device targets | One approved visual direction; no production source migration required |
| M1 — Design foundation | P0 | Semantic tokens, typography decision, primitive controls, status semantics, surface roles, motion/reduced-motion policy | M0; 00D decisions accepted; font/contrast checks | Token/primitive tests and sample screen visual review; no second parallel token system |
| M2 — App Shell skeleton | P0 | AppShell, destination adapter, Desktop/Mobile Navigation, GlobalHeader, WorkspaceOutlet, loading/error boundary | 00E route/back contract accepted; M1 minimum tokens; route/lazy-load map | Auth/session, deep link/reload/back, focus, dirty guard, offline and bundle tests |
| M3 — Login presentation | P0 | Login composition and identity handoff presentation | M1; shell/auth integration contract | Local auth, session restore/logout, numeric input, offline and reduced-motion checks |
| M4 — Home Overview | P0 | Extract overview from Home orchestration; notices, quick actions, data freshness | M2; snapshot/notice ownership traced | Home performance/cache, empty-vs-error/stale, lookup and notice regressions |
| M5 — Module Library | P0 | Search/category/readiness presentation and destination handoff | M2; canonical module registry contract | All nine registry IDs truthful; no duplicate registry; integrating items cannot launch fake workflows |
| M6 — Settings / Update Center | P1 | Settings workspace and update presentation adapter | M2; PWA controller API and overlay contract traced | Update consent, defer, staging, blocker, activation and rollback tests; no SW protocol changes |
| M7 — Stocktake presentation | P0 | Session/zone/capture/review/history/export screens | M2; feature state/persistence ownership mapped | Stocktake workflow regression, offline/reload/history/export and scanner handoff |
| M8 — Stocktake Import presentation | P0 | Import/conflict/zone editor/preview/history/export screens | M2; parser and output contracts mapped | Full import test, conflict/dirty/precision/history/TXT/ZIP and failure-path acceptance |
| M9 — Scanner presentation (optional isolated slice) | P0 boundary, only if approved | Home lookup/scanner shell and/or Stocktake scanner shell visual treatment | 00G Scanner blueprint; feature owner and protected contract tests selected | Scanner UI/lifecycle and physical-device checks; engine code unchanged |
| M10 — Notifications / Global Search | P1 | Real notice/search surfaces only | M2; actual search scope and notice source identified | No fake universal index/unread count; keyboard, permission and offline states |
| M11 — Consolidation | P1 | CSS/component/motion/icon cleanup after migration | All relevant consumers migrated; 00F selector/callsite audit complete | No dead-code deletion without evidence; one owner per style/system; full regression |
| M12 — Release readiness | P0 release gate | Final cross-device, accessibility, performance, PWA and documentation review | Required slices complete | Explicit acceptance record; no merge/deploy without approval |

**Dependency note:** M7 and M8 may be developed independently after M2. Do not combine them into a universal data-workspace implementation; their workflow semantics differ. M9 is not a prerequisite for Shell release and must not reopen Scanner Engine work.

### 4.3 What can be parallelized

- M0 visual prototype and source-only selector/callsite inventory may proceed in parallel.
- M3 Login can proceed after the minimum design foundation and auth boundary are accepted; it need not wait for Stocktake.
- M7 Stocktake and M8 Import can proceed as separate feature branches after shell integration contracts are stable.
- M6 Update Center can be designed in parallel, but implementation must wait for a verified PWA presentation adapter contract.
- M11 cleanup must wait for consumers; it must not run as speculative cleanup before feature migrations.

## 5. Test and validation matrix

### 5.1 Repository-verified automated test wiring

The current `scripts/preflight.mjs` was inspected on the documentation branch. It runs a broad sequence including:
- Scanner SC-05 integration, benchmark harness and scanner runtime contract tests.
- Home performance and cache batching.
- Overlay layout and shared body-scroll-lock.
- UI interaction immediacy.
- Stocktake Import regression.
- Scanner presentation, validation, lifecycle, geometry, camera health, settings, decoder and related contracts.
- TypeScript + production build (`npm run build`).
- GitHub Pages build (`npm run build:pages`).
- Bundle boundary test.
- PWA worker runtime, cache policy and platform compatibility.
- Bundle report and Git diff whitespace checks.

The package scripts inspected include `preflight`, `build`, `build:pages`, `preview`, `preview:pages`, `analyze:bundle`, `test:scanner` and `test:scanner:lifecycle`.

Run `npm run preflight` on the final implementation PR head. This is intentionally broad and includes Scanner regression checks even for UI work; it does not authorize changing Scanner internals. Do not claim it passed unless an actual run result is attached.

### 5.2 Slice-specific test selection

| Changed boundary | Required automated checks |
|---|---|
| Shell/navigation/Home | `npm run preflight`; explicitly verify Home performance, cache batching, interaction immediacy, bundle boundaries and browser history/navigation tests added by the slice |
| Login | preflight + auth/session/boot tests; add focused keyboard/IME and identity-state tests if absent |
| Module Library | preflight + registry identity/readiness/search/navigation tests; add focused tests if absent |
| Overlay primitive or behavior | preflight + `test-body-scroll-lock.mjs` + `test-overlay-layout-contract.mjs` + focus/stack tests when implemented |
| Stocktake | preflight + feature workflow/state/persistence/export tests; select exact current scripts after source tracing |
| Stocktake Import | preflight + `test-stocktake-import.mjs` and UI tests for conflict, dirty edit, invalid export, clipboard fallback, ZIP, restore and persistence failure |
| Scanner presentation | preflight + `test-scanner-presentation.mjs`, `test-scanner-lifecycle.mjs`, validation/geometry tests relevant to touched presentation integration; no engine refactor |
| Settings / Update Center | preflight + PWA worker/cache/platform compatibility tests and explicit release protocol contract checks |
| CSS/token/icon/motion consolidation | preflight + consumer/cascade assertions and visual regression; bundle report if imports/assets/chunks change |

The current preflight script itself was verified to invoke these checks. Individual focused test files must be checked on the implementation branch before adding new references.

### 5.3 Required browser and device matrix

| Target | Required modes | Acceptance focus |
|---|---|---|
| Desktop Chrome | Wide office viewport, narrow window, zoom 200%, keyboard only | Sidebar/rail, dense workspace, focus, data table, back/forward |
| Desktop Edge | Same representative shell and data-workspace flows | Browser compatibility and keyboard |
| Tablet | Portrait + landscape, touch and keyboard where available | Adaptive navigation, master/detail, touch target |
| Android Chrome | Browser tab + installed PWA | Keyboard, safe area, camera handoff, scrolling, offline |
| iOS Safari | Browser tab, portrait/landscape, keyboard/browser chrome | Dynamic viewport, focus/IME, safe areas, scroll restoration |
| iOS Home Screen PWA | Standalone, portrait/landscape, offline/update | Standalone safe area, PWA update and navigation |
| Low-end Android reference | Cold and warm launch, repeated navigation, long lists/tables, blur/images/motion on/off | Input acknowledgement, long tasks, scroll stability, memory/thermal behavior |

Record exact device model, OS/browser version, viewport, PWA/tab mode, build ID and test date. “Mobile tested” without this information is not acceptance evidence.

### 5.4 Visual and functional test scenarios

- Login: empty/invalid/recognized employee, submit pending/error/success, keyboard open, reload/session restore/logout.
- Shell: every top-level destination, direct route, reload, browser back/forward, unknown route, offline, lazy chunk loading/error, focus return.
- Home: loading/fresh/stale/missing/error/offline/no notices; quick action and cached lookup.
- Module Library: all registry entries, category/search/no-result, integrating/unavailable state, ready workflow launch.
- Stocktake: create/resume/replace zone, scan/manual input, save/edit/delete, review/export, revision history, exported lock, offline/reload.
- Import: one/multiple workbook, parse error, duplicate and conflict review, commit/skip, dirty edit/save/cancel, invalid block, TXT preview/copy/download, ZIP, history restore, persistence failure.
- Overlay: nested surface, Escape, backdrop, focus return, body lock reference count, long content, short landscape, rapid open/close.
- Settings/Update: discover, defer, download, stage, blocked, explicit activation, multi-window safety, boot health and rollback.
- Scanner presentation: launch gesture, permission, preview, scan, close, reopen, background/foreground and feature handoff; engine unchanged.
- Offline: app shell, cached data freshness, local Stocktake/Import, failure and recovery.

### 5.5 Accessibility gate

- Keyboard-only completion of all primary workflows.
- Visible focus, logical tab order and no focus loss after navigation/overlay close.
- Semantic headings, landmarks, form labels, table headers and accessible names.
- Screen-reader announcement for validation, pending, success and failure without noisy repeated announcements.
- Dialog focus entry/return and topmost Escape policy; do not claim full modal focus containment until focus trap/stack is implemented and tested.
- Contrast checked for text, status, focus, disabled and translucent surfaces.
- 200% zoom/text scaling without clipping or inaccessible actions.
- Reduced-motion and power-conserve behavior verified.
- Touch targets and safe-area reachability checked on mobile.
- Vietnamese text, numbers, quantities and date formatting verified without mutating source values.

### 5.6 Performance and bundle gate

Capture a before/after baseline for each major slice:
- Build ID, commit, device, OS, browser and tab/PWA mode.
- Initial transferred bytes and JS/CSS chunk graph.
- Lazy workspace and export chunk boundaries.
- Cold/warm route entry and input-to-first-feedback.
- Long tasks, layout shift, scroll stability and table/list behavior.
- CPU/memory observation for blur, imagery, motion and repeated open/close.
- Offline shell and local data behavior.

Acceptance is comparative to the measured baseline, not an invented universal number. Any increase in critical-path bytes, blocking work or memory must be explained and justified by user value. No large new framework or image/font payload may enter the critical path without explicit comparison.

## 6. Protected contract regression matrix

| Contract | Must remain invariant | Evidence |
|---|---|---|
| Auth/session | Local employee lookup, identity/department mapping, session persistence/restore/logout | Auth tests + workflow walkthrough |
| Module identity | Stable RetailModule IDs and distinction from ModuleDataId; registry remains canonical | Registry contract tests |
| Snapshot/cache | Fresh/stale/missing/error truth, batching and offline behavior | Home cache/performance tests |
| Scanner Engine | Shared engine/session, camera lease, lifecycle, decoder, ROI and recovery unchanged | Preflight scanner tests + source diff boundary + device workflow |
| Stocktake | IndexedDB, revisions, validation, explicit save/export and history | Feature regression tests |
| Stocktake Import | Local parsing, decimal precision, duplicate/conflict behavior, history, TXT/ZIP exact output | `test-stocktake-import.mjs` + payload fixtures |
| Overlay | Shared reference-counted body lock; no local overflow snapshot/restore | Body-lock and overlay layout tests |
| PWA release | Consent, candidate staging/integrity, blocker, explicit activation, boot health and rollback | PWA worker/cache/platform tests |
| Build/deploy | Vite base `/retailos-home/`, release manifest and deployment workflow | Pages build, manifest tests and deployment guard |
| Lazy loading | Existing feature boundaries remain or have measured approved replacement | Bundle boundary test and report |

Any diff touching a protected implementation area is a scope breach unless the PR explicitly carries the separate approved migration and tests. Scanner platform paths are not valid cleanup targets for a presentation-only PR.

## 7. CSS, component and architecture cleanup gate

The source audit found 25 CSS files, several Home stylesheet generations and a large mobile tuning stylesheet. File size, age or name alone does not prove dead code.

Before deleting or consolidating a CSS/component system:
1. Enumerate imports and runtime consumers from the implementation branch.
2. Trace dynamic class construction, CSS Modules, portal/overlay roots and generated classes.
3. Identify selector collisions, specificity, cascade order, media-query overlap and custom-property ownership.
4. Capture computed-style winners for representative screen states.
5. Compare screenshots and interaction states before/after.
6. Remove only selectors/components with evidence of zero consumers or a verified replacement.
7. Run the relevant automated suite and visual/device checks.
8. Update ownership docs and remove obsolete references in the same migration slice.

The 00F consumer graph and selector audit are an explicit prerequisite for broad CSS deletion, Glass/Motion/Icon retirement or Home stylesheet consolidation. Small isolated new styles are allowed only when they have a clear canonical owner and do not become a permanent override layer.

## 8. Rollout, branch and merge policy

- Start each source implementation slice from the then-current `main`, not the documentation branch.
- Keep documentation PR #156 separate from application implementation PRs unless the owner explicitly chooses another arrangement.
- Use a dedicated branch/PR per bounded slice or tightly coupled pair.
- Rebase/merge current main before final acceptance and rerun tests on the final head.
- Keep PRs small enough to review the full protected-boundary diff.
- PR description must state scope, non-goals, changed files, test results, device evidence, bundle impact, known limitations and rollback.
- Draft while architecture/API is unsettled; mark ready only when acceptance evidence is attached.
- Merge only after explicit owner approval and required checks.
- Deploy only after merge and explicit deployment authorization. Development Pages is not production-account promotion.
- Promote to department/shared account only after separate operational acceptance and release readiness.

## 9. Rollback plan

### 9.1 Per-slice rollback

1. Identify last accepted `main` commit and the slice merge commit.
2. Revert only the slice; do not reset shared history or discard unrelated work.
3. If the slice changed route identity, keep a compatibility redirect/alias for the previous route until migration is verified.
4. Confirm persisted records, IndexedDB schemas, module IDs, PWA caches and release metadata were not changed.
5. Run `npm run preflight`, production build and Pages build on the revert head.
6. Verify old navigation and feature entry points are restored.
7. Record the rollback reason and update the canonical roadmap/status.

### 9.2 Data/platform incident

If a UI migration reveals a data/persistence/PWA/scanner incident:
- Stop rollout and do not attempt a UI-only hotfix that mutates protected data contracts.
- Preserve local data and last-known-good PWA release.
- Revert the presentation slice if it is the trigger.
- Diagnose the owning domain under its canonical contract and a separate incident/migration plan.
- Do not clear browser storage, IndexedDB or caches as a generic recovery action.

### 9.3 Release rollback

PWA rollback remains governed by `PWA_RUNTIME_RELEASE.md`. The UI migration must not introduce a parallel release mechanism or bypass the explicit consent, activation blockers, boot-health or last-known-good rollback flow.

## 10. Required PR evidence template

Every implementation PR must include:

- **Goal / user task:**
- **Scope and non-goals:**
- **Blueprint sections implemented:**
- **Changed source files and ownership:**
- **Protected contracts checked:**
- **Automated tests:** command, exact head SHA, pass/fail and logs:
- **Builds:** production + Pages result:
- **Visual evidence:** desktop/tablet/mobile screenshots:
- **Device evidence:** model, OS/browser, PWA/tab, scenarios:
- **Accessibility:** keyboard, focus, screen reader, contrast, reduced motion, zoom:
- **Performance:** before/after bundle, input feedback, long tasks, scroll, memory:
- **Known limitations / deferred work:**
- **Rollback commit/procedure:**
- **Owner acceptance:**

No blank test field may be interpreted as passed.

## 11. Owner decision register

The following are product/architecture choices and remain proposals until approved:

| ID | Decision | Recommended default | Approval gate |
|---|---|---|---|
| D1 | 00E route/history contract | Typed adapter over History API initially; add router only if proven requirements demand it | Before M2 |
| D2 | Desktop navigation | Persistent collapsible sidebar/rail; validate one high-fidelity prototype | Before M0/M2 |
| D3 | Mobile primary navigation | Bottom navigation using same destination IDs | Before M0/M2 |
| D4 | Typography | No font selected until Vietnamese glyph/weight/load/offline/device comparison | Before M1 |
| D5 | Color/status contrast | Semantic tokens; red is brand/action accent, status colors retain meaning | Before M1 |
| D6 | Photography and materials | Real imagery selectively; opaque data surfaces; blur only where useful | Before M0/M1 |
| D7 | Shared overlay/focus stack | Do not build a global manager by assumption; prototype and prove nested/focus requirements first | Before shared overlay migration |
| D8 | Activity | Keep gated until real event source/schema/retention/permissions exist | Before any Activity build |
| D9 | Technology adoption | Existing React/CSS/native foundation first; new dependency only after alternatives and cost evidence | Before dependency change |
| D10 | First source implementation slice | M0 prototype, then M1 foundation and M2 Shell skeleton | Before any broad source refactor |
| D11 | Device acceptance targets | Confirm representative iOS, Android and low-end Android devices | Before device QA |
| D12 | Merge/deploy | Separate owner approval for merge and deployment | Every release |

## 12. 00H exit criteria

- [x] Scope and protected boundaries are explicit.
- [x] Acceptance gates and per-screen definition of done are defined.
- [x] Ordered migration slices, prerequisites and exit criteria are documented.
- [x] Existing preflight wiring and package scripts have been inspected.
- [x] Browser/device, accessibility, performance and workflow matrices are defined.
- [x] Protected contract regression matrix is defined.
- [x] CSS/component cleanup evidence gate is explicit.
- [x] Rollout, merge, deploy and rollback policies are defined.
- [x] Owner decision register and PR evidence template are included.
- [ ] High-fidelity prototype reviewed and accepted.
- [ ] Owner approves D1–D12 or records deviations.
- [ ] Device reference matrix is confirmed.
- [ ] First implementation slice is authorized.

**Completion statement:** 00H documentation is complete when this blueprint is linked from the canonical docs and the PR. It does not mean product decisions are accepted, source migration is authorized, tests have run, or devices have passed. The next valid action after owner approval is M0 visual prototype, not a broad UI code rewrite.
