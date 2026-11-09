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
