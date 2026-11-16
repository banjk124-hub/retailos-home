# Copilot instructions for RetailOS

Before editing, read `AGENTS.md`, `docs/ai-context/INDEX.md`, `PROJECT_CONTEXT.md` and `IMPLEMENTATION_STATUS.md`. Use INDEX to load only the canonical topic document and skill relevant to the task; inspect current source and GitHub state. Do not bulk-read historical context or trust an old assistant summary over the repository.

## Rules
- Preserve production behavior and public contracts unless the user explicitly approves a migration.
- Do not invent features, sample metrics, module readiness, API results, or success states.
- Keep changes narrow, reversible, and testable. Do not make unrelated refactors.
- Check the existing module IDs and data service before changing module metadata.
- Treat UI availability, data availability, permission, and connectivity as separate states.
- Avoid CSS override accumulation. If modifying styles, identify the source of truth and responsive cascade; document temporary overrides.
- Never silently alter `vite.config.ts`, GitHub Pages base paths, service worker, auth, IndexedDB, Apps Script contracts, or deployment workflow.
- Run applicable checks and state exact results. If a check was not run, say so.
- Never deploy or push without explicit approval.


## Context and evidence
- Verify branch, commit, PR, CI and deployment state from GitHub before reporting current status.
- Prefer targeted file/line reads and focused diffs. Historical logs are for specific investigations, not mandatory session-start reading.
- Separate confirmed source facts, CI results, local execution and physical-device acceptance. Never claim a check that was not run on the stated commit.
- For architecture/performance/new-technology work, research current credible options and official documentation, compare trade-offs with RetailOS constraints, and keep proposals separate from accepted decisions. No new dependency or service without explicit approval.
- In ChatGPT Web, use the connected GitHub repository and an isolated branch for reviewable edits; do not claim local or device validation unless actually performed.
