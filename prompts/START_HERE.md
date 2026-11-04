# Prompts for coding agents

## Start every session
Read `AGENTS.md`, `.github/copilot-instructions.md`, `.github/skills/retailos-implementation/SKILL.md`, and all files in `docs/ai-context/`. Inspect the actual working tree before making edits. First report baseline findings, then propose the smallest safe implementation plan. Do not edit until you have identified affected contracts and regression risks.

## Audit-only prompt
Perform a source-grounded audit of this repository. Do not edit files. Map module registry, Home, navigation, auth/session, data services, IndexedDB snapshots, barcode, notifications, PWA/service worker and deployment. Report concrete file/line references, verified issues versus hypotheses, risk severity, and prioritized remediation.

## Module library implementation prompt
Implement the next approved module-library slice. Use the canonical registry only after verifying it against actual module IDs and navigation. Keep data availability, UI implementation status, permissions, connectivity and operation state distinct. No fake/demo behavior. Add or update tests. Run typecheck/build and report exact commands and results. Do not deploy.

## CSS/design-system prompt
Audit stylesheet import order, duplicate selectors and responsive rules before editing. Propose tokens and a migration map. Do not add another permanent override layer unless explicitly documented as temporary with removal criteria. Validate phone/tablet/desktop and reduced-motion/accessibility states. Do not claim visual verification without browser evidence.

## Release-readiness prompt
Do not deploy. Verify build scripts, test scripts, base path, service-worker behavior and git diff. List every unverified risk and the commands the user should run. Ask for explicit approval before any push/deploy.
