import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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

const homeScreen = readFileSync("src/features/home/HomeScreen.tsx", "utf8");
const homeRedesign = readFileSync("src/styles/home-redesign.css", "utf8");
assert.equal(
  homeScreen.includes("home-architecture.css"),
  false,
  "HomeScreen must not import the retired architecture stylesheet",
);
assert.equal(
  existsSync("src/styles/home-architecture.css"),
  false,
  "The consolidated Home architecture stylesheet must remain retired",
);
assert.match(
  homeRedesign,
  /Consolidated from home-architecture\.css/,
  "The former architecture rules must remain consolidated after the Home presentation layer",
);
assert.match(
  homeRedesign,
  /\.app-shell \.module-availability/,
  "A unique architecture-owned selector must remain after consolidation",
);
assert.equal(
  homeRedesign.includes(`@media (prefers-reduced-motion: reduce) {
  .app-shell .library-engine__group {
    transition: none;
  }
}`),
  false,
  "The duplicate Home library reduced-motion declaration must not be reintroduced",
);

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
