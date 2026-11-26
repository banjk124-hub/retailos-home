import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const retiredClasses = [
  "sidebar",
  "hero-card",
  "metrics-grid",
  "module-card",
  "module-grid",
  "login-screen",
  "login-showcase",
  "activity-row",
  "attention-item",
];

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".html"]);
const sourceFiles = [];

function collectFiles(directory, extensions, output) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      collectFiles(path, extensions, output);
    } else if (extensions.has(extname(path))) {
      output.push(path);
    }
  }
}

collectFiles("src", sourceExtensions, sourceFiles);

for (const className of retiredClasses) {
  const token = new RegExp(
    `(^|[^A-Za-z0-9_-])${className}(?=$|[^A-Za-z0-9_-])`,
  );
  const sourceConsumers = sourceFiles.filter((path) => token.test(readFileSync(path, "utf8")));
  assert.deepEqual(
    sourceConsumers,
    [],
    `Retired class "${className}" has a source consumer: ${sourceConsumers.join(", ")}`,
  );
}

const cssFiles = [];
collectFiles("src", new Set([".css"]), cssFiles);

for (const path of cssFiles) {
  const css = readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const className of retiredClasses) {
    const selectorToken = new RegExp(`\\.${className}(?![A-Za-z0-9_-])`);
    assert.equal(
      selectorToken.test(css),
      false,
      `Retired selector ".${className}" remains in ${path}`,
    );
  }
}

console.log(
  `UI-03 legacy selector retirement passed: ${retiredClasses.length} classes have no source consumers or CSS selectors.`,
);
