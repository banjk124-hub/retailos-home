# Current handoff — RetailOS

**UI/UX authority:** [EXPERIENCE_BUILD_STANDARD.md](./EXPERIENCE_BUILD_STANDARD.md)  
**Engineering authority:** [RETAILOS_PRODUCT_SKILL.md](./RETAILOS_PRODUCT_SKILL.md)

## Verified repository context
- Repository: `banjk124-hub/retailos-home`; default branch: `main`.
- PR #174: `feat/retailos-greenfield-experience`, Draft, unmerged.
- Experience Layer is greenfield; legacy UI/CSS is not the design foundation.
- Business Core remains protected: Auth/session, module registry/readiness, data/persistence/offline, Scanner Engine, Stocktake/Import workflows, overlay lifecycle and PWA release safety.
- Scanner stabilization is closed; do not reopen its internals for UI work.

## Completed source slices
1. Login: responsive employee Login presentation, preserving current authentication/session handoff.
2. Authenticated App Shell: new desktop workspace rail, topbar, connection state, navigation, employee/logout controls and mobile navigation. Connected Settings and Notifications to existing Home handlers. Existing Home presentation remains temporarily embedded as the shell content.

## Verification
- CI #1669 passed on `ea83e948a8d1475579ddef5682b98194bd3c055d`.
- Change-scoped preflight 10/47 passed; Pages production build and TypeScript passed.
- Playwright 5/5 passed in 4.8s, covering Login, reduced motion and authenticated Home/shell navigation at desktop/mobile.
- Physical-device and owner visual acceptance remain outstanding.

## Immediate next action
Rebuild the Home information architecture and operational landing composition inside the new shell. Use actual module registry/readiness and available snapshot state. Do not invent KPIs, module readiness or operational events. Migrate to new Home composition without changing Business Core contracts.

No merge, deployment or production transfer is authorized.
