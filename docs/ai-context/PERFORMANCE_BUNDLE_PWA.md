# RetailOS bundle, code-splitting and PWA cache architecture

## Scope

This document records the production loading and update contracts introduced by the P0–P5 performance work. The goal is to reduce work on the login path, load feature code only when requested, and make deployed PWA assets deterministic and reclaimable.

## Build observability (P0)

- Vite emits `.vite/manifest.json` for dependency-graph inspection.
- `npm run preflight` produces `dist/bundle-report.md` and `dist/bundle-report.json` after the Pages build.
- CI builds the exact PR base SHA with its original toolchain, reconstructs the legacy entry closure from `index.html`, and compares it with the current manifest-based build.
- CI uploads baseline/current reports and the before/after comparison as the `retailos-bundle-analysis` artifact.
- The report distinguishes initial static entry closure, each dynamic entry chunk, its incremental bytes beyond the eager entry, and its full static dependency/CSS closure. Shared eager dependencies are excluded from incremental estimates to avoid double-counting. Per-file gzip sums are estimates, not browser transfer measurements.
- Use browser Network/Performance traces for actual transferred bytes, parse/compile time, FCP and LCP.

## Loading boundaries (P1–P2)

- Login remains the eager entry experience.
- Authenticated `HomeScreen` is loaded with React lazy/Suspense after the identity transition.
- Stocktake, Stocktake Import, Home barcode scanner, Settings, Scanner QA Monitor and Scanner Settings are separate lazy feature boundaries.
- The ZXing decoder implementation is dynamically imported only after the first usable camera frame has been published. This keeps the heavy decoder chunk out of the scanner presentation's initial dependency graph and allows preview reveal while decoder code loads; SCANNING still waits for decoder initialization.
- `jszip` and `pptxgenjs` remain dynamically imported by the export actions.
- Feature CSS is imported by its owning lazy component where ownership is unambiguous. Shared tokens, reset, typography and cross-screen foundation styles remain in the app entry.
- Do not add broad `manualChunks` rules without evidence from the generated manifest. Splitting a file is not equivalent to deferring its download.

## Service worker lifecycle

The current lifecycle specification has moved to the canonical [PWA_RUNTIME_RELEASE.md](./PWA_RUNTIME_RELEASE.md). That document supersedes the historical P3–P4 cache-on-demand policy below and defines complete precache, active-release pinning, staged activation, boot health and rollback.

Bundle analysis remains this document's responsibility. The Vite plugin inventories emitted runtime files; the PWA release contract consumes that inventory and stages it before activation.

## Protected contracts

- No change to scanner camera ownership, lifecycle, decoder validation, temporal recognition, adaptive A1–A3 policies, ROI, or module presentation ownership.
- No change to Stocktake persistence, IndexedDB schema, import history, or explicit save semantics.
- No automatic worker takeover or reload without user acceptance.
- Update observers are removed on component unmount; the shared registration promise prevents duplicate registration during React StrictMode remounts.
- No deployment or merge is implied by this implementation branch.

## Validation and acceptance

Run `npm run preflight`, TypeScript, production build and Pages build on the final PR head. The PWA-specific checks are listed in [PWA_RUNTIME_RELEASE.md](./PWA_RUNTIME_RELEASE.md).

The physical-device matrix in that canonical document is mandatory and separate from CI. Bundle reports and VM Service Worker tests do not prove actual Android/iOS offline behavior or camera startup.
