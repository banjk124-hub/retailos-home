# Current handoff — RetailOS

**Governing standard:** RETAILOS_PRODUCT_SKILL.md  
**Active M0 specification:** UI_UX_M0_GOVERNING_SPEC.md

## Current verified baseline
- Repository: banjk124-hub/retailos-home; default branch: main.
- Last verified main: 4e654ffb519d8b124f3edbbbda4f65fe550052ef. Verify live before acting.
- PR #160 Phase 00 audit, #161 Design Foundation and #162 responsive Login/browser baseline are merged; they did not deliver product-wide redesign or the target App Shell.
- PR #163 documentation/Product Skill/M0 consolidation is merged to main.
- Owner-confirmed direction: burgundy/dark-red identity, Vietnamese-first typography, authentic retail imagery; image = art direction/composition; video = motion/interaction; adapt rather than copy.
- Scanner stabilization is closed. Do not reopen engine internals for UI redesign.
- PWA, overlays, Stocktake and Import retain domain contracts; load only what the task needs.

## Governance continuation
- PR #165 records BATCH 00 inventory and contradiction findings; open Draft, review/merge pending.
- BATCH 01 is implemented on dependent PR #166, based on the BATCH 00 audit branch; review and exact-head CI pending. It defines component/pattern governance, technology evaluation, glossary, deprecation/removal, decision lifecycle and canonical navigation.
- Product Studio remains v0.1.3. Do not update plugin until repository standards are reviewed and accepted.
- PR #164 is the M0-A source baseline/blueprint branch. PR #164 body and branch-local handoff now explicitly remove Figma as a dependency/blocker; source-code prototypes and running-browser inspection remain the required validation path. Source-code prototypes and running browser inspection are the required validation path.
- PR #157 is closed and unmerged; do not treat its legacy CSS as accepted implementation.

## Task start
1. Read Product Skill and IMPLEMENTATION_STATUS; for UI/UX also read M0 governing spec.
2. Verify branch, main SHA, open PRs, exact-head CI and deployment.
3. Inspect source callsites/tests and recover decisions from DECISIONS, ARCHITECTURE and domain contracts.
4. Check DEPRECATION_REGISTER before removal and TECHNOLOGY_RADAR before adoption/replacement.
5. Use COMPONENT_AND_PATTERN_GOVERNANCE before promoting shared components.
6. Work in bounded batches; inspect rendered UI before requesting device acceptance.
7. Update canonical status and report exact evidence.

No merge without explicit owner approval. No deployment without explicit authorization.

## BATCH 01 continuation gates
- Verify the full Product Skill and Technology Radar are intact before relying on them; both include the Playwright-assisted workflow and the complete pre-existing governance content.
- Review PR #165 first because PR #166 is based on its branch. Do not merge either without explicit owner approval.
- Confirm exact-head CI after the latest commits; no workflow run is currently reported for the latest BATCH 01 head.
- Obtain owner review of PD-007 (canonical document ownership model) and the complete BATCH 01 standards before starting BATCH 02.
