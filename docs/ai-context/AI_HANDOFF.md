# Current handoff — RetailOS

**UI/UX authority:** [EXPERIENCE_BUILD_STANDARD.md](./EXPERIENCE_BUILD_STANDARD.md)  
**Engineering authority:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)

## Verified repository context
- Repository: `banjk124-hub/retailos-home`; default branch: `main`.
- Active branch: `feat/retailos-greenfield-experience`.
- PR #174 remains Draft and unmerged. No deployment or production transfer is authorized.
- Experience Layer is greenfield; Business Core contracts remain protected.
- Scanner stabilization is closed; do not reopen its internals for UI work.

## Completed Experience slices
1. Login presentation with existing authentication/session handoff.
2. Authenticated desktop/mobile App Shell.
3. Operational Home using real module registry/readiness and snapshot notices.
4. Module Library and Library Detail with actual Stocktake/Import workflow handoffs.
5. Activity Center with snapshot-backed signals and honest empty state for the not-yet-connected general event log.
6. Settings Experience with existing Update Center and Scanner Settings contracts.
7. Stocktake and Stocktake Import responsive greenfield workspaces; business engines, local persistence, revision/conflict, dirty-edit, validation and export contracts preserved.

## Integration fixes and verification
- Replaced nested `main` landmark with a single authenticated workspace main landmark.
- Activity Center update signal opens Update Center directly.
- Settings close restores focus to the invoking control.
- CI #1695 passed on `b09ea271fb58fcf0ed9b7626cf4f1d491567652c`: preflight, TypeScript, Pages production build and Playwright **11/11**.
- Browser checks cover Login, desktop/mobile shell, Home, Library, Activity, Settings and the integrated navigation/focus paths.
- Physical-device QA and owner visual acceptance remain outstanding.

## Immediate next action
Complete CI and browser regression for the operational workspace migration. Then run physical-device acceptance on desktop/tablet, average and low-end Android, and iOS Safari/PWA. Verify workbook picker, table scrolling, TXT/ZIP downloads, Stocktake camera handoff, safe areas, focus and PWA update blockers.

No merge, deployment or production transfer is authorized.
