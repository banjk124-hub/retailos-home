import { spawnSync } from "node:child_process";

const npmCli = process.env.npm_execpath;

if (!npmCli) {
  console.error("PREFLIGHT must be started with: npm run preflight");
  process.exit(1);
}

const checks = [
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
