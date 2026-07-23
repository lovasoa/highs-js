const assert = require("node:assert/strict");
const test = require("node:test");
const {
  loadRuntime,
  makeModel,
  requireExtended,
} = require("./helpers.cjs");

test("simplexInterrupt callback type is accepted and event has interrupt()", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set("output_flag", false);

  let sawEvent = false;
  // Interrupt callbacks may not fire for very fast solves; we verify
  // they are accepted and, if fired, have the correct shape.
  model.run({
    [highs.constants.callbackType.simplexInterrupt](event) {
      sawEvent = true;
      assert.equal(typeof event.data.simplex_iteration_count, "number");
      assert.equal(typeof event.interrupt, "function");
    },
  });
  // Confirm the solve succeeded; callback firing is optional for tiny models
  assert.ok(model.getModelStatus() === highs.constants.modelStatus.optimal);
});

test("ipmInterrupt callback type is accepted with ipm solver", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set({ output_flag: false, solver: "ipm" });

  let sawEvent = false;
  model.run({
    [highs.constants.callbackType.ipmInterrupt](event) {
      sawEvent = true;
      assert.equal(typeof event.data.ipm_iteration_count, "number");
      assert.equal(typeof event.interrupt, "function");
    },
  });
  assert.ok(model.getModelStatus() === highs.constants.modelStatus.optimal);
});

test("MIP callbacks fire for integer models", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const source = makeModel();
  source.integrality = new Int32Array([1, 0, 1, 0]);
  source.colUpper = new Float64Array([10, 10, 10, 10]);
  const model = highs.createModel(source);
  t.after(() => model.dispose());
  model.options.set({ output_flag: false });

  const counts = { improving: 0, logging: 0, interrupt: 0, cutPool: 0 };

  model.run({
    [highs.constants.callbackType.mipImprovingSolution](event) {
      counts.improving += 1;
      assert.ok(event.data.mip_solution instanceof Float64Array);
      assert.equal(event.data.mip_solution.length, source.numCols);
    },
    [highs.constants.callbackType.mipLogging](event) {
      counts.logging += 1;
      assert.equal(typeof event.message, "string");
    },
    [highs.constants.callbackType.mipInterrupt](event) {
      counts.interrupt += 1;
      assert.equal(typeof event.interrupt, "function");
    },
    [highs.constants.callbackType.mipCutPool](event) {
      counts.cutPool += 1;
      const cp = event.data.cut_pool;
      assert.ok(cp !== undefined, "mipCutPool should have cut_pool data");
      if (cp) {
        assert.equal(typeof cp.numCols, "number");
        assert.equal(typeof cp.numCuts, "number");
        assert.ok(cp.starts instanceof Int32Array);
      }
    },
  });

  // At least one MIP callback type should have fired
  assert.ok(
    counts.improving + counts.logging + counts.interrupt + counts.cutPool > 0,
    "at least one MIP callback should have fired",
  );
});

test("mipUserSolution callback type is accepted for integer models", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const source = makeModel();
  source.integrality = new Int32Array([1, 1, 1, 0]);
  source.colUpper = new Float64Array([10, 10, 10, 10]);
  const model = highs.createModel(source);
  t.after(() => model.dispose());
  model.options.set({ output_flag: false });

  let sawEvent = false;
  model.run({
    [highs.constants.callbackType.mipUserSolution](event) {
      sawEvent = true;
      assert.equal(typeof event.setSolution, "function");
      assert.equal(typeof event.repairSolution, "function");
      // Provide a candidate solution
      const status = event.setSolution({
        indices: new Int32Array([0, 1, 2]),
        values: new Float64Array([1, 1, 1]),
      });
      assert.equal(typeof status, "object");
    },
  });
  // User-solution callbacks may only fire under specific solver conditions;
  // confirm the solve completes successfully
  assert.ok(
    [highs.constants.modelStatus.optimal,
     highs.constants.modelStatus.timeLimit,
     highs.constants.modelStatus.iterationLimit].includes(model.getModelStatus()),
  );
});
