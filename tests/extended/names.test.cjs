const assert = require("node:assert/strict");
const test = require("node:test");
const {
  loadRuntime,
  makeModel,
  requireExtended,
} = require("./helpers.cjs");

test("getColName, getRowName, and reverse lookups work for named models", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());

  // Forward lookups
  assert.equal(model.getColName(0), "a");
  assert.equal(model.getColName(3), "d");
  assert.equal(model.getRowName(0), "first");
  assert.equal(model.getRowName(1), "second");

  // Reverse lookups
  assert.equal(model.getColByName("a"), 0);
  assert.equal(model.getColByName("d"), 3);
  assert.equal(model.getRowByName("first"), 0);
  assert.equal(model.getRowByName("second"), 1);
});

test("passColName, passRowName, and passModelName rename entities", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());

  // Rename a column
  const r1 = model.passColName(0, "alpha");
  assert.ok(r1.status !== -1, "passColName should succeed");
  assert.equal(model.getColName(0), "alpha");

  // Rename a row
  const r2 = model.passRowName(0, "primary");
  assert.ok(r2.status !== -1, "passRowName should succeed");
  assert.equal(model.getRowName(0), "primary");

  // Rename the model
  const r3 = model.passModelName("my-renamed-model");
  assert.ok(r3.status !== -1, "passModelName should succeed");
});

test("getPresolvedColName and getPresolvedRowName expose presolved names", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set("output_flag", false);

  // Presolve and check that presolved names are accessible
  model.presolve();
  const presolvedDims = model.getPresolvedDimensions();
  if (presolvedDims.numCols > 0) {
    // Presolved names may differ from original names
    const name = model.getPresolvedColName(0);
    assert.equal(typeof name, "string");
    assert.ok(name.length > 0);
  }
  if (presolvedDims.numRows > 0) {
    const name = model.getPresolvedRowName(0);
    assert.equal(typeof name, "string");
    assert.ok(name.length > 0);
  }
});
