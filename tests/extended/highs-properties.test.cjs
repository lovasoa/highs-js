const assert = require("node:assert/strict");
const test = require("node:test");
const { loadRuntime, makeModel, requireExtended } = require("./helpers.cjs");

// ---------------------------------------------------------------------------
// 1. highs.version
// ---------------------------------------------------------------------------
test("highs.version exposes major, minor, patch, string, and gitHash", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  assert.equal(typeof highs.version.major, "number");
  assert.equal(typeof highs.version.minor, "number");
  assert.equal(typeof highs.version.patch, "number");
  assert.equal(typeof highs.version.string, "string");
  assert.ok(highs.version.string.length > 0);
  assert.equal(typeof highs.version.gitHash, "string");
  assert.ok(highs.version.gitHash.length > 0);
});

// ---------------------------------------------------------------------------
// 2. highs.infinity
// ---------------------------------------------------------------------------
test("highs.infinity equals Number.POSITIVE_INFINITY", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  assert.equal(highs.infinity, Number.POSITIVE_INFINITY);
});

// ---------------------------------------------------------------------------
// 3. highs.intBytes / highs.intBits
// ---------------------------------------------------------------------------
test("highs.intBytes and highs.intBits are positive integers", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  assert.ok(Number.isInteger(highs.intBytes));
  assert.ok(highs.intBytes > 0);
  assert.ok(Number.isInteger(highs.intBits));
  assert.ok(highs.intBits > 0);
  assert.equal(highs.intBits, highs.intBytes * 8);
});

// ---------------------------------------------------------------------------
// 4. highs.constants
// ---------------------------------------------------------------------------
test("highs.constants contains all expected key groups", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const expectedKeys = [
    "status",
    "variableType",
    "objectiveSense",
    "matrixFormat",
    "hessianFormat",
    "optionType",
    "infoType",
    "solutionStatus",
    "basisValidity",
    "basisStatus",
    "callbackType",
    "presolveStatus",
    "modelStatus",
    "iis",
  ];

  for (const key of expectedKeys) {
    assert.ok(
      Object.hasOwn(highs.constants, key),
      `highs.constants must have "${key}"`,
    );
    assert.equal(
      typeof highs.constants[key],
      "object",
      `highs.constants.${key} must be an object`,
    );
    assert.ok(
      Object.keys(highs.constants[key]).length > 0,
      `highs.constants.${key} must have entries`,
    );
  }

  // Spot-check some widely‑used values
  assert.equal(highs.constants.status.ok, 0);
  assert.equal(highs.constants.status.error, -1);
  assert.equal(highs.constants.objectiveSense.minimize, 1);
  assert.equal(highs.constants.objectiveSense.maximize, -1);
  assert.equal(highs.constants.variableType.continuous, 0);
  assert.equal(highs.constants.variableType.integer, 1);
  assert.equal(highs.constants.modelStatus.optimal, 7);
  assert.equal(highs.constants.modelStatus.infeasible, 8);
});

// ---------------------------------------------------------------------------
// 5. highs.errors
// ---------------------------------------------------------------------------
test("highs.errors exposes all five error constructors", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  assert.equal(typeof highs.errors.HighsError, "function");
  assert.equal(typeof highs.errors.HighsDisposedError, "function");
  assert.equal(typeof highs.errors.HighsValidationError, "function");
  assert.equal(typeof highs.errors.HighsReentrancyError, "function");
  assert.equal(typeof highs.errors.HighsUnsupportedOptionError, "function");

  // Instances carry the expected properties
  const e0 = new highs.errors.HighsError("msg", "myOp");
  assert.ok(e0 instanceof Error);
  assert.equal(e0.operation, "myOp");
  assert.equal(e0.status, -1);

  const e1 = new highs.errors.HighsDisposedError();
  assert.ok(e1 instanceof highs.errors.HighsError);
  assert.ok(e1 instanceof Error);

  const e2 = new highs.errors.HighsValidationError("bad");
  assert.ok(e2 instanceof highs.errors.HighsError);
  assert.equal(typeof e2.operation, "string");
  assert.ok(e2.operation.length > 0);

  const e3 = new highs.errors.HighsReentrancyError();
  assert.ok(e3 instanceof highs.errors.HighsError);

  const e4 = new highs.errors.HighsUnsupportedOptionError("threads");
  assert.equal(e4.option, "threads");
});

