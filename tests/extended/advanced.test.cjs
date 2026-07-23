const assert = require("node:assert/strict");
const test = require("node:test");
const {
  loadRuntime,
  makeModel,
  requireExtended,
  assertDeepApprox,
} = require("./helpers.cjs");

const RANGING_PROBLEM = `Maximize
 obj: x1 + 2 x2 + 4 x3 + x4
Subject To
 c1: - x1 + x2 + x3 + 10 x4 <= 20
 c2: x1 - 4 x2 + x3 <= 30
 c3: x2 - 0.5 x4 = 0
Bounds
 0 <= x1 <= 40
 2 <= x4 <= 3
End`;

const EXPECTED_RANGING = {
  colCostUp: {
    value: [2.4, 19.5, Infinity, 9.75],
    objective: [112, 105, Infinity, 105],
    inVariable: [3, 3, -1, 3],
    outVariable: [3, 3, -1, 3],
  },
  colCostDown: {
    value: [-4, -Infinity, 1.94, -Infinity],
    objective: [0, -Infinity, 53.52, -Infinity],
    inVariable: [5, -1, 3, -1],
    outVariable: [2, -1, 3, -1],
  },
  colBoundUp: {
    value: [23.75, 1.5, 16.5, 3],
    objective: [78.75, 78.75, 87.5, 78.75],
    inVariable: [3, 3, -1, 3],
    outVariable: [3, 3, -1, 3],
  },
  colBoundDown: {
    value: [1, 1, 12.25, 0],
    objective: [5, 87.5, 78.75, 105],
    inVariable: [5, -1, 3, 3],
    outVariable: [2, -1, 3, 1],
  },
  rowBoundUp: {
    value: [55, 75, 9],
    objective: [140, 200, 182],
    inVariable: [3, 5, 5],
    outVariable: [0, 0, 0],
  },
  rowBoundDown: {
    value: [-13, -3, -1],
    objective: [38, 5, 77],
    inVariable: [-1, -1, 3],
    outVariable: [2, 2, 1],
  },
};

function plainRanging(ranging) {
  return Object.fromEntries(
    Object.entries(ranging).map(([name, record]) => [
      name,
      {
        value: [...record.value],
        objective: [...record.objective],
        inVariable: [...record.inVariable],
        outVariable: [...record.outVariable],
      },
    ]),
  );
}

test("persistent and raw ranging match the HiGHS golden result", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel({ format: "lp", data: RANGING_PROBLEM });
  t.after(() => model.dispose());
  model.options.set("output_flag", false);
  model.run();

  const first = model.getRanging();
  assertDeepApprox(plainRanging(first), EXPECTED_RANGING);
  first.colCostUp.value[0] = Number.NaN;
  assertDeepApprox(plainRanging(model.getRanging()), EXPECTED_RANGING);

  const raw = highs.raw.createModel();
  assert.equal(
    raw.readModel({ format: "lp", data: RANGING_PROBLEM }).status,
    highs.constants.status.ok,
  );
  assert.equal(raw.setOptionValue("output_flag", false).status, 0);
  assert.equal(raw.run().status, 0);
  const result = raw.getRanging();
  assert.equal(result.status, 0);
  assertDeepApprox(plainRanging(result.value), EXPECTED_RANGING);
  raw.dispose();

  assertDeepApprox(
    plainRanging(result.value),
    EXPECTED_RANGING,
    "ranging arrays must remain valid after native disposal",
  );
});

test("LP, MIP, and QP one-shot families return detached solutions", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const lp = makeModel();
  const lpResult = highs.raw.lpCall(lp);
  assert.notEqual(lpResult.status, -1);
  assert.equal(lpResult.value.solution.colValue.length, lp.numCols);

  const mip = { ...lp, integrality: new Int32Array([1, 1, 1, 1]) };
  const mipResult = highs.raw.mipCall(mip);
  assert.notEqual(mipResult.status, -1);
  assert.equal(mipResult.value.solution.colValue.length, mip.numCols);

  const qp = {
    ...lp,
    sense: 1,
    hessian: {
      format: "triangular",
      dimension: lp.numCols,
      starts: new Int32Array([0, 1, 2, 3, 4]),
      indices: new Int32Array([0, 1, 2, 3]),
      values: new Float64Array([1, 1, 1, 1]),
    },
  };
  const qpResult = highs.raw.qpCall(qp);
  assert.notEqual(qpResult.status, -1);
  assert.equal(qpResult.value.solution.colValue.length, qp.numCols);

  lpResult.value.solution.colValue[0] = Number.NaN;
  assert.ok(Number.isFinite(highs.raw.lpCall(lp).value.solution.colValue[0]));
});

test("IIS and feasibility-relaxation families handle an infeasible model", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel({
    numCols: 1,
    numRows: 1,
    sense: 1,
    colCost: [0],
    colLower: [0],
    colUpper: [1],
    rowLower: [2],
    rowUpper: [Infinity],
    matrix: {
      format: "csc",
      numRows: 1,
      numCols: 1,
      starts: [0, 1],
      indices: [0],
      values: [1],
    },
  });
  t.after(() => model.dispose());
  model.options.set("output_flag", false);
  model.run();
  assert.equal(
    model.getModelStatus(),
    highs.constants.modelStatus.infeasible,
  );

  const iis = model.getIis();
  assert.equal(iis.colIndex.length, iis.colBound.length);
  assert.equal(iis.rowIndex.length, iis.rowBound.length);
  assert.ok(iis.colIndex.length + iis.rowIndex.length > 0);

  model.feasibilityRelaxation({
    globalLowerPenalty: 1,
    globalUpperPenalty: 1,
    globalRowPenalty: 1,
  });
  assert.equal(
    model.getModelStatus(),
    highs.constants.modelStatus.infeasible,
    "HiGHS restores the original model status after solving the relaxation",
  );
  assert.equal(model.getSolution().colValue.length, 1);
  assert.ok(Number.isFinite(model.getObjectiveValue()));
});
