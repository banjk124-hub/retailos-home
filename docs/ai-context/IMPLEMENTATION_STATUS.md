# Current PWA Update Center and safe-handoff implementation status — 2026-11-15

**Branch:** `feat/pwa-update-center-safe-handoff`  
**Base:** `main` after merged PR #122 (`70677e5dd0db8d417b1b9441ce3763aaaca26c60`).  
**Status:** Implementation in progress. Source edits are committed to this branch; no CI/build/test has yet been run in this remote editing session. No merge or deployment.

## Source changes made

- Added `src/shared/pwa/updateCenterStore.ts` for device-local pending update metadata and a cross-component change event.
- Updated `PwaUpdatePrompt.tsx` to persist deferral by candidate BUILD_ID, keep deferred candidates discoverable through Settings, record staged state without automatically activating, and require an explicit activation action.
- Updated prompt presentation to use a centered dialog when idle and a compact expandable corner notice while a business blocker is active.
- Added a Settings Update Center entry and numeric pending-notice badge on the Settings dock item.
- Added CSS for centered/compact prompt states and the Settings badge.

## Verified from source inspection

- The prior `dismissedBuildId` ref was session-only and is removed from the updated flow.
- The prior `tryActivate()` calls after `RELEASE_STAGED` and on safety-change events are removed; activation remains wired to the explicit `Xác nhận cập nhật` control.
- The Service Worker still owns candidate integrity verification, multi-window guard, activation, boot health and rollback. Worker runtime behavior has not yet been changed in this branch.

## Not yet verified / remaining work

- Run preflight, TypeScript, production build, Pages build, PWA worker/cache/platform regression tests on the final branch head.
- Review all changed code for type errors, state races, storage failure behavior and styling conflicts.
- Add regression assertions for persistent deferral, no automatic activation after stage/reopen/blocker-clear, Settings badge and Update Center actions.
- Audit all module-owned business blockers against actual workflows, including confirmation/transaction states not represented by DOM fields.
- Forced-update control plane is not implemented; optional remains the only supported policy until an authorized policy source is added.
- Physical Android/iOS/Desktop and low-end Android acceptance is pending.

No merge, production promotion or deployment is included.
