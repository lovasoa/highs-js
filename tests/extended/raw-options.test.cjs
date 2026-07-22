const assert = require("node:assert/strict");
const test = require("node:test");
const { loadRuntime, makeModel, requireExtended } = require("./helpers.cjs");

test("raw methods preserve exact C status values without throwing", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.raw.createModel();
  t.after(() => model.dispose());

  const accepted = model.passModel(makeModel());
  assert.ok([-1, 0, 1].includes(accepted.status));
  assert.notEqual(accepted.status, -1);

  const rejected = model.changeColCost(999, 1);
  assert.deepStrictEqual(rejected, { status: -1 });

  const missing = model.getOptionValue("__not_a_highs_option__");
  assert.equal(missing.status, -1);
  assert.equal(Object.hasOwn(missing, "value"), false);
});

test("new option APIs reject thread, concurrency, and filesystem options", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel();
  t.after(() => model.dispose());
  const forbidden = [
    ["threads", 1],
    ["parallel", "off"],
    ["simplex_max_concurrency", 1],
    ["log_file", "highs.log"],
    ["solution_file", "solution.sol"],
    ["write_model_file", "model.mps"],
  ];

  for (const [name, value] of forbidden) {
    assert.throws(
      () => model.options.set(name, value),
      (error) =>
        error?.name === "HighsUnsupportedOptionError" ||
        /unsupported|forbidden|not available/i.test(String(error?.message)),
      `${name} must be rejected by the persistent API`,
    );
    assert.deepStrictEqual(model.raw.setOptionValue(name, value), { status: -1 });
    assert.deepStrictEqual(model.raw.getOptionValue(name), { status: -1 });
  }
});

test("numeric option descriptors preserve native min, max, and default order", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel();
  t.after(() => model.dispose());

  const descriptor = model.options.describe("mip_rel_gap");
  assert.equal(descriptor.type, "double");
  assert.equal(descriptor.current, 1e-4);
  assert.equal(descriptor.minimum, 0);
  assert.equal(descriptor.maximum, Infinity);
  assert.equal(descriptor.default, 1e-4);
});
