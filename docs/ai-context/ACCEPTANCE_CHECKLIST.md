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

## Scanner transition — supplemental UX patch

- [ ] Home opens as a full-screen camera surface; no camera card/frame remains.
- [ ] Stocktake retains its existing scanner frame, dimensions and layout.
- [ ] Home and Stocktake use independent presentation treatments; no shared UI template is introduced.
- [ ] Camera acquisition begins from the opening tap; the mounted scanner claims the same pending lease.
- [ ] Closing before lease handoff cancels safely; a late stream is released without stopping another active lease.
- [ ] A lease request cannot be claimed twice.
- [ ] Camera permission denial and explicit retry remain recoverable.
- [ ] Animation does not gate camera startup, first-frame reveal, decoder readiness or scanner teardown.
- [ ] First usable video frame is revealed without a standalone loading screen or visible flicker.
- [ ] prefers-reduced-motion is respected.
- [ ] iOS Safari/PWA: first permission, denial/retry, rapid open/close, background/foreground and scan result.
- [ ] Android Chrome/PWA: first permission, denial/retry, rapid open/close, background/foreground and scan result.
- [ ] Weak-device review: no heavy blur, large promoted layers, continuous animation or material scan regression.
- [ ] Home cached lookup and Stocktake form-fill/explicit-save, duplicate rows and manual entry still work.
- [ ] CI and local preflight pass; physical-device evidence is recorded separately.
