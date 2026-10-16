const assert = require("node:assert/strict");
const test = require("node:test");
const { loadRuntime, makeModel, requireExtended } = require("./helpers.cjs");

test("logging callbacks expose only initialized data and no invalid controls", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  const logging = highs.constants.callbackType.logging;
  let callbackCount = 0;

  model.run({
    [logging](event) {
      callbackCount += 1;
      assert.deepStrictEqual(Object.keys(event.data), ["log_type"]);
      assert.equal(typeof event.data.log_type, "number");
      assert.equal("interrupt" in event, false);
      assert.equal("setSolution" in event, false);
      assert.equal("repairSolution" in event, false);
      assert.throws(
        () => model.dispose(),
        (error) => error?.name === "HighsReentrancyError",
      );
    },
  });

  assert.ok(callbackCount > 0, "the logging callback should run");
  assert.equal(model.disposed, false);
});

test("async callbacks and invalid callback types unwind registration", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  const logging = highs.constants.callbackType.logging;

  assert.throws(
    () => model.run({ [logging]: async () => {} }),
    (error) =>
      error?.name === "HighsValidationError" && /synchronous/.test(error.message),
  );
  assert.throws(
    () => model.run({ 8: () => undefined }),
    (error) => error?.name === "HighsValidationError",
  );

  model.options.set("output_flag", false);
  assert.notEqual(model.run().status, -1);
});

test("clearing callbacks cannot leave a native null function active", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const raw = highs.raw.createModel();
  t.after(() => raw.dispose());
  assert.equal(raw.setCallback(() => undefined).status, 0);
  assert.equal(raw.setCallback(undefined).status, 0);
  assert.equal(
    raw.startCallback(highs.constants.callbackType.logging).status,
    -1,
  );
});

test("an empty high-level callback map preserves a raw callback", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  const logging = highs.constants.callbackType.logging;
  let callbackCount = 0;
  assert.equal(
    model.raw.setCallback(() => {
      callbackCount += 1;
    }).status,
    0,
  );
  assert.equal(model.raw.startCallback(logging).status, 0);

  model.run({});
  assert.ok(callbackCount > 0);
  assert.throws(
    () => model.run({ [logging]: () => undefined }),
    (error) =>
      error?.name === "HighsValidationError" &&
      /registered through model\.raw/.test(error.message),
  );

  assert.equal(model.raw.stopCallback(logging).status, 0);
  assert.equal(model.raw.setCallback(undefined).status, 0);
});

test("callback exceptions preserve even an undefined thrown value", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  const logging = highs.constants.callbackType.logging;
  let didThrow = false;
  try {
    model.run({
      [logging]() {
        throw undefined;
      },
    });
  } catch (error) {
    didThrow = true;
    assert.equal(error, undefined);
  }
  assert.equal(didThrow, true);
});

test("MIP solution callbacks copy the native vector's declared size", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const source = makeModel();
  source.integrality = new Int32Array([1, 1, 1, 1]);
  const model = highs.createModel(source);
  t.after(() => model.dispose());
  model.options.set("output_flag", false);

  const lengths = [];
  model.run({
    [highs.constants.callbackType.mipSolution](event) {
      assert.ok(event.data.mip_solution instanceof Float64Array);
      lengths.push(event.data.mip_solution.length);
    },
  });

  assert.ok(lengths.length > 0, "the MIP solution callback should run");
  assert.deepStrictEqual(new Set(lengths), new Set([source.numCols]));
});

