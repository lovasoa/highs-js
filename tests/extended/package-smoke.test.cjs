const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { pathToFileURL } = require("node:url");
const { ROOT } = require("./helpers.cjs");

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const rootExport = pkg.exports?.["."];

test("CommonJS package export initializes the runtime", async () => {
  const target =
    typeof rootExport === "string"
      ? rootExport
      : rootExport?.require ?? rootExport?.default ?? pkg.main;
  assert.equal(typeof target, "string");
  assert.ok(fs.existsSync(path.join(ROOT, target)));

  const loader = require(ROOT);
  assert.equal(typeof loader, "function");
  const highs = await loader({ print: () => {}, printErr: () => {} });
  assert.equal(typeof highs.solve, "function");
});

test("native ESM package export initializes the same public API", async (t) => {
  const target = typeof rootExport === "object" ? rootExport?.import : undefined;
  if (!target) {
    t.skip("package has no conditional ESM export yet");
    return;
  }

  const targetPath = path.join(ROOT, target);
  assert.ok(fs.existsSync(targetPath), `${target} must be included in the package`);
  const imported = await import(pathToFileURL(targetPath).href);
  assert.equal(typeof imported.default, "function");
  const highs = await imported.default({ print: () => {}, printErr: () => {} });
  assert.equal(typeof highs.solve, "function");
  assert.equal(typeof highs.createModel, "function");
});
