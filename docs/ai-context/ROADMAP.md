## PWA Update Center and explicit safe-handoff lifecycle

**Priority:** Active implementation branch `feat/pwa-update-center-safe-handoff`, based on main after PR #122. No CI or physical acceptance is claimed yet.

- [x] Persist deferred candidate metadata by device and BUILD_ID.
- [x] Separate staging consent from explicit activation confirmation in the update UI.
- [x] Add centered idle presentation and compact expandable busy presentation.
- [x] Add Settings Update Center entry and pending-action badge.
- [ ] Verify no automatic activation after stage, reload/reopen or blocker-clear.
- [ ] Add regression tests for persistent deferral, staged deferral, explicit activation and badge consistency.
- [ ] Audit business blockers against every module's transaction/dirty/import/export/confirmation lifecycle.
- [ ] Implement and audit authoritative forced-update policy; optional is the safe default until then.
- [ ] Pass final-head preflight, TypeScript, production/Pages builds and PWA worker/cache/platform tests.
- [ ] Complete physical Android/iOS/Desktop and low-end Android acceptance.

Canonical contract: [PWA_RUNTIME_RELEASE.md](./PWA_RUNTIME_RELEASE.md). This work does not merge or deploy production.