// ---------------------------------------------------------------------------
// 6. RawRuntimeApi.lpCall
// ---------------------------------------------------------------------------
test("RawRuntimeApi.lpCall solves an LP and returns a raw solution", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const lp = makeModel();
  const result = highs.raw.lpCall(lp);

  assert.ok(result.status !== -1, "lpCall must succeed");
  assert.equal(typeof result.value.modelStatus, "number");
  assert.ok(result.value.solution.colValue instanceof Float64Array);
  assert.ok(result.value.solution.rowValue instanceof Float64Array);
  assert.ok(result.value.solution.colDual instanceof Float64Array);
  assert.ok(result.value.solution.rowDual instanceof Float64Array);
  assert.equal(result.value.solution.colValue.length, lp.numCols);
  assert.equal(result.value.solution.rowValue.length, lp.numRows);
  assert.equal(result.value.solution.colDual.length, lp.numCols);
  assert.equal(result.value.solution.rowDual.length, lp.numRows);
  assert.ok(result.value.basis.colStatus instanceof Int32Array);
  assert.ok(result.value.basis.rowStatus instanceof Int32Array);
});

// ---------------------------------------------------------------------------
// 7. RawRuntimeApi.mipCall
// ---------------------------------------------------------------------------
test("RawRuntimeApi.mipCall solves a MIP and returns colValue and rowValue", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const mip = {
    ...makeModel(),
    integrality: new Int32Array([1, 1, 1, 1]),
  };
  const result = highs.raw.mipCall(mip);

  assert.ok(result.status !== -1, "mipCall must succeed");
  assert.equal(typeof result.value.modelStatus, "number");
  assert.ok(result.value.solution.colValue instanceof Float64Array);
  assert.ok(result.value.solution.rowValue instanceof Float64Array);
  assert.equal(result.value.solution.colValue.length, mip.numCols);
  assert.equal(result.value.solution.rowValue.length, mip.numRows);
  // MIP solution does not include dual values
  assert.equal(Object.hasOwn(result.value.solution, "colDual"), false);
  assert.equal(Object.hasOwn(result.value.solution, "rowDual"), false);
});

// ---------------------------------------------------------------------------
// 8. RawRuntimeApi.qpCall
// ---------------------------------------------------------------------------
test("RawRuntimeApi.qpCall solves a QP and returns a solution", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const qp = {
    ...makeModel(),
    sense: 1,
    hessian: {
      format: "triangular",
      dimension: 4,
      starts: new Int32Array([0, 1, 2, 3, 4]),
      indices: new Int32Array([0, 1, 2, 3]),
      values: new Float64Array([1, 1, 1, 1]),
    },
  };
  const result = highs.raw.qpCall(qp);

  assert.ok(result.status !== -1, "qpCall must succeed");
  assert.equal(typeof result.value.modelStatus, "number");
  assert.ok(result.value.solution.colValue instanceof Float64Array);
  assert.ok(result.value.solution.colDual instanceof Float64Array);
  assert.ok(result.value.solution.rowDual instanceof Float64Array);
  assert.equal(result.value.solution.colValue.length, qp.numCols);
});

// ---------------------------------------------------------------------------
// 9. raw.createModel()
// ---------------------------------------------------------------------------
test("raw.createModel() creates a raw model instance with disposed property", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const raw = highs.raw.createModel();
  t.after(() => raw.dispose());

  assert.equal(raw.disposed, false);
  assert.equal(typeof raw.passModel, "function");
  assert.equal(typeof raw.run, "function");
  assert.equal(typeof raw.getSolution, "function");
  assert.equal(typeof raw.dispose, "function");

  // Dispose and verify the flag
  raw.dispose();
  assert.equal(raw.disposed, true);
});

// ---------------------------------------------------------------------------
// 10. passHessian on a regular model
// ---------------------------------------------------------------------------
test("passHessian passes a hessian for QP solving", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set({ output_flag: false });

  // QP requires a convex (minimize) objective when the hessian is positive-definite
  model.changeObjectiveSense(highs.constants.objectiveSense.minimize);

  const result = model.passHessian({
    format: "triangular",
    dimension: 4,
    starts: new Int32Array([0, 1, 2, 3, 4]),
    indices: new Int32Array([0, 1, 2, 3]),
    values: new Float64Array([2, 4, 6, 8]),
  });
  assert.ok(result.status !== -1, "passHessian must succeed");
  assert.deepStrictEqual(result.warnings, []);

  model.run();
  assert.equal(model.getModelStatus(), highs.constants.modelStatus.optimal);
});

// ---------------------------------------------------------------------------
// 11. passLinearObjectives / addLinearObjective / clearLinearObjectives
// ---------------------------------------------------------------------------
test("passLinearObjectives, addLinearObjective, and clearLinearObjectives work", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set({ output_flag: false });

  // Pass a batch of objectives
  const r1 = model.passLinearObjectives([
    {
      weight: 1,
      offset: 0,
      coefficients: new Float64Array([1, 0, 0, 0]),
      absoluteTolerance: 0,
      relativeTolerance: 0,
      priority: -1,
    },
    {
      weight: 1,
      offset: 0,
      coefficients: new Float64Array([0, 1, 0, 0]),
      absoluteTolerance: 0,
      relativeTolerance: 0,
      priority: 1,
    },
  ]);
  assert.ok(r1.status !== -1, "passLinearObjectives must succeed");

  // Add one more objective
  const r2 = model.addLinearObjective({
    weight: 1,
    offset: 5,
    coefficients: new Float64Array([0, 0, 1, 0]),
    absoluteTolerance: 0,
    relativeTolerance: 0,
    priority: 2,
  });
  assert.ok(r2.status !== -1, "addLinearObjective must succeed");

  // Clear objectives and confirm the model still works
  const r3 = model.clearLinearObjectives();
  assert.ok(r3.status !== -1, "clearLinearObjectives must succeed");
});

