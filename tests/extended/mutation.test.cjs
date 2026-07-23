const assert = require("node:assert/strict");
const test = require("node:test");
const {
  loadRuntime,
  makeModel,
  requireExtended,
} = require("./helpers.cjs");

test("addVar and addVars extend the model with new columns", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel();
  t.after(() => model.dispose());

  // Add a single variable
  const r1 = model.addVar(0, 10);
  assert.ok(r1.status !== -1, "addVar should succeed");
  assert.deepStrictEqual(model.getDimensions(), {
    numCols: 1, numRows: 0, numNonzeros: 0, hessianNonzeros: 0,
  });

  // Add multiple variables
  const r2 = model.addVars(
    new Float64Array([0, 5]),
    new Float64Array([1, 10]),
  );
  assert.ok(r2.status !== -1, "addVars should succeed");
  assert.equal(model.getDimensions().numCols, 3);
});

test("addCol and addCols add columns with matrix coefficients", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel();
  t.after(() => model.dispose());

  // First add a row so columns have somewhere to go
  model.addRow(-Infinity, 10, {
    indices: new Int32Array([]),
    values: new Float64Array([]),
  });

  // Add a single column with coefficients
  const r1 = model.addCol(5, 0, 1, {
    indices: new Int32Array([0]),
    values: new Float64Array([3]),
  });
  assert.ok(r1.status !== -1, "addCol should succeed");
  assert.equal(model.getDimensions().numCols, 1);

  // Add multiple columns (CSC format)
  const r2 = model.addCols({
    cost: new Float64Array([1, 2]),
    lower: new Float64Array([0, 0]),
    upper: new Float64Array([1, 1]),
    matrix: {
      format: "csc",
      numRows: 1,
      numCols: 2,
      starts: new Int32Array([0, 1, 2]),
      indices: new Int32Array([0, 0]),
      values: new Float64Array([1, 2]),
    },
  });
  assert.ok(r2.status !== -1, "addCols should succeed");
  assert.equal(model.getDimensions().numCols, 3);
});

test("addRow and addRows add constraints", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());

  const origDims = model.getDimensions();

  // Add a single row
  const r1 = model.addRow(1, 5, {
    indices: new Int32Array([0, 2]),
    values: new Float64Array([1, 1]),
  });
  assert.ok(r1.status !== -1, "addRow should succeed");
  assert.equal(model.getDimensions().numRows, origDims.numRows + 1);

  // addRows requires a CSR (row-wise) matrix
  const r2 = model.addRows({
    lower: new Float64Array([0]),
    upper: new Float64Array([10]),
    matrix: {
      format: "csr",
      numRows: 1,
      numCols: 4,
      starts: new Int32Array([0, 4]),
      indices: new Int32Array([0, 1, 2, 3]),
      values: new Float64Array([1, 1, 1, 1]),
    },
  });
  assert.ok(r2.status !== -1, "addRows should succeed");
  assert.equal(model.getDimensions().numRows, origDims.numRows + 2);
});

test("deleteCols and deleteRows remove parts of the model", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());

  // Delete columns by range (from..to is inclusive of both ends)
  const r1 = model.deleteCols({ kind: "range", from: 0, to: 1 });
  assert.ok(r1.status !== -1, "deleteCols range should succeed");
  // Deleted columns 0 and 1 (2 cols), leaving columns 2 and 3
  assert.equal(model.getDimensions().numCols, 2);

  // Delete row by set
  const r2 = model.deleteRows({
    kind: "set",
    indices: new Int32Array([0]),
  });
  assert.ok(r2.status !== -1, "deleteRows set should succeed");
  assert.equal(model.getDimensions().numRows, 1);
});

test("changeCoefficient updates a single matrix entry", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set("output_flag", false);

  // Change a coefficient and verify the model still solves
  const r = model.changeCoefficient(0, 0, 99);
  assert.ok(r.status !== -1, "changeCoefficient should succeed");
  model.run();
  assert.equal(model.getModelStatus(), highs.constants.modelStatus.optimal);
});

test("changeObjectiveSense and changeObjectiveOffset modify the objective", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());

  assert.equal(model.getObjectiveSense(), -1); // maximize
  const r1 = model.changeObjectiveSense(highs.constants.objectiveSense.minimize);
  assert.ok(r1.status !== -1);
  assert.equal(model.getObjectiveSense(), 1);

  const r2 = model.changeObjectiveOffset(100);
  assert.ok(r2.status !== -1);
  assert.equal(model.getObjectiveOffset(), 100);
});

test("changeColIntegrality sets integer types on variables", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());

  // Set a single variable to integer
  const r1 = model.changeColIntegrality(0, highs.constants.variableType.integer);
  assert.ok(r1.status !== -1);
  assert.equal(model.getColIntegrality(0), highs.constants.variableType.integer);

  // Bulk set via range
  const r2 = model.changeColsIntegrality(
    { kind: "range", from: 1, to: 2 },
    new Int32Array([
      highs.constants.variableType.integer,
      highs.constants.variableType.integer,
    ]),
  );
  assert.ok(r2.status !== -1);
  assert.equal(model.getColIntegrality(1), highs.constants.variableType.integer);
  assert.equal(model.getColIntegrality(2), highs.constants.variableType.integer);

  // Clear all integrality
  const r3 = model.clearIntegrality();
  assert.ok(r3.status !== -1);
  assert.equal(model.getColIntegrality(0), highs.constants.variableType.continuous);
});

test("scaleCol and scaleRow apply scaling factors", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());

  const r1 = model.scaleCol(0, 2);
  assert.ok(r1.status !== -1, "scaleCol should succeed");

  const r2 = model.scaleRow(0, 0.5);
  assert.ok(r2.status !== -1, "scaleRow should succeed");
});

test("ensureColwise and ensureRowwise manage internal representation", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());

  const r1 = model.ensureColwise();
  assert.ok(r1.status !== -1, "ensureColwise should succeed");

  const r2 = model.ensureRowwise();
  assert.ok(r2.status !== -1, "ensureRowwise should succeed");
});
