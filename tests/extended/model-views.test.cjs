const assert = require("node:assert/strict");
const test = require("node:test");
const {
  loadRuntime,
  makeModel,
  requireExtended,
} = require("./helpers.cjs");

test("getLp and getModel return model data in different formats", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());

  // CSC format
  const csc = model.getLp("csc");
  assert.ok(csc.colCost instanceof Float64Array);
  assert.equal(csc.numCols, 4);
  assert.equal(csc.numRows, 2);

  // CSR format
  const csr = model.getLp("csr");
  assert.ok(csr.colCost instanceof Float64Array);
  assert.equal(csr.matrix.format, "csr");

  // Default (CSC)
  const def = model.getLp();
  assert.equal(def.matrix.format, "csc");
});

test("getPresolvedLp returns the presolved model data", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set("output_flag", false);
  model.presolve();

  const presolved = model.getPresolvedLp();
  assert.ok(presolved.colCost instanceof Float64Array);
  assert.ok(presolved.numCols <= 4);
  assert.ok(presolved.numRows <= 2);

  const dims = model.getPresolvedDimensions();
  assert.equal(dims.numCols, presolved.numCols);
  assert.equal(dims.numRows, presolved.numRows);
});

test("getIisLp exposes the IIS subsystem for an infeasible model", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel({
    numCols: 1,
    numRows: 1,
    sense: 1,
    colCost: new Float64Array([0]),
    colLower: new Float64Array([0]),
    colUpper: new Float64Array([1]),
    rowLower: new Float64Array([2]),
    rowUpper: new Float64Array([Infinity]),
    matrix: {
      format: "csc",
      numRows: 1,
      numCols: 1,
      starts: new Int32Array([0, 1]),
      indices: new Int32Array([0]),
      values: new Float64Array([1]),
    },
  });
  t.after(() => model.dispose());
  model.options.set("output_flag", false);
  model.run();
  assert.equal(model.getModelStatus(), highs.constants.modelStatus.infeasible);

  const iisLp = model.getIisLp();
  assert.ok(iisLp.colCost instanceof Float64Array);
  assert.ok(iisLp.numCols >= 0);
});

test("presolve and postsolve handle the solve pipeline", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set("output_flag", false);

  model.presolve();
  model.run();

  const sol = model.getSolution();
  const presolvedDims = model.getPresolvedDimensions();

  const postsolveResult = model.postsolve({
    colValue: sol.colValue.slice(0, presolvedDims.numCols),
    colDual: sol.colDual.slice(0, presolvedDims.numCols),
    rowDual: sol.rowDual.slice(0, presolvedDims.numRows),
  });
  assert.ok(postsolveResult.status !== -1, "postsolve should succeed");
});

test("primal ray exposes unboundedness direction for unbounded models", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  // Unbounded model: maximize x subject to x >= 1
  const model = highs.createModel({
    numCols: 1,
    numRows: 1,
    sense: -1,
    colCost: new Float64Array([1]),
    colLower: new Float64Array([0]),
    colUpper: new Float64Array([highs.infinity]),
    rowLower: new Float64Array([1]),
    rowUpper: new Float64Array([highs.infinity]),
    matrix: {
      format: "csc",
      numRows: 1,
      numCols: 1,
      starts: new Int32Array([0, 1]),
      indices: new Int32Array([0]),
      values: new Float64Array([1]),
    },
  });
  t.after(() => model.dispose());
  model.options.set("output_flag", false);
  model.run();
  assert.equal(model.getModelStatus(), highs.constants.modelStatus.unbounded);

  const primalRay = model.getPrimalRay();
  assert.ok(primalRay !== undefined, "primal ray should be defined for unbounded model");
  assert.ok(primalRay.values instanceof Float64Array);
  assert.ok(primalRay.values.length > 0);
});

test("getRunTime and zeroAllClocks track solver time", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set("output_flag", false);

  model.zeroAllClocks();
  model.run();

  const runtime = model.getRunTime();
  assert.equal(typeof runtime, "number");
  assert.ok(runtime >= 0, "runtime should be non-negative");

  model.zeroAllClocks();
  assert.equal(model.getRunTime(), 0);
});