// ---------------------------------------------------------------------------
// 12. clear / clearModel / clearSolver / releaseMemory
// ---------------------------------------------------------------------------
test("clear, clearModel, clearSolver, and releaseMemory lifecycle methods", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set({ output_flag: false });

  model.run();
  assert.equal(model.getModelStatus(), highs.constants.modelStatus.optimal);

  // clearSolver removes solution data but keeps the model
  const r1 = model.clearSolver();
  assert.ok(r1.status !== -1, "clearSolver must succeed");

  // clearModel removes the model but keeps the instance
  const r2 = model.clearModel();
  assert.ok(r2.status !== -1, "clearModel must succeed");
  assert.deepStrictEqual(model.getDimensions(), {
    numCols: 0,
    numRows: 0,
    numNonzeros: 0,
    hessianNonzeros: 0,
  });

  // Re-pass a model and run again
  model.passModel(makeModel());
  model.run();

  // releaseMemory frees internal memory
  const r3 = model.releaseMemory();
  assert.ok(r3.status !== -1, "releaseMemory must succeed");

  // clear does both clearModel + clearSolver
  model.passModel(makeModel());
  model.run();
  const r4 = model.clear();
  assert.ok(r4.status !== -1, "clear must succeed");
});

// ---------------------------------------------------------------------------
// 13. setSolution with sparse input
// ---------------------------------------------------------------------------
test("setSolution accepts a SparseSolutionInput with indices and values", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set({ output_flag: false });
  model.run();
  assert.equal(model.getModelStatus(), highs.constants.modelStatus.optimal);

  // Dense setSolution (SolutionInput)
  const dense = model.getSolution();
  const r1 = model.setSolution({
    colValue: new Float64Array(dense.colValue),
  });
  assert.ok(r1.status !== -1, "dense setSolution must succeed");

  // Sparse setSolution (SparseSolutionInput)
  const r2 = model.setSolution({
    indices: new Int32Array([0, 2]),
    values: new Float64Array([1, 2]),
  });
  assert.ok(r2.status !== -1, "sparse setSolution must succeed");
});

// ---------------------------------------------------------------------------
// 14. getRows
// ---------------------------------------------------------------------------
test("getRows uses IndexSelection to retrieve row data", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());

  // Get all rows via range
  const range = model.getRows({ kind: "range", from: 0, to: 1 });
  assert.equal(range.count, 2);
  assert.ok(range.lower instanceof Float64Array);
  assert.ok(range.upper instanceof Float64Array);
  assert.equal(range.lower.length, 2);
  assert.equal(range.upper.length, 2);

  // Get a single row via set
  const set = model.getRows({ kind: "set", indices: new Int32Array([0]) });
  assert.equal(set.count, 1);
  assert.equal(set.lower.length, 1);
  assert.ok(set.matrix.starts instanceof Int32Array);

  // Get rows via mask
  const mask = model.getRows({
    kind: "mask",
    mask: new Uint8Array([1, 0]),
  });
  assert.equal(mask.count, 1);
  assert.equal(mask.lower.length, 1);
});

// ---------------------------------------------------------------------------
// 15. getColIntegrality
// ---------------------------------------------------------------------------
test("getColIntegrality returns the variable type for each column", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel({
    ...makeModel(),
    integrality: new Int32Array([
      highs.constants.variableType.continuous,
      highs.constants.variableType.integer,
      highs.constants.variableType.semiContinuous,
      highs.constants.variableType.semiInteger,
    ]),
  });
  t.after(() => model.dispose());

  assert.equal(
    model.getColIntegrality(0),
    highs.constants.variableType.continuous,
  );
  assert.equal(
    model.getColIntegrality(1),
    highs.constants.variableType.integer,
  );
  assert.equal(
    model.getColIntegrality(2),
    highs.constants.variableType.semiContinuous,
  );
  assert.equal(
    model.getColIntegrality(3),
    highs.constants.variableType.semiInteger,
  );

  // Now change one and re-check
  model.changeColIntegrality(2, highs.constants.variableType.integer);
  assert.equal(
    model.getColIntegrality(2),
    highs.constants.variableType.integer,
  );
});
