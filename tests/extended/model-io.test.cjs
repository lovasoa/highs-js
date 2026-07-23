const assert = require("node:assert/strict");
const test = require("node:test");
const {
  loadRuntime,
  makeModel,
  requireExtended,
} = require("./helpers.cjs");

test("exportModel and readModel round-trip LP and MPS", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const source = makeModel();
  source.colNames = ["a", "b", "c", "d"];
  source.rowNames = ["first", "second"];
  const original = highs.createModel(source);
  t.after(() => original.dispose());

  // LP round-trip
  const lpText = original.exportModel("lp");
  assert.equal(typeof lpText, "string");
  assert.ok(lpText.includes("obj"), "LP output should contain the objective");
  assert.ok(lpText.includes("first"), "LP output should contain row names");
  assert.ok(lpText.includes("bounds"), "LP output should contain bounds section");

  const reimported = highs.createModel();
  t.after(() => reimported.dispose());
  const readResult = reimported.readModel({ format: "lp", data: lpText });
  assert.ok(readResult.status !== -1, "readModel for LP should succeed");
  assert.deepStrictEqual(reimported.getDimensions(), original.getDimensions());

  // MPS round-trip
  const mpsBytes = original.exportModel("mps");
  assert.ok(mpsBytes instanceof Uint8Array);
  assert.ok(mpsBytes.length > 0, "MPS output should not be empty");

  const mpsReimported = highs.createModel();
  t.after(() => mpsReimported.dispose());
  const mpsRead = mpsReimported.readModel({ format: "mps", data: mpsBytes });
  assert.ok(mpsRead.status !== -1, "readModel for MPS should succeed");
  assert.deepStrictEqual(mpsReimported.getDimensions(), original.getDimensions());
});

test("exportSolution outputs the current solution as text", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set("output_flag", false);
  model.run();

  const pretty = model.exportSolution(true);
  assert.equal(typeof pretty, "string");
  assert.ok(pretty.length > 0, "pretty solution output should not be empty");

  const plain = model.exportSolution(false);
  assert.equal(typeof plain, "string");
  assert.ok(plain.length > 0, "plain solution output should not be empty");
});

test("exportPresolvedModel exports the presolved model", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set("output_flag", false);
  model.presolve();

  const lpText = model.exportPresolvedModel("lp");
  assert.equal(typeof lpText, "string");
  assert.ok(lpText.length > 0, "presolved LP should not be empty");

  const mpsBytes = model.exportPresolvedModel("mps");
  assert.ok(mpsBytes instanceof Uint8Array);
  assert.ok(mpsBytes.length > 0, "presolved MPS should not be empty");
});