// Deterministic multi-dimensional knapsack: maximize p'x subject to W x <= c,
// x binary. Large enough that HiGHS queries the mipUserSolution callback more
// than once before it finds a good incumbent of its own.
function makeKnapsack(numCols, numRows, seed) {
  let state = seed >>> 0;
  const random = () => (state = (state * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const colCost = new Float64Array(numCols);
  const rowUpper = new Float64Array(numRows);
  const starts = new Int32Array(numCols + 1);
  const indices = new Int32Array(numCols * numRows);
  const values = new Float64Array(numCols * numRows);
  for (let col = 0; col < numCols; col += 1) {
    colCost[col] = 10 + Math.floor(random() * 90);
    starts[col] = col * numRows;
    for (let row = 0; row < numRows; row += 1) {
      const weight = 5 + Math.floor(random() * 45);
      indices[col * numRows + row] = row;
      values[col * numRows + row] = weight;
      rowUpper[row] += weight;
    }
  }
  starts[numCols] = numCols * numRows;
  for (let row = 0; row < numRows; row += 1) rowUpper[row] = Math.floor(rowUpper[row] / 2);
  return {
    numCols,
    numRows,
    sense: -1,
    offset: 0,
    colCost,
    colLower: new Float64Array(numCols),
    colUpper: new Float64Array(numCols).fill(1),
    rowLower: new Float64Array(numRows).fill(-Infinity),
    rowUpper,
    matrix: { format: "csc", numRows, numCols, starts, indices, values },
    integrality: new Int32Array(numCols).fill(1),
  };
}

// Greedy feasible knapsack solution: take items by profit per unit weight
// while every row keeps enough capacity.
function greedySolution(source) {
  const { numCols, numRows, colCost, rowUpper } = source;
  const values = source.matrix.values;
  const order = Array.from({ length: numCols }, (_, col) => col);
  const weightOf = (col) => {
    let total = 0;
    for (let row = 0; row < numRows; row += 1) total += values[col * numRows + row];
    return total;
  };
  order.sort((a, b) => colCost[b] / weightOf(b) - colCost[a] / weightOf(a));
  const remaining = Float64Array.from(rowUpper);
  const solution = new Float64Array(numCols);
  for (const col of order) {
    let fits = true;
    for (let row = 0; row < numRows && fits; row += 1)
      fits = values[col * numRows + row] <= remaining[row];
    if (!fits) continue;
    solution[col] = 1;
    for (let row = 0; row < numRows; row += 1) remaining[row] -= values[col * numRows + row];
  }
  return solution;
}

function objectiveOf(source, solution) {
  let total = source.offset;
  for (let col = 0; col < source.numCols; col += 1) total += source.colCost[col] * solution[col];
  return total;
}

test("a solution submitted from the mipUserSolution callback becomes the incumbent", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const source = makeKnapsack(200, 10, 12345);
  const submitted = greedySolution(source);
  const submittedObjective = objectiveOf(source, submitted);
  const model = highs.createModel(source);
  t.after(() => model.dispose());
  model.options.set({ output_flag: false, random_seed: 1, time_limit: 5 });

  let firings = 0;
  const primalBounds = [];
  const improving = [];
  model.run({
    [highs.constants.callbackType.mipUserSolution](event) {
      firings += 1;
      if (firings === 1) assert.deepStrictEqual(event.setSolution(submitted), { status: 0 });
      else primalBounds.push(event.data.mip_primal_bound);
    },
    [highs.constants.callbackType.mipImprovingSolution](event) {
      improving.push(event.data.objective_function_value);
    },
    [highs.constants.callbackType.mipInterrupt](event) {
      // The second query is all this test needs; stop the search early.
      if (firings >= 2) event.interrupt();
    },
  });

  assert.ok(firings >= 2, "HiGHS should query the callback again after the submission");
  // HiGHS adopted the submission as its incumbent before the next query...
  assert.ok(
    primalBounds[0] >= submittedObjective - 1e-6,
    `the primal bound at the second firing (${primalBounds[0]}) should be at least the submitted objective (${submittedObjective})`,
  );
  // ...so every incumbent it reports afterwards must improve on it.
  for (const objective of improving)
    assert.ok(objective > submittedObjective, `improving solution ${objective} should beat the submitted ${submittedObjective}`);
  assert.ok(
    objectiveOf(source, model.getSolution().colValue) >= submittedObjective - 1e-6,
    "the final solution should be at least as good as the submission",
  );
});
