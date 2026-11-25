

## 13. Playwright-assisted implementation and verification
Use Playwright as the preferred browser automation and visual feedback layer for browser-relevant implementation work. It should help the engineer inspect the real application while coding—not merely run a final test after implementation.

Workflow:
1. Inspect the existing package scripts, test stack, app entry points, routing and test fixtures before adding or changing tooling.
2. Start the actual RetailOS development build and verify the target workflow in a real browser context.
3. Capture repeatable screenshots at agreed desktop, tablet and mobile viewport profiles. Use them to inspect composition, hierarchy, typography, image treatment, responsive transitions, clipping, overlap, density and overlay placement.
4. Exercise the actual interactions and meaningful states, including keyboard/focus behavior, loading, empty, error and success states as relevant.
5. Use assertions for behavior; use screenshots for visual inspection. Capture Playwright traces, console errors and failed requests when a test fails.
6. Prefer semantic locators (role, label, text) and stable test IDs only when necessary. Avoid brittle selectors based on CSS implementation details.
7. Keep browser tests focused on user journeys and integration boundaries; do not duplicate lower-level unit tests.
8. Separate deterministic screenshot setup from motion verification. Snapshot tests may stabilize time/data/animation, but motion, reduced-motion and interruption behavior must also be checked in a non-snapshot run.
9. Treat browser emulation as Browser-verified only. Physical-device checks remain mandatory for device-specific behavior such as camera permissions, scanner, vibration, installability and low-end performance.
10. Do not add Playwright to the production runtime/bundle. Tooling dependencies and CI integration require a scoped change, package/CI audit and owner approval; do not silently install or expand CI in a documentation batch.

For each relevant task, report browser/version or project browser profile, viewport, command, assertions, screenshot/trace evidence, failures and remaining device checks. Never claim Device-accepted from Playwright alone.
