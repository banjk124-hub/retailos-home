# Current handoff — PWA Update Center and explicit safe handoff

**Repository:** `banjk124-hub/retailos-home`  
**Branch:** `feat/pwa-update-center-safe-handoff`  
**Base:** `main` after PR #122 merge `70677e5dd0db8d417b1b9441ce3763aaaca26c60`.  
**Status:** Source and governance edits are in progress. No CI/build/test, merge or deployment is claimed.

## Mandatory reading
1. `AGENTS.md`.
2. `docs/ai-context/INDEX.md`.
3. `docs/ai-context/PWA_RUNTIME_RELEASE.md`.
4. `docs/ai-context/ARCHITECTURE.md` ADR-042.
5. `docs/ai-context/IMPLEMENTATION_STATUS.md` and `ROADMAP.md`.

## Current behavior target
- `Để sau` persists per device and BUILD_ID; same optional update remains in Settings.
- Download approval stages and verifies only. A separate explicit activation confirmation is required at a safe handoff.
- While business work is active, use compact expandable corner notification; when idle, use centered confirmation.
- Settings icon badge counts pending actionable notices.
- Forced updates are not supported until an authoritative policy publisher exists; optional remains fail-safe default.

## Next validation steps
1. Inspect the full branch diff and check no auto-activation path remains in the UI.
2. Add/update regression tests for persistence, stage/resume, deferral and explicit activation.
3. Run preflight, TypeScript, production build, Pages build and all PWA regression scripts on final head.
4. Complete physical Android/iOS/Desktop and low-end Android acceptance.
5. Keep Draft; do not merge or deploy without explicit approval.
