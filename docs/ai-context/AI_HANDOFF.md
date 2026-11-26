# Current handoff — RetailOS

**Governing standard:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)  
**Active UI/UX specification:** [UI_UX_M0_GOVERNING_SPEC.md](./UI_UX_M0_GOVERNING_SPEC.md)

## Current verified baseline
- Repository: banjk124-hub/retailos-home; default branch: main.
- Last verified main: `8bd3c05b78098376bfa22bd7d87132c3d8688552` (PR #165 merge); recheck live before acting.
- PR #163 direction/Product Skill/M0 consolidation is merged.
- Owner-confirmed direction: burgundy/dark-red identity, Vietnamese-first typography, authentic retail imagery; image = art direction/composition; video = motion/interaction; adapt rather than copy.
- Scanner stabilization is closed. Do not reopen engine internals for UI redesign.
- PWA, overlays, Stocktake and Import retain domain contracts; load only the relevant contract for a task.

## Governance continuation
- PR #165 BATCH 00 is merged to main.
- PR #166 BATCH 01 is merged into the BATCH 00 integration branch, not main. BATCH 02 carries the integrated standards forward and must be reviewed as one coherent change against main.
- BATCH 02 branch: `docs/batch-02-documentation-consolidation`. It consolidates redundant UI/UX authority docs, fixes navigation/authority links, preserves unique audit evidence and corrects stale status.
- Product Studio remains v0.1.3. Do not update the plugin until repository standards are reviewed and owner-accepted.
- PR #164 remains Draft M0-A source audit/blueprints; its baseline predates the latest main and must be reconciled before merge.
- PR #157 is closed and unmerged; do not treat its legacy CSS as accepted implementation.

## Task start
1. Read Product Skill and IMPLEMENTATION_STATUS; for UI/UX also read the M0 Governing Spec.
2. Verify current main SHA, branch, PRs, exact-head CI and deployment.
3. Inspect source callsites/tests and recover decisions from DECISIONS, ARCHITECTURE and domain contracts.
4. Check DEPRECATION_REGISTER before removal and TECHNOLOGY_RADAR before adoption/replacement.
5. Use COMPONENT_AND_PATTERN_GOVERNANCE before promoting shared components.
6. Work in bounded batches; inspect rendered UI before requesting device acceptance.
7. Update canonical status and report exact evidence.

No merge without explicit owner approval. No deployment without explicit authorization.
