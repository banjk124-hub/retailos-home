import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const theme = readFileSync("src/styles/theme.css", "utf8");
const mobile = readFileSync("src/styles/mobile-tuning.css", "utf8");
const motion = readFileSync("src/shared/motion/motion.css", "utf8");
const glassTokens = readFileSync("src/shared/components/glass/glass.tokens.css", "utf8");
const loginStyles = readFileSync("src/styles/login-experience.css", "utf8");
const nativeStyles = readFileSync("src/styles/native-experience.css", "utf8");
const adaptiveStyles = readFileSync("src/styles/adaptive-appearance.css", "utf8");
const stocktakeImportStyles = readFileSync("src/features/stocktake-import/components/stocktake-import.css", "utf8");

const requiredThemeTokens = [
  "--color-brand-primary", "--color-brand-subtle", "--color-text-primary", "--color-text-secondary",
  "--color-text-muted", "--color-surface-canvas", "--color-surface-panel",
  "--color-border-subtle", "--color-status-success", "--color-status-warning",
  "--color-status-danger", "--color-status-info", "--font-family-ui",
  "--font-size-body", "--font-size-heading", "--font-variant-data",
  "--space-inset-default", "--space-section", "--radius-control",
  "--radius-panel", "--elevation-1", "--elevation-4", "--focus-outline",
  "--layout-content-max", "--focus-outline-color", "--focus-outline-width",
  "--focus-outline-offset", "--focus-outline-shadow"
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
const glassForegroundContracts = [
  "--glass-soft-foreground: var(--color-text-primary, var(--text-primary, #302a30));",
  "--glass-frosted-foreground: var(--color-text-primary, var(--text-primary, #302a30));",
  "--glass-elevated-foreground: var(--color-text-primary, var(--text-primary, #302a30));",
  "--glass-floating-foreground: var(--color-text-primary, var(--text-primary, #302a30));",
  "--glass-control-foreground: var(--color-text-primary, var(--text-primary, #302a30));"
];

for (const contract of glassForegroundContracts) {
  assert.ok(glassTokens.includes(contract), `Glass material must consume canonical text token: ${contract}`);
}

assert.ok(theme.includes("color: var(--color-text-primary, var(--text-primary));"));
assert.ok(theme.includes("font-family: var(--font-family-ui, var(--font-family-sans));"));
assert.ok(theme.includes("font-size: var(--font-size-body, var(--font-size-md));"));
assert.ok(theme.includes("line-height: var(--line-height-normal, var(--line-height-body));"));
assert.ok(theme.includes("--brand-focus-ring: var(--focus-outline-color);"));
assert.ok(theme.includes("--focus-ring-width: var(--focus-outline-width);"));
assert.ok(theme.includes("--focus-ring-offset: var(--focus-outline-offset);"));
assert.ok(theme.includes("--focus-ring-shadow: var(--focus-outline-shadow);"));
assert.ok(theme.includes("outline: var(--focus-outline, var(--focus-ring-width) solid var(--brand-focus-ring));"));
assert.ok(theme.includes("outline-offset: var(--focus-outline-offset, var(--focus-ring-offset));"));
assert.ok(theme.includes("box-shadow: var(--focus-outline-shadow, var(--focus-ring-shadow));"));
assert.ok(loginStyles.includes("var(--color-text-primary, var(--text-primary))"));
assert.ok(loginStyles.includes("var(--color-text-secondary, var(--text-secondary))"));
assert.ok(loginStyles.includes("var(--color-text-muted, var(--text-muted))"));
assert.ok(nativeStyles.includes("var(--color-border-subtle, var(--border-soft))"));
assert.ok(nativeStyles.includes("var(--color-surface-raised, var(--surface-raised))"));
assert.ok(nativeStyles.includes("var(--color-text-secondary, var(--text-secondary))"));
assert.ok(adaptiveStyles.includes("var(--color-border-subtle, var(--border-soft))"));
assert.ok(adaptiveStyles.includes("var(--color-surface-subtle, var(--surface-muted))"));
assert.ok(adaptiveStyles.includes("var(--color-text-secondary, var(--text-secondary))"));
assert.ok(stocktakeImportStyles.includes("var(--color-text-primary, var(--text-primary, #172033))"));
assert.ok(stocktakeImportStyles.includes("var(--color-text-secondary, var(--text-secondary,#687386))"));
assert.ok(theme.includes(".eyebrow { color: var(--color-brand-primary); }"));
assert.ok(theme.includes(".side-nav-item.active { color: var(--color-brand-strong);"));
const homeTheme = theme.slice(theme.indexOf("/* Home: restrained red/white system"));
assert.ok(homeTheme.includes("var(--color-brand-subtle)"), "Home surfaces must consume the semantic brand-subtle role");
assert.ok(homeTheme.includes("var(--color-brand-primary)"), "Home accents must consume the semantic brand-primary role");
assert.ok(!homeTheme.includes("#fff0f1"), "Home consumers must not hardcode the canonical brand-subtle color");
assert.ok(!/#d92736(?![0-9a-f])/i.test(homeTheme), "Home consumers must not hardcode the canonical brand-primary color");
assert.ok(nativeStyles.includes("var(--color-status-success, var(--color-success))"));
assert.ok(nativeStyles.includes("var(--color-status-danger, var(--color-error))"));
assert.ok(adaptiveStyles.includes("var(--color-status-warning, var(--color-warning))"));
assert.ok(adaptiveStyles.includes("var(--color-status-danger, var(--color-error))"));




console.log("Design foundation contract passed: semantic tokens, canonical body, Brand, status, Glass, Login, native-experience, adaptive-appearance and Stocktake Import token consumers, WCAG AA foreground checks on white, compatibility aliases, shared motion, reduced-motion and power-conserve hooks.");
