# Current handoff — RetailOS

**Governing standard:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md). Load it before any RetailOS task, including new features and work continued from another chat.

## Current verified context

- Repository: `banjk124-hub/retailos-home`; default branch: `main`.
- Latest verified main after UI foundation PR #162 merge: `3cd2d5bf7a3d1339a6c55baa1c16c74f6ebece2c` (verify live before acting).
- PR #160 Phase 00 audit, #161 Design Foundation and #162 responsive Login/browser baseline are merged.
- **Important product truth:** these phases did not deliver the new product-wide UI. The current app still uses the existing App/Auth/Home composition; new App Shell/workspace composition remains a target, not a shipped implementation. Token migration and Login responsive checks are not equivalent to the requested redesign.
- No new product-wide UI deployment or production promotion is established by those merges. Verify current Pages/deployment state before making claims.
- The next valid UI/UX work is to follow the Product Skill's M0 direction/technology gate, create source-backed representative prototypes and obtain owner acceptance before the larger foundation/shell migration.
- Scanner stabilization is closed and owner-confirmed operationally. Current implementation contract: [SCANNER_ENGINE.md](./SCANNER_ENGINE.md); historical evidence: [SCANNER_HISTORY.md](./SCANNER_HISTORY.md). Do not reopen Scanner Engine internals for UI work.
- PWA, overlays, Stocktake and Import retain their domain-specific contracts. Load only the one relevant to the task.

## Task start protocol

1. Read the Product Skill and [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md).
2. Verify current branch, main SHA, open PRs, CI and deployment against GitHub.
3. Inspect exact source callsites and tests; recover prior owner decisions without asking the user to repeat them.
4. Work in bounded batches, execute and verify; inspect rendered UI before asking for device acceptance.
5. Update the canonical status and report exact evidence.

No merge without explicit owner approval. No deployment without explicit authorization.
