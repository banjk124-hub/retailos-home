# Session log — project-wide recent work

This file records concise cross-project session milestones only. Scanner-specific implementation details, phase history, incidents and validation evidence live in [SCANNER_HISTORY.md](./SCANNER_HISTORY.md). Current Scanner contracts live in [SCANNER_ENGINE.md](./SCANNER_ENGINE.md).

## Log policy
- Keep this file short and chronological.
- Do not duplicate technical designs, scanner phase plans, implementation status or ADRs.
- Use the relevant canonical topic/history document for detailed history.
- Each new entry records only actual changes, verification and unresolved items.

### 2026-11-16 — Phase 2.1 AI capability upgrade

- Confirmed PR #138 remains the active vehicle; Phase 2.1 is AI capability upgrade, distinct from Phase 2.2 Runtime Audit/PWA Update hardening.
- Defined the three connected layers: AI Working Protocol, RetailOS Project Intelligence, Execution & Validation.
- Added CORE and task skills for shared engineering reasoning, source-grounded audit and evidence-led technical research; integrated existing implementation skill.
- Added canonical capability architecture and scenario-based evaluation; updated repository entry points and status/roadmap.
- Scope remains documentation and agent-skill files only. Application source, runtime, dependencies, tests, data contracts, Service Worker and deployment workflows are excluded.
- Evaluation scenarios are defined but not yet proven by subsequent real tasks. Final diff/path review and final-head CI remain required.

---



---

### 2026-11-16 — Phase 1 AI workflow and documentation governance

- Verified current `main` is `8a27eb400115cfabee92d1d2f874213b6a1cb7c8`; PR #137 merged at that commit.
- Verified PR-head CI #1250 passed; post-merge main CI run `43802257547` and GitHub Pages deployment run `43802257688` completed successfully.
- Found current-state docs still describing PR #137 as Draft/unmerged and conflicting instructions requiring every AI-context file to be read at session start.
- Phase 1 scope: reconcile current-state documentation and establish INDEX-driven selective context loading, GitHub-state verification, token discipline, current technical research and evidence-based reporting.
- Work branch: `docs/phase1-ai-context-governance`, based on current main. No application source, tests, dependencies, build configuration or deployment workflow changes are in scope.
- Reviewed Draft PR #138 and the GitHub changed-file list: all 12 changed paths are documentation/instruction files; no application source, tests, dependencies, build configuration or deployment workflow changed. No application build, local test or physical-device QA is claimed for this documentation-only work.

---



---

### 2026-11-10 — SCAN-02 post-merge technical audit

- Audited PR #59 and the merged main source at `891a3a6c8c85442d0b4a253c1fca43b36b590f1c`.
- Reviewed object-fit sizing, object-position crop, visible image intersection, mirror inversion, normalized source output, invalid-input behavior and platform/session boundaries.
- No runtime geometry defect found; no Home/Stocktake consumer or ROI decode is active in SCAN-02.
- Verified main CI run #299 passed full preflight, TypeScript, production build and GitHub Pages build. User confirms deployment and existing-flow smoke test without regression.
- Found a test-quality defect: the static DOM-boundary regex was over-escaped and did not detect ordinary `document.` / `window.` access. Follow-up strengthens the regex and self-tests the guard.
- Physical Home/Stocktake reticle alignment remains a SCAN-03 iOS Safari/PWA and Android Chrome/PWA acceptance gate.
- No camera, lifecycle, decoder, validation, cadence, UI, CSS or business-flow runtime code changed.

---



---

### 2026-11-07 — Patch 2 final PR-head CI
- Latest branch head `a31d40315eaeb9f90ce209da4fef6341e8836025` passed GitHub Actions run #85 (`42393150965`).
- Full preflight passed on the documentation-synchronized PR head. Local Windows/PowerShell and iOS Safari/PWA + Android Chrome/PWA physical-device QA remain required.



---

### 2026-11-16 — Delta-aware PWA release staging

- Intent: reduce update network transfer by reusing unchanged resources from the active release, without weakening complete offline staging or rollback.
- Branch: `feat/pwa-delta-release-staging`.
- Source: the waiting Service Worker compares active-cache responses to candidate manifest entries using exact URL, byte length and SHA-256; valid matches are copied into isolated candidate caches, while changed/missing/corrupt entries are fetched and verified. Removed resources are omitted.
- UI/protocol: release discovery and progress distinguish network download bytes, reused bytes and total candidate bytes. Resource progress counts reused and downloaded resources.
- Storage: quota preflight remains based on the full candidate footprint because the active and candidate release caches coexist.
- Regression coverage authored for unchanged reuse, same-path changed content, removed resources and network-byte accounting.
- Verification: no local test/build or GitHub Actions run has yet been observed for this branch. Physical Android/iOS/Desktop acceptance is also outstanding. No merge or deployment.

---

### 2026-11-28 — JRN-03D Journey ownership/lifecycle closeout

- Closed the JRN-03D core ownership/lifecycle scope on main after PRs #217–#224: Import Page extraction, Home ownership audit, contract hardening, integrated browser journey QA, scanner exit/camera handoff, Mobile Feature shortcuts, Shell-owned Module Library and UX-01 refinement.
- Current main baseline: `f8a3c511fcc9d7575b4da4b5f839d8eeee846c99`; main CI #2150 and Pages Build & Deploy #216 passed.
- Reconciled Journey architecture, roadmap, implementation status, handoff and index with the merged implementation.
- D4 Page Snapshot/Restore remains postponed; no capture/restore, keep-alive or generic Page snapshot store was implemented.
- D5 overlay visual consistency is a separate UX follow-up. Physical-device acceptance remains unverified and separate.
- Documentation-only closeout; no application source, feature behavior, tests, dependencies or deployment configuration changed.
