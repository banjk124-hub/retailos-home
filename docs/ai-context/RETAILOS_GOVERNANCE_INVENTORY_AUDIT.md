# RetailOS — BATCH 00 Governance Inventory & Source Lock

**Status:** Audit record / proposed governance baseline; not yet owner-approved as a new standard  
**Repository:** banjk124-hub/retailos-home  
**Audited branch:** main  
**Audited commit:** 4e654ffb519d8b124f3edbbbda4f65fe550052ef  
**Audit date:** 2026-11-26

## Correction to the initial inventory interpretation

The first audit draft described DECISIONS.md as a sparse ADR register. That statement needs a precise distinction: ARCHITECTURE.md already contains the project-wide architecture ADR history (including numerous numbered ADRs); DECISIONS.md itself contains only ADR-001 and should not duplicate the architecture register.

BATCH 01 therefore defines separate ownership:
- ARCHITECTURE.md remains the authoritative project architecture ADR register.
- DECISIONS.md becomes the product and cross-domain decision register, including owner-confirmed direction, rejected options and reconsideration triggers.
- Scanner-specific decisions remain in SCANNER_ENGINE.md and SCANNER_HISTORY.md.
- Other subsystem contracts remain with their domain owners.

This is a clarification of document ownership, not a claim that architecture decisions were absent.

## BATCH 00 findings retained

- Live main baseline audited: 4e654ffb519d8b124f3edbbbda4f65fe550052ef.
- PR #163 is merged.
- PR #164 is an open Draft M0-A source audit/blueprint PR. Its description previously included Figma as a blocker; the owner-confirmed workflow requires direct source-code prototypes.
- PR #157 is closed and unmerged.
- Main IMPLEMENTATION_STATUS.md and AI_HANDOFF.md contained stale SHA and PR status references at the audit baseline.
- Product Studio v0.1.3 was inspected; repository standards must be stabilized before plugin parity work.

## Six owner requirements translated into acceptance criteria

| ID | Requirement | Operational rule |
|---|---|---|
| G-01 | Avoid repeating previous mistakes | Verify current source and decisions; check rejected/superseded approaches and surface conflicts. |
| G-02 | Allow creativity and new technologies | Explore when a real need exists; prototype in source; evaluate evidence, license, compatibility, performance, cost, maintenance and fallback. |
| G-03 | Reuse equivalent solutions | Reuse by semantic responsibility and behavior, not superficial visual similarity. |
| G-04 | Preserve future extensibility | Protect stable contracts, not today's implementation choices; support staged replacement with tests and rollback. |
| G-05 | Lock terminology and approved direction | Maintain canonical glossary and decision records; image = art direction/composition; video = motion/interaction; RetailOS owns brand and business meaning. |
| G-06 | Remove incorrect/unnecessary elements | Use consumer, behavior, replacement, risk, test and rollback evidence; preserve unique history. |

## Classification and scope

The full repository inventory was captured in the original BATCH 00 audit commit. Canonical ownership is now formalized in INDEX.md and the linked registers. Historical UI/UX plans, audits, screen maps and phase records remain evidence, not parallel active specifications.

BATCH 00 did not change application source, dependencies, plugin release, merge or deployment. BATCH 01 adds governance documents and reconciles status/handoff; it does not authorize product UI migration or technology adoption.
