# RetailOS Technology Radar & Evaluation Register

**Authority:** Canonical record of technology exploration and adoption decisions.  
**Parent authority:** `RETAILOS_PRODUCT_SKILL.md`, `AGENTS.md` and applicable domain contracts.  
**Status:** Open evaluation register. A radar entry is not approval to install, migrate or deploy.

## 1. Purpose

Keep RetailOS open to better browsers, libraries, frameworks, design systems, typography, imagery, motion tools and developer tooling without adopting technology because it is fashionable or rejecting it because it is new.

## 2. Decision vocabulary

- **KEEP** — retain the current implementation for this responsibility; reassess only if evidence or requirements change.
- **ADOPT** — introduce a new technology for a bounded responsibility.
- **REPLACE** — migrate an existing technology/implementation to another.
- **BUILD** — implement a focused in-house solution because available options do not meet requirements.
- **DEFER** — potentially useful, but evidence, timing or prerequisites are insufficient.
- **REJECT** — evaluated and not selected for the stated context; preserve rationale and reconsideration trigger.

These are decision outcomes, not maturity rankings. A technology may be suitable for one subsystem and unsuitable for another.

## 3. Mandatory evaluation protocol

1. **Problem statement:** identify a real user, product or engineering problem and its measurable impact.
2. **Current-state audit:** inspect existing code, browser/platform support, dependencies, consumers, bundle and runtime costs.
3. **Candidate discovery:** include current/native APIs, existing dependencies, adopt, replace and focused custom-build options. Research current official documentation and credible evidence when freshness matters.
4. **Prototype:** prove the candidate in the actual RetailOS source/runtime or a clearly isolated experiment. Figma frames, vendor demos and benchmark claims alone are not implementation evidence.
5. **Compatibility:** verify supported browsers, desktop/tablet/mobile, accessibility, Vietnamese content, PWA/offline behavior and protected contracts.
6. **Operational cost:** evaluate license, maintenance health, release cadence, security, bundle size, CPU, memory, startup, low-end fallback, lock-in and migration/rollback.
7. **Decision:** record KEEP / ADOPT / REPLACE / BUILD / DEFER / REJECT with evidence, owner and scope.
8. **Validation:** tests, browser/device evidence and success/failure thresholds.
9. **Revisit:** define the trigger that would justify reconsideration.

No new runtime dependency, framework migration, backend/service, architecture change or production-impacting tool is adopted solely by this radar. Follow owner approval and repository release controls.

## 4. Required evaluation record

| Field | Required content |
|---|---|
| ID / date | Stable identifier and review date |
| Problem | Concrete problem and affected workflow |
| Scope | Feature/subsystem and explicit non-goals |
| Current baseline | Existing solution and measured limitations |
| Candidates | Current/native, adopt, replace, build alternatives |
| Evidence | Official docs, source prototype, tests and measurements |
| Compatibility | Browser/device, accessibility, PWA/offline, contracts |
| Cost | License, bundle, CPU/memory, maintenance, migration |
| Decision | KEEP / ADOPT / REPLACE / BUILD / DEFER / REJECT |
| Owner | Decision owner and approval reference |
| Rollout | Tests, migration, fallback and rollback |
| Revisit trigger | New requirement, defect or measurable threshold |

## 5. Initial baseline (not a new adoption decision)

| Area | Current source baseline | Current disposition |
|---|---|---|
| Application framework/build | React + Vite PWA | KEEP as current baseline; no replacement proposed by BATCH 01 |
| Hosting/development distribution | GitHub Pages with base `/retailos-home/` | KEEP; preserve release and deployment contract |
| Scanner runtime | ZXing-C++ WASM through existing Scanner Engine adapter | KEEP; scanner stabilization is closed |
| Motion | Existing shared Motion foundation plus feature-owned choreography | KEEP baseline; evaluate additions only for a proven gap |
| Styling | Existing CSS/token foundations with layered legacy styles | DEFER broad framework/CSS replacement pending source ownership and computed-style evidence |
| Typography | Inter/system fallback; final Vietnamese font remains open | DEFER selection until glyph, readability, license, payload and offline validation |
| Imagery | Retail photography not yet shipped in source assets at audited baseline | EVALUATE licensed local/versioned asset pipeline; no vendor selected |
| Routing/App Shell | No route-based App Shell at audited baseline | DEFER technology selection until M0-approved product/IA and source constraints exist |

This table records observed baseline and current disposition only. It does not grant permission for dependency changes or imply a final product decision.

## 6. Rejected and deferred candidates

Every REJECT/DEFER record must state why it was not selected and what new evidence would justify reopening. Do not repeatedly re-propose a rejected option without that trigger and new evidence.

## 7. Radar maintenance

- Update when a decision is made, not for every passing mention of a technology.
- Link ADRs, PRs, prototypes, benchmarks and tests.
- Revalidate versions, security and support status before implementation.
- Remove stale candidates only after preserving decision history.
- Keep this register concise; detailed subsystem contracts stay with their domain owners.

## 8. Browser verification & visual evidence — Playwright

**Owner direction (BATCH 01):** use Playwright as the browser-automation and visual-inspection layer that supports implementation and verification. This is a development/QA tool, not a RetailOS runtime dependency and not a substitute for product or device acceptance.

### Intended responsibilities
- Launch the real Vite application and exercise real routes, workflows and UI states in a browser.
- Capture screenshots at agreed desktop, tablet and mobile viewport profiles so layout, hierarchy, spacing, typography, imagery, overlays and responsive behavior can be inspected while coding.
- Verify interaction paths: navigation, menus, dialogs, forms, loading/empty/error/success states, keyboard focus and escape/close behavior where applicable.
- Capture traces, console errors, failed network requests and screenshots on failure to make defects reproducible.
- Use deterministic fixtures/mocks only at explicit boundaries; do not silently replace the business data/state path being verified.
- Run focused smoke/regression journeys for protected contracts when the changed surface touches them.

### Verification boundaries
- Playwright browser emulation is **Browser-verified**, not **Device-accepted**. Physical iOS/Android camera, scanner, permission, vibration, performance and PWA-install behavior still require real-device checks.
- Screenshots are visual evidence, not proof of functional correctness. Pair them with assertions and interaction checks.
- Visual comparison must account for fonts, viewport, device scale factor, animation timing and dynamic data. Disable/settle nonessential motion only for deterministic snapshots; separately verify the actual motion and reduced-motion behavior.
- Do not make screenshot snapshots the sole acceptance gate or introduce brittle selectors tied to visual structure. Prefer accessible roles/names and stable test IDs only where semantic selectors are insufficient.
- Keep tests focused and layered: smoke first, critical user journeys next, then targeted visual/regression coverage. Avoid duplicating unit/integration tests in the browser.
- Do not add Playwright to the production bundle. Add browser/test dependencies and CI workflows only through a scoped implementation change after checking the current package scripts, existing test stack, browser support, CI cost and owner approval.

### Required evidence for UI work
For a browser-relevant UI change, report:
1. exact commit/branch and command/config used;
2. browser and viewport profiles exercised;
3. user journeys and assertions passed/failed;
4. screenshots and trace/error evidence where useful;
5. known gaps that require physical-device or owner review.

A passing Playwright run does not imply CI passed, merge approval, deployment, or device acceptance. Record these statuses separately.
