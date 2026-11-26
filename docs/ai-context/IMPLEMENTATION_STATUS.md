# Current implementation status — 2026-11-26

**Repository:** `banjk124-hub/retailos-home`  
**UI/UX authority:** [EXPERIENCE_BUILD_STANDARD.md](./EXPERIENCE_BUILD_STANDARD.md)  
**Engineering authority:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)

## Product direction
- Owner direction: burgundy/dark-red identity, Vietnamese-first typography, authentic retail imagery, feature-specific compositions and purposeful motion.
- The Experience Layer is rebuilt greenfield. Legacy UI/CSS is not the visual or component foundation.
- Preserve authentication/session, module registry/readiness, business logic, persistence/offline behavior, Scanner Engine, Stocktake/Import contracts, overlay lifecycle and PWA release safety.

## Current implementation candidate — PR #174
- Branch: `feat/retailos-greenfield-experience`; PR #174 remains Draft and unmerged.
- **Login slice:** new responsive employee Login presentation; existing employee-code authentication and session handoff retained.
- **Authenticated App Shell slice:** new `src/experience/shell/AuthenticatedShell.tsx` and scoped stylesheet. Integrated around the existing authenticated Home without changing the auth/session owner in `App.tsx`.
- Desktop: new workspace rail, department/workspace identity, primary navigation, connection state and employee/logout controls.
- Mobile: compact topbar and mobile navigation, safe-area spacing, retained quick lookup/scanner action.
- Shell Settings and Notifications controls connect through explicit app events to the existing Home feature owners. Install, logout and offline state are connected to existing App props.
- Existing Home content, Module Library and operational workspaces still use their previous presentation. This slice is the new application frame, not a completed Home redesign.

## Validation
- CI #1669 passed on `ea83e948a8d1475579ddef5682b98194bd3c055d`.
- Change-scoped preflight: 10/47 checks selected, passed.
- Playwright: 5/5 passed in 4.8 seconds, including authenticated shell visibility, desktop rail navigation, mobile navigation, notifications action and horizontal-overflow/runtime checks.
- Pages production build and TypeScript passed.
- This is browser-emulation evidence, not physical-device or owner visual acceptance.

## Next implementation slice
Rebuild Home's information architecture and operational landing composition inside the new shell. Use real registry/readiness and available snapshot state; do not invent operational KPIs or module readiness. Keep the old Home presentation only as a temporary integration surface until the new Home is accepted.

## Scanner and release
Scanner stabilization and ecosystem cleanup remain closed. Do not reopen SC-01–SC-05 for UI redesign. See [SCANNER_ENGINE.md](./SCANNER_ENGINE.md) and [SCANNER_HISTORY.md](./SCANNER_HISTORY.md).
CI, browser emulation, physical-device QA, owner visual acceptance, merge, deployment and production transfer are separate gates. No merge or deployment without explicit approval.
