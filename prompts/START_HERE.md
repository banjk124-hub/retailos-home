# Prompts for coding agents

## Start every session — selective context protocol

1. Read `AGENTS.md` and `docs/ai-context/INDEX.md`.
2. Read `PROJECT_CONTEXT.md` and `IMPLEMENTATION_STATUS.md` for current product constraints and verified state.
3. Use INDEX to select only the canonical topic document(s) and relevant skill. Read historical records only when tracing a specific decision or regression.
4. Verify the actual GitHub default branch, current commit, working branch, PR, CI and deployment state. Never infer current status from a prior chat or stale handoff.
5. Inspect relevant source and the focused diff. Establish what is confirmed, what is unknown, affected contracts, risks and rollback before editing.
6. Make one coherent, reviewable change on an isolated branch. Run only checks appropriate to the change; report exact commit/run and distinguish CI, local execution and physical-device QA.

Do not bulk-read all of `docs/ai-context/`, do not create duplicate context documents, and do not claim local/browser/device tests unless they were actually executed.

## Audit-only prompt
Perform a source-grounded audit of this repository. Do not edit files. Map module registry, Home, navigation, auth/session, data services, IndexedDB snapshots, barcode, notifications, PWA/service worker and deployment. Report concrete file/line references, verified issues versus hypotheses, risk severity, and prioritized remediation.

## Module library implementation prompt
Implement the next approved module-library slice. Use the canonical registry only after verifying it against actual module IDs and navigation. Keep data availability, UI implementation status, permissions, connectivity and operation state distinct. No fake/demo behavior. Add or update tests. Run typecheck/build and report exact commands and results. Do not deploy.

## CSS/design-system prompt
Audit stylesheet import order, duplicate selectors and responsive rules before editing. Propose tokens and a migration map. Do not add another permanent override layer unless explicitly documented as temporary with removal criteria. Validate phone/tablet/desktop and reduced-motion/accessibility states. Do not claim visual verification without browser evidence.

## Release-readiness prompt
Do not deploy. Verify build scripts, test scripts, base path, service-worker behavior and git diff. List every unverified risk and the commands the user should run. Ask for explicit approval before any push/deploy.
