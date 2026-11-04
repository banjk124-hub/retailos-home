# RetailOS acceptance checklist

## Before implementation
- [ ] Inspect current branch, status and diff.
- [ ] Confirm user story and success criteria.
- [ ] Identify stable IDs, APIs, schema, and affected services.
- [ ] Record baseline build/test failures.
- [ ] Plan rollback.

## Module library
- [ ] One canonical registry; no duplicate divergent module lists.
- [ ] IDs match existing data services/navigation.
- [ ] Search supports title, description and useful synonyms where appropriate.
- [ ] Groups are derived consistently and empty groups are handled.
- [ ] Module UI readiness is distinct from data availability and permissions.
- [ ] Every action routes correctly or reports an honest disabled/integration state.
- [ ] Loading, empty, stale, error and offline states are explicit where relevant.

## Responsive UX
- [ ] Narrow phone (~320–360px)
- [ ] Typical phone (~390–430px)
- [ ] Tablet
- [ ] Desktop / wide viewport
- [ ] No horizontal overflow or inexplicable blank column.
- [ ] Bottom navigation does not cover content.
- [ ] Safe-area insets respected.
- [ ] Touch targets and text remain usable.
- [ ] Keyboard focus and reduced motion work.
- [ ] Translucency does not harm contrast or performance.

## Regression
- [ ] Login/session
- [ ] Module navigation
- [ ] API request/response contract
- [ ] IndexedDB/snapshot refresh and stale-state behavior
- [ ] Barcode camera permission, success and failure
- [ ] Notifications
- [ ] PWA/service worker/offline
- [ ] Vite base path/GitHub Pages
- [ ] Build and tests pass

## Release
- [ ] Review diff for accidental removals/secrets.
- [ ] Confirm rollback point.
- [ ] Explicit user approval to push/deploy.
- [ ] Record release commit and verified URL.
