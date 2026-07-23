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
