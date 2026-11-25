import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const theme = readFileSync("src/styles/theme.css", "utf8");
const mobile = readFileSync("src/styles/mobile-tuning.css", "utf8");
const motion = readFileSync("src/shared/motion/motion.css", "utf8");
const glassTokens = readFileSync("src/shared/components/glass/glass.tokens.css", "utf8");

const requiredThemeTokens = [
  "--color-brand-primary", "--color-text-primary", "--color-text-secondary",
  "--color-text-muted", "--color-surface-canvas", "--color-surface-panel",
  "--color-border-subtle", "--color-status-success", "--color-status-warning",
  "--color-status-danger", "--color-status-info", "--font-family-ui",
  "--font-size-body", "--font-size-heading", "--font-variant-data",
  "--space-inset-default", "--space-section", "--radius-control",
  "--radius-panel", "--elevation-1", "--elevation-4", "--focus-outline",
  "--layout-content-max"
];

for (const token of requiredThemeTokens) {
  assert.ok(theme.includes(token), `Missing canonical foundation token: ${token}`);
}
assert.match(mobile, /--motion-standard:\s*var\(--motion-ease-standard\)/);
assert.match(mobile, /--motion-duration:\s*var\(--motion-duration-interaction\)/);
assert.ok(motion.includes("@media (prefers-reduced-motion: reduce)"));
assert.ok(motion.includes(':root[data-power-mode="conserve"]'));
assert.ok(glassTokens.includes(':root[data-power-mode="conserve"]'));
assert.ok(theme.includes("--color-warning: var(--color-status-warning)"));
assert.ok(theme.includes("--color-error: var(--color-status-danger)"));

console.log("Design foundation contract passed: semantic tokens, compatibility aliases, shared motion, reduced-motion and power-conserve hooks.");
