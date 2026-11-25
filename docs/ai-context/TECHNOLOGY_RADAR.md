

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
