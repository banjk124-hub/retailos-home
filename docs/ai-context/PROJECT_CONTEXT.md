# Current repository state — 2026-11-23

**Repository:** `banjk124-hub/retailos-home`  
**Default branch:** `main`  
**Current main commit:** Verify live on GitHub before relying on a SHA.  
**Latest recorded PWA feature:** PR #137 — delta-aware PWA release staging. Verify current PR and deployment status live on GitHub.

- Delta staging reuses active-cache resources only after exact URL, byte-length and SHA-256 validation. Missing, changed or corrupt resources are downloaded and verified; removed resources are excluded.
- Update reporting distinguishes network download bytes, verified reused bytes and total candidate release bytes. Temporary storage still needs room for the complete candidate alongside the active release for rollback.
- PR #137 final-head CI #1250 passed full preflight, TypeScript, production/Pages builds and PR-base bundle comparison. Post-merge main CI run `43802257547` passed; GitHub Pages deployment run `43802257688` passed. These are automated pipeline results, not physical-device acceptance.
- Physical Android Chrome/PWA, iOS Safari/Home Screen PWA, desktop and low-end Android acceptance remains a separate validation gate. Do not claim device acceptance from CI or deployment.
- Production baseline includes PR #119; the user previously confirmed that baseline was merged and deployed. The current delta-staging feature is merged to the development repository's `main`; this does not imply transfer to the separate shared production account/repository or Cloudflare environment.
- Canonical PWA release contract: `PWA_RUNTIME_RELEASE.md`. Application Release Lifecycle and Data Lifecycle remain independent; data-only refresh/recalculation using existing logic must not trigger an app release, reload or release-cache cleanup.
- AI workflow source of truth: `AGENTS.md`, `docs/ai-context/INDEX.md`, `docs/ai-context/AI_CAPABILITY_SYSTEM.md`, the composable CORE/task skills under `.github/skills/`, and `prompts/START_HERE.md`. Load context selectively; historical snapshots below are retained for evidence, not current-state authority.


## Scanner subsystem

Scanner implementation truth is maintained in [SCANNER_ENGINE.md](./SCANNER_ENGINE.md). Historical Scanner decisions and phases are in [SCANNER_HISTORY.md](./SCANNER_HISTORY.md). Do not duplicate scanner architecture, implementation details or phase status in this project summary.

