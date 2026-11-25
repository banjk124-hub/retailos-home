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

assert.ok(!theme.includes("\\n"), "Theme CSS must not contain escaped newline sequences");

for (const token of requiredThemeTokens) {
  assert.ok(theme.includes(token), `Missing canonical foundation token: ${token}`);
}

function tokenValue(name) {
  const match = theme.match(new RegExp(`^\\s*${name}:\\s*([^;]+);`, "m"));
  assert.ok(match, `Missing token declaration: ${name}`);
  const value = match[1].trim();
  if (value.startsWith("var(")) {
    const reference = value.slice(4).split(/[),]/, 1)[0].trim();
    return tokenValue(reference);
  }
  return value;
}

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrastRatio(foreground, background = "#ffffff") {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

const contrastTokens = [
  "--color-brand-primary", "--color-brand-strong", "--color-text-primary",
  "--color-text-secondary", "--color-text-muted", "--color-status-success",
  "--color-status-warning", "--color-status-danger", "--color-status-info",
  "--color-status-neutral"
];

for (const token of contrastTokens) {
  const value = tokenValue(token);
  assert.match(value, /^#[0-9a-f]{6}$/i, `${token} must resolve to a six-digit hex color`);
  assert.ok(
    contrastRatio(value) >= 4.5,
    `${token} fails 4.5:1 contrast on white: ${contrastRatio(value).toFixed(2)}:1`
  );
}

assert.ok(mobile.includes("--motion-standard: var(--motion-ease-standard)"));
assert.ok(mobile.includes("--motion-duration: var(--motion-duration-interaction)"));
assert.ok(motion.includes("@media (prefers-reduced-motion: reduce)"));
assert.ok(motion.includes(':root[data-power-mode="conserve"]'));
assert.ok(glassTokens.includes(':root[data-power-mode="conserve"]'));
assert.ok(theme.includes("--color-warning: var(--color-status-warning)"));
assert.ok(theme.includes("--color-error: var(--color-status-danger)"));
assert.ok(theme.includes("--surface-card: var(--color-surface-panel)"));

console.log("Design foundation contract passed: semantic tokens, WCAG AA foreground checks on white, compatibility aliases, shared motion, reduced-motion and power-conserve hooks.");
