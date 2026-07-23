const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { ROOT, loadRuntime, requireExtended } = require("./helpers.cjs");

const contract = require(path.join(
  ROOT,
  "api/highs-c-api.generated.json",
)).runtimeContract;
const constantContract = require(path.join(
  ROOT,
  "api/highs-c-api.generated.json",
)).constantContract;

function interfaceMethods(source, name) {
  const marker = `export interface ${name}`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} must exist in types.d.ts`);
  const open = source.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (; end < source.length; end += 1) {
    if (source[end] === "{") depth += 1;
    if (source[end] === "}") depth -= 1;
    if (depth === 0) break;
  }
  assert.ok(end > open, `${name} must have a complete body`);
  return new Set(
    [...source.slice(open + 1, end).matchAll(/^\s{2}([A-Za-z]\w*)\s*\(/gm)].map(
      (match) => match[1],
    ),
  );
}

test("generated C policy matches runtime methods, declarations, and constants", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const declarations = fs.readFileSync(path.join(ROOT, "types.d.ts"), "utf8");
  const rawRuntimeDeclaration = interfaceMethods(declarations, "RawRuntimeApi");
  const rawModelDeclaration = interfaceMethods(declarations, "RawModelApi");
  const rawModel = highs.raw.createModel();
  t.after(() => rawModel.dispose());

  for (const method of contract.rawRuntimeMethods) {
    assert.equal(typeof highs.raw[method], "function", `highs.raw.${method}`);
    assert.ok(
      rawRuntimeDeclaration.has(method),
      `RawRuntimeApi.${method} must be declared`,
    );
  }
  for (const method of contract.rawModelMethods) {
    assert.equal(typeof rawModel[method], "function", `RawModel.${method}`);
    assert.ok(
      rawModelDeclaration.has(method),
      `RawModelApi.${method} must be declared`,
    );
  }

  assert.deepStrictEqual(highs.constants, constantContract);
});
