# Current handoff — RetailOS engineering continuation

**Current Scanner baseline:** runtime stabilization and ecosystem cleanup are complete. PR #153 was merged and deployed; the project owner confirmed the current application flow operates normally without observed errors.

- Current implementation contract: [SCANNER_ENGINE.md](./SCANNER_ENGINE.md). Scanner context is intentionally consolidated into this file and [SCANNER_HISTORY.md](./SCANNER_HISTORY.md) only; do not create parallel Scanner phase/audit files.
- Historical decisions and phase evidence: [SCANNER_HISTORY.md](./SCANNER_HISTORY.md).
- Production decoder: ZXing-C++ WASM on the Main Thread.
- Home and Stocktake use the shared Scanner Engine/session.
- The unused Worker prototype and production diagnostics collector/QA Monitor were retired. Benchmark harness and real WASM integration tests remain.
- No SC-01–SC-05 workstream is active.

## Engineering boundaries

Preserve shared camera lease ownership, session lifecycle/recovery, strict feature-owned ROI, bounded recognition, decoder allowlist, payload validation, and Home/Stocktake workflow contracts. Do not revive retired Worker or production diagnostics paths without a reproducible requirement and evidence-backed proposal.

## Task start protocol

Read [INDEX.md](./INDEX.md), then load only the canonical documents and source/tests relevant to the requested task. Verify live branch, PR, CI and deployment state before changing volatile status. Prefer the smallest solution that satisfies the requirement.

