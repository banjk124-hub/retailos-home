# RetailOS acceptance checklist

Use this checklist for cross-feature release readiness. It is not a technical specification. Load the relevant subsystem's canonical document for detailed regression requirements.

## Before implementation

- [ ] Inspect current branch, status and diff.
- [ ] Confirm user story, success criteria and ownership boundaries.
- [ ] Identify affected stable IDs, APIs, schema and services.
- [ ] Record baseline test/build failures and rollback point.

## Module library and navigation

- [ ] One canonical module registry; no divergent duplicate lists.
- [ ] IDs match existing data services and navigation.
- [ ] Search/grouping use the same source.
- [ ] Every action routes correctly or reports an honest disabled/integration state.
- [ ] Loading, empty, stale, error and offline states are explicit where relevant.

## Responsive UX

- [ ] Narrow phone (~320–360 px), typical phone (~390–430 px), tablet and desktop.
- [ ] No horizontal overflow or inexplicable blank columns.
- [ ] Bottom navigation does not cover content.
- [ ] Safe areas, keyboard focus, touch targets and reduced motion are respected.
- [ ] Translucency does not harm contrast or performance.

## Cross-feature regression

- [ ] Login/session and permission boundaries.
- [ ] Module navigation and business workflows.
- [ ] API request/response contracts.
- [ ] IndexedDB/snapshot refresh and stale-state behavior.
- [ ] Camera permission, open/close and failure recovery for camera-backed features.
- [ ] Barcode decode result is validated before consuming workflows receive it.
- [ ] Home lookup and Stocktake form-fill/explicit-save, duplicate rows and manual entry remain correct.
- [ ] Notifications and PWA/service-worker/offline behavior.
- [ ] Vite base path / GitHub Pages behavior.

For Scanner implementation invariants, source contracts, decoder fixtures and acceptance evidence, use [SCANNER_ENGINE.md](./SCANNER_ENGINE.md). Historical Scanner validation runs are in [SCANNER_HISTORY.md](./SCANNER_HISTORY.md).

## Release

- [ ] Review diff for accidental removals, secrets and generated files.
- [ ] Confirm rollback point.
- [ ] Run required tests, preflight, TypeScript, production and Pages builds.
- [ ] Record CI, physical-device and business-workflow evidence separately.
- [ ] Obtain explicit user approval before merge/deployment where required.
- [ ] Record release commit and verified URL.
