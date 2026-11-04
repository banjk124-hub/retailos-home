# Copilot instructions for RetailOS

Before editing, read `AGENTS.md` and the context files in `docs/ai-context/`. Inspect current source; do not trust a patch or previous assistant summary over the working tree.

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
