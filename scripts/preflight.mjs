import { spawnSync } from "node:child_process";

const npmCli = process.env.npm_execpath;

if (!npmCli) {
  console.error("PREFLIGHT must be started with: npm run preflight");
  process.exit(1);
}

const checks = [
  {
    name: "Scanner benchmark manifest and metrics core tests",
    command: process.execPath,
    args: ["scripts/test-scanner-benchmark-core.mjs"],
  },
  {
    name: "Scanner dev-only benchmark harness isolation tests",
    command: process.execPath,
    args: ["scripts/test-scanner-benchmark-harness.mjs"],
  },
  {
    name: "Home performance and snapshot-notice regression tests",
    command: process.execPath,
    args: ["scripts/test-home-performance.mjs"],
  },
  {
    name: "Cross-platform overlay viewport and content-scroll layout tests",
    command: process.execPath,
    args: ["scripts/test-overlay-layout-contract.mjs"],
  },
  {
    name: "UI interaction immediacy and lazy-loading feedback contract tests",
    command: process.execPath,
    args: ["scripts/test-ui-interaction-immediacy.mjs"],
  },
  {
    name: "Shared overlay body scroll-lock reference-count regression tests",
    command: process.execPath,
    args: ["scripts/test-body-scroll-lock.mjs"],
  },
  {
    name: "Stocktake offline file import regression tests",
    command: process.execPath,
    args: ["scripts/test-stocktake-import.mjs"],
  },
  {
    name: "Scanner temporal recognition contract tests",
    command: process.execPath,
    args: ["scripts/test-scanner-temporal-recognition.mjs"],
  },
  {
    name: "Scanner barcode validation regression tests",
    command: process.execPath,
    args: ["scripts/test-scanner-validation.mjs"],
  },
  {
    name: "Scanner camera request compatibility regression tests",
    command: process.execPath,
    args: ["scripts/test-scanner-camera-request.mjs"],
  },
  {
    name: "Scanner recovery diagnostics privacy and export tests",
    command: process.execPath,
    args: ["scripts/test-scanner-diagnostics.mjs"],
  },
  {
    name: "Scanner lifecycle contract regression tests",
    command: process.execPath,
    args: ["scripts/test-scanner-lifecycle.mjs"],
  },
  {
    name: "Scanner torch capability regression tests",
    command: process.execPath,
    args: ["scripts/test-scanner-torch.mjs"],
  },
  {
    name: "Scanner configurable symbology preferences and validation tests",
    command: process.execPath,
    args: ["scripts/test-scanner-symbology-settings.mjs"],
  },
  {
    name: "Scanner settings and shared feedback regression tests",
    command: process.execPath,
    args: ["scripts/test-scanner-settings.mjs"],
  },
  {
    name: "Scanner Web Audio runtime regression tests",
    command: process.execPath,
    args: ["scripts/test-scanner-audio-runtime.mjs"],
  },
  {
    name: "Scanner presentation ownership tests",
    command: process.execPath,
    args: ["scripts/test-scanner-presentation.mjs"],
  },
  {
    name: "Scanner preview/source geometry mapping tests",
    command: process.execPath,
    args: ["scripts/test-scanner-geometry.mjs"],
  },
  {
    name: "Scanner module-owned preview region integration tests",
    command: process.execPath,
    args: ["scripts/test-scanner-preview-region.mjs"],
  },
  {
    name: "Scanner 0°/180° rotation baseline tests",
    command: process.execPath,
    args: ["scripts/test-scanner-rotation-baseline.mjs"],
  },
  {
    name: "Scanner orthogonal rotation regression tests",
    command: process.execPath,
    args: ["scripts/test-scanner-rotation.mjs"],
  },
  {
    name: "Scanner decoder adapter/factory contract tests",
    command: process.execPath,
    args: ["scripts/test-scanner-decoder-factory.mjs"],
  },
  {
    name: "ZXing-C++ WASM candidate adapter contract tests",
    command: process.execPath,
    args: ["scripts/test-scanner-zxing-wasm.mjs"],
  },
  {
    name: "Scanner production decoder integration tests",
    command: process.execPath,
    args: ["scripts/test-scanner-decoder-integration.mjs"],
  },
  {
    name: "Scanner unified enhancement pipeline regression tests",
    command: process.execPath,
    args: ["scripts/test-scanner-enhancement-pipeline.mjs"],
  },
  {
    name: "Scanner image quality analysis regression tests",
    command: process.execPath,
    args: ["scripts/test-scanner-image-quality.mjs"],
  },
  {
    name: "Scanner A1 unified image-quality profile tests",
    command: process.execPath,
    args: ["scripts/test-scanner-image-quality-profile.mjs"],
  },
  {
    name: "Scanner A2 adaptive processing controller tests",
    command: process.execPath,
    args: ["scripts/test-scanner-adaptive-processing-a2.mjs"],
  },
  {
    name: "Scanner A3 adaptive runtime performance and stability tests",
    command: process.execPath,
    args: ["scripts/test-scanner-adaptive-runtime-a3.mjs"],
  },
  {
    name: "Scanner bounded deskew regression tests",
    command: process.execPath,
    args: ["scripts/test-scanner-deskew.mjs"],
  },
  {
    name: "Scanner strict reticle ROI decoder regression tests",
    command: process.execPath,
    args: ["scripts/test-scanner-roi-decoder.mjs"],
  },
  {
    name: "Scanner adaptive ROI multi-scale regression tests",
    command: process.execPath,
    args: ["scripts/test-scanner-scale.mjs"],
  },
  {
    name: "Scanner ROI focus quality and autofocus recovery tests",
    command: process.execPath,
    args: ["scripts/test-scanner-focus-quality.mjs"],
  },
  {
    name: "Scanner shared camera track constraint serialization tests",
    command: process.execPath,
    args: ["scripts/test-scanner-track-constraints.mjs"],
  },
  {
    name: "Home cache batching and shared download lifecycle regression tests",
    command: process.execPath,
    args: ["scripts/test-home-cache-batching.mjs"],
  },
  {
    name: "Production build (TypeScript + Vite)",
    command: process.execPath,
    args: [npmCli, "run", "build"],
  },
  {
    name: "GitHub Pages build (TypeScript + Vite base path)",
    command: process.execPath,
    args: [npmCli, "run", "build:pages"],
  },
  {
    name: "Bundle code-splitting and feature-boundary tests",
    command: process.execPath,
    args: ["scripts/test-bundle-boundaries.mjs"],
  },
  {
    name: "PWA service worker runtime behavior tests",
    command: process.execPath,
    args: ["scripts/test-pwa-worker-runtime.mjs"],
  },
  {
    name: "PWA cache policy and update lifecycle tests",
    command: process.execPath,
    args: ["scripts/test-pwa-cache-policy.mjs"],
  },
  {
    name: "PWA desktop, Android and iOS compatibility contract tests",
    command: process.execPath,
    args: ["scripts/test-pwa-platform-compatibility.mjs"],
  },
  {
    name: "Production bundle report",
    command: process.execPath,
    args: ["scripts/report-bundle.mjs"],
  },
  {
    name: "Unstaged diff whitespace check",
    command: "git",
    args: ["diff", "--check"],
  },
  {
    name: "Staged diff whitespace check",
    command: "git",
    args: ["diff", "--cached", "--check"],
  },
];

function run(check) {
  console.log(`\n[RUN] ${check.name}`);

  const result = spawnSync(check.command, check.args, {
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.error(`[FAIL] ${check.name}: ${result.error.message}`);
    return false;
  }

  if (result.status !== 0) {
    console.error(`[FAIL] ${check.name} (exit code: ${result.status ?? "unknown"})`);
    return false;
  }

  console.log(`[PASS] ${check.name}`);
  return true;
}

console.log("\n========================================");
console.log("          RETAILOS LOCAL PREFLIGHT");
console.log("========================================");
console.log(`Node: ${process.version}`);
console.log(`Platform: ${process.platform} / ${process.arch}`);

for (const check of checks) {
  if (!run(check)) {
    console.error("\nPREFLIGHT FAILED — fix the reported issue before pushing.");
    process.exit(1);
  }
}

console.log("\n========================================");
console.log("PREFLIGHT PASSED");
console.log("Build and diff checks passed. Manual functional QA is still required.");
console.log("========================================\n");
