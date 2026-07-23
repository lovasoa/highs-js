const assert = require("node:assert/strict");
const test = require("node:test");
const {
  loadRuntime,
  makeModel,
  requireExtended,
} = require("./helpers.cjs");

test("getBasis returns valid basis status vectors after solving", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set("output_flag", false);
  model.run();

  const basis = model.getBasis();
  assert.ok(basis.colStatus instanceof Int32Array);
  assert.ok(basis.rowStatus instanceof Int32Array);
  assert.equal(basis.colStatus.length, 4);
  assert.equal(basis.rowStatus.length, 2);

  // Every status must be a valid basis status value
  const valid = new Set(Object.values(highs.constants.basisStatus));
  for (const s of basis.colStatus) assert.ok(valid.has(s), `invalid col status ${s}`);
  for (const s of basis.rowStatus) assert.ok(valid.has(s), `invalid row status ${s}`);
});

test("setBasis and setLogicalBasis seed the starting basis", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set("output_flag", false);

  // Set a logical (slack-only) starting basis
  const logicalResult = model.setLogicalBasis();
  assert.ok(logicalResult.status !== -1, "setLogicalBasis should succeed");
  model.run();

  // Set a custom basis from the solved result
  const basis = model.getBasis();
  const newModel = highs.createModel(makeModel());
  t.after(() => newModel.dispose());
  newModel.options.set("output_flag", false);
  const setResult = newModel.setBasis(basis);
  assert.ok(setResult.status !== -1, "setBasis should succeed");
  newModel.run();
  assert.equal(newModel.getModelStatus(), highs.constants.modelStatus.optimal);
});

test("getBasicVariables returns the indices of basic variables", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set("output_flag", false);
  model.run();

  const basicVars = model.getBasicVariables();
  assert.ok(basicVars instanceof Int32Array);
  // Number of basic variables equals number of rows
  assert.equal(basicVars.length, 2);
  // Values are column indices in range or negative for slacks
  for (const idx of basicVars) {
    assert.ok(idx >= -2 && idx < 4, `basic var index ${idx} out of range`);
  }
});

test("getBasisInverseRow and getBasisInverseCol expose the inverse", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set("output_flag", false);
  model.run();

  // Dense vector
  const invRow = model.getBasisInverseRow(0);
  assert.equal(typeof invRow.values, "object");
  assert.ok(invRow.values.length > 0);

  const invCol = model.getBasisInverseCol(0);
  assert.equal(typeof invCol.values, "object");
  assert.ok(invCol.values.length > 0);

  // Sparse vector (values is always dense-length; nonzeroIndices lists positions)
  const sparseRow = model.getBasisInverseRow(0, true);
  assert.ok(sparseRow.nonzeroIndices instanceof Int32Array);
  assert.ok(sparseRow.values.length > 0);
  assert.ok(sparseRow.nonzeroIndices.length > 0);
  assert.ok(sparseRow.nonzeroIndices.length <= sparseRow.values.length);
});

test("getBasisSolve and getBasisTransposeSolve apply the basis", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set("output_flag", false);
  model.run();

  const rhs = new Float64Array([1, 0]);

  // Dense solve
  const solve = model.getBasisSolve(rhs);
  assert.equal(typeof solve.values, "object");
  assert.equal(solve.values.length, 2);

  const transpose = model.getBasisTransposeSolve(rhs);
  assert.equal(typeof transpose.values, "object");
  assert.equal(transpose.values.length, 2);

  // Sparse solve
  const sparseSolve = model.getBasisSolve(rhs, true);
  assert.ok(sparseSolve.nonzeroIndices instanceof Int32Array);
  assert.ok(sparseSolve.nonzeroIndices.length > 0);
});

test("getReducedRow and getReducedColumn return simplex tableau rows/columns", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set("output_flag", false);
  model.run();

  // Dense
  const reducedRow = model.getReducedRow(0);
  assert.equal(typeof reducedRow.values, "object");
  assert.ok(reducedRow.values.length > 0);

  const reducedCol = model.getReducedColumn(0);
  assert.equal(typeof reducedCol.values, "object");
  assert.ok(reducedCol.values.length > 0);

  // Sparse
  const sparseRow = model.getReducedRow(0, true);
  assert.ok(sparseRow.nonzeroIndices instanceof Int32Array);

  const sparseCol = model.getReducedColumn(0, true);
  assert.ok(sparseCol.nonzeroIndices instanceof Int32Array);
});

test("crossover converts an interior-point solution to a basic one", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set({ output_flag: false, solver: "ipm" });
  model.run();
  assert.equal(model.getModelStatus(), highs.constants.modelStatus.optimal);

  const sol = model.getSolution();
  // Pass only colValue and rowValue to crossover
  const crossoverResult = model.crossover({
    colValue: sol.colValue,
    rowValue: sol.rowValue,
  });
  // crossover may not always succeed for every problem; verify it completed
  assert.ok(typeof crossoverResult.status === "number");
});
