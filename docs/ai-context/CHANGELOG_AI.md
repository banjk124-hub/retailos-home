# AI implementation log

Use append-only entries. Each entry must say what was actually changed and tested.

## Template
### YYYY-MM-DD — Short title
- Intent:
- Files:
- Behavior:
- Checks run:
- Results:
- Unverified:
- Risks / rollback:

## 2026-10-21 — Governance pack initialized
- Intent: establish durable instructions/context so future coding agents use the same project constraints.
- Files: `AGENTS.md`, `.github/copilot-instructions.md`, `.github/skills/retailos-implementation/SKILL.md`, `docs/ai-context/*`.
- Behavior: instructions and context only; no application code changed by this pack.
- Checks run: file structure reviewed by generation process; no application build is implied.
- Unverified: current repository state and whether the previous architecture patch has been applied locally.


## 2026-11-10 — SCAN-01 input contract
- Intent: formalize module-owned scan region and camera request before ROI implementation.
- Files: scanner contracts and SCAN-01 architecture/implementation records.
- Behavior: type/documentation boundary only; existing runtime defaults and flows unchanged.
- Checks: pending PR CI.
- Unverified: geometry mapping and device behavior are deferred to SCAN-02/03.
- Risks / rollback: low; no runtime consumer is wired in this PR.


## 2026-11-10 — SCAN-02 pure geometry mapper
- Intent: map module preview regions into source-frame coordinates before ROI decoding.
- Files: `scannerGeometry.ts`, `test-scanner-geometry.mjs`, `preflight.mjs`, and SCAN-02 docs/status records.
- Behavior: pure mapping for CSS object-fit, normalized object-position, visible content and mirror transforms; no runtime consumer wired.
- Checks: merged main CI run #299 passed full preflight, TypeScript, production build and GitHub Pages build. User confirms deployed smoke test with no existing-flow regression.
- Unverified: real-device Home/Stocktake alignment belongs to SCAN-03.
- Post-merge audit: no runtime geometry or architecture defect found. Corrected the test's DOM-boundary regex and added self-checks for `document.` / `window.` detection; no production runtime behavior changed.
- Risks / rollback: no runtime behavior changed; revert SCAN-02 if a future audit identifies a mapping defect.


## 2026-11-10 — SCAN-03 module-owned preview region integration
- Intent: wire each module's existing reticle to source-frame geometry without changing presentation or scanner lifecycle.
- Files: feature-level preview measurement service/hook, scanner session region contract, Home/Stocktake ref wiring, regression tests and synchronized SCAN-03 documentation.
- Behavior: map measured reticle rectangles through visible-content bounds and the SCAN-02 mapper; store source region in place. Decoder still receives the full video.
- Checks: automated geometry/session-update suite and full CI pending.
- Unverified: real iOS Safari/PWA and Android Chrome/PWA reticle alignment.
- Risks / rollback: no decoder ROI or camera/lifecycle changes; revert SCAN-03 if module geometry or in-place update contract fails.
