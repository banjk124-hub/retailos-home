# Current handoff — RetailOS

**Repository:** `banjk124-hub/retailos-home`  
**Latest verified runtime merge:** PR #228, merge commit `6f3ee077e4a4b45af47b4490aa32a93ef639c59f`  
**Latest merged work:** PR #228 — Desktop Feature Page Library shortcut styling.  
**Verification:** main CI #2150 (run `46145238448`) passed; GitHub Pages Build & Deploy #216 succeeded.  
**Documentation branch:** `docs/jrn-03d-technical-closeout` (documentation-only; pending review/merge).

## Current owner direction

- No global visual language is selected; creative decisions remain scoped and require explicit approval.
- Share domain rules/data contracts where operations are equivalent; allow platform-specific presentation.
- Preserve feature-owned persistence and lifecycle. Do not create global state or Page caching without a demonstrated contract.

## Journey implementation — JRN-01 to JRN-03D core scope complete

PR #211 typed Journey contract; #212 persistent Shell navigation; #215 JourneyController/ActivePageHost; #216 Stocktake Page; #217 Stocktake Import Page; #218–220 ownership audit/contracts/integrated browser QA; #221 scanner exit/camera handoff; #222 Mobile Feature shortcuts; #223 Shell Module Library; #224 UX-01 refinement.

Current ownership:
- App: authentication, employee session and authenticated handoff.
- Authenticated Shell: persistent application chrome, active Shell navigation, Feature shortcuts and Module Library.
- JourneyController: typed Page stack, push/pop/replace and active Exit Guard coordination.
- ActivePageHost: lazy Page resolution; only active Page mounts.
- Home: Home workspace and typed feature launcher; return context is ephemeral section/search/scroll only.
- Stocktake and Import Pages: mount existing feature coordinators; feature state, persistence, resource lifecycle, PWA blockers and Exit Guards remain feature-owned.
- Module registry/readiness remains the single source of truth. Desktop Library opens as a compact flyout attached to the left Dock: groups first, then each group's function tree. Mobile keeps its separate full-height library workspace.

## Next priority — JRN-05 Application Journey & Page Transition

Owner direction: map the complete application journey before detailed motion tuning. Cover Login → authenticated Home; Home ↔ Stocktake; Home ↔ Stocktake Import; Feature Page ↔ Feature Page; and Logout → Login. For every edge define both outgoing Exit and incoming Enter, trigger, guard, handoff, readiness, failure and recovery.

Keep ownership split: App owns Login/session/identity/logout; JourneyController owns only authenticated Page destinations and guards; ActivePageHost mounts only the active Page; Shell persists across Page changes. Login/Logout are not JourneyController destinations.

Use Home → Logout → Login as a quality reference for analysis, not a universal preset. Different transition families must have appropriate choreography. Do not choose global duration/easing or implement per-component motion until the journey map and in/out contract are approved.

Sequence: JRN-05A source audit/map → JRN-05B in/out contract → JRN-05C logout reference analysis → JRN-05D transition families and acceptance criteria → JRN-05E bounded implementation/QA. Canonical details: `EXPERIENCE_SYSTEM_SPEC.md` §13 and `ROADMAP.md`.

## Explicit deferrals

- **D4 Page Snapshot/Restore postponed.** No capture/restore, keep-alive, snapshot store or generic Page-state persistence exists. Revisit only after source-of-truth, freshness/version, invalidation and reconciliation semantics can be tested against upstream data changes.
- **D5 overlay visual consistency** is a separate UX follow-up, not part of this closeout.
- Physical iOS/iPadOS and Android PWA acceptance remains unverified; browser tests do not replace device testing.

## Other open gates

- PW-01 physical-device acceptance remains deferred.
- CSS-01 retained cleanup debt is documented in `CSS_01_CSS_OWNERSHIP_MIGRATION.md` and `AUDIT_03E_CSS_OWNERSHIP_CLOSURE.md`.
- JRN-04 Global Quick Actions, JRN-06 shared System Data and JRN-07 broader Experience System remain separate proposed work.

## Documentation authority

- `IMPLEMENTATION_STATUS.md`: verified implementation state.
- `ROADMAP.md`: future work and deferrals.
- `EXPERIENCE_SYSTEM_SPEC.md`: Journey/Shell/Page contract.
- `JRN_03D_A_HOME_OWNERSHIP_AUDIT.md`: closeout evidence.
- `INDEX.md`: selective documentation entry point.

Merge, deployment and production transfer remain separate approval gates.
