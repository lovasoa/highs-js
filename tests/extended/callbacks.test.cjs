const assert = require("node:assert/strict");
const test = require("node:test");
const { loadRuntime, makeModel, requireExtended } = require("./helpers.cjs");

test("callback controls cannot outlive their native callback frame", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  const logging = highs.constants.callbackType.logging;
  let savedEvent;

  model.run({
    [logging](event) {
      savedEvent ||= event;
      assert.throws(
        () => model.dispose(),
        (error) => error?.name === "HighsReentrancyError",
      );
    },
  });

  assert.ok(savedEvent, "the logging callback should run");
  assert.throws(
    () => savedEvent.interrupt(),
    (error) =>
      error?.name === "HighsValidationError" && /expire/.test(error.message),
  );
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
