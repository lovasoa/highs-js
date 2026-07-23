const assert = require("node:assert/strict");
const test = require("node:test");
const {
  loadRuntime,
  makeModel,
  requireExtended,
} = require("./helpers.cjs");

test("options.names() lists every available HiGHS option", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel();
  t.after(() => model.dispose());

  const names = model.options.names();
  assert.ok(names.length > 50, "should list many options");
  assert.ok(names.includes("presolve"), "should include presolve");
  assert.ok(names.includes("time_limit"), "should include time_limit");
  assert.ok(names.includes("mip_rel_gap"), "should include mip_rel_gap");
});

test("options.reset() restores defaults", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel();
  t.after(() => model.dispose());

  const original = model.options.get("time_limit");
  model.options.set("time_limit", 999);
  assert.equal(model.options.get("time_limit"), 999);
  model.options.reset();
  assert.equal(model.options.get("time_limit"), original);
});

test("options.read() and options.export() use HiGHS option text format", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel();
  t.after(() => model.dispose());

  // Export current options (all defaults)
  const allOpts = model.options.export();
  assert.equal(typeof allOpts, "string");
  assert.ok(allOpts.length > 0, "options export should not be empty");

  // Export only deviations from default
  const devOpts = model.options.export(true);
  assert.equal(typeof devOpts, "string");

  // Set a non-default value and re-export
  model.options.set("time_limit", 42);
  const changed = model.options.export(true);
  assert.ok(changed.includes("time_limit"), "should include changed option");

  // Read options back from text
  const model2 = highs.createModel();
  t.after(() => model2.dispose());
  const readResult = model2.options.read("time_limit = 42");
  assert.ok(readResult.status !== -1, "options.read should succeed");
  assert.equal(model2.options.get("time_limit"), 42);
});

test("info.get() and info.type() expose solver statistics", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());
  model.options.set("output_flag", false);
  model.run();

  // Common info fields
  const simplexIterations = model.info.get("simplex_iteration_count");
  assert.equal(typeof simplexIterations, "number");
  assert.ok(simplexIterations >= 0);

  const mipNodeCount = model.info.get("mip_node_count");
  assert.equal(typeof mipNodeCount, "bigint");

  const objVal = model.info.get("objective_function_value");
  assert.equal(typeof objVal, "number");

  // Info type
  assert.equal(model.info.type("simplex_iteration_count"), "integer");
  assert.equal(model.info.type("mip_node_count"), "int64");
  assert.equal(model.info.type("objective_function_value"), "double");
});
