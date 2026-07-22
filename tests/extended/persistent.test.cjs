const assert = require("node:assert/strict");
const test = require("node:test");
const { loadRuntime, makeModel, requireExtended } = require("./helpers.cjs");

test("persistent models own and idempotently dispose a native instance", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  assert.equal(model.disposed, false);
  assert.deepStrictEqual(model.getDimensions(), {
    numCols: 4,
    numRows: 2,
    numNonzeros: 4,
    hessianNonzeros: 0,
  });
  assert.ok([0, 1].includes(model.clearSolver().status));
  assert.ok([0, 1].includes(model.run().status));

  model.dispose();
  model.dispose();
  assert.equal(model.disposed, true);
  assert.throws(() => model.getDimensions(), /dispos/i);
});

test("typed-array inputs are validated before changing native state", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel();
  t.after(() => model.dispose());
  const invalid = makeModel();
  invalid.matrix.starts = new Int32Array([0, 1]);

  assert.throws(() => model.passModel(invalid), /start|length|matrix|dimension/i);
  assert.deepStrictEqual(model.getDimensions(), {
    numCols: 0,
    numRows: 0,
    numNonzeros: 0,
    hessianNonzeros: 0,
  });
});

test("model extraction returns detached JavaScript-owned typed arrays", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const source = makeModel();
  const model = highs.createModel(source);
  t.after(() => model.dispose());
  const first = model.getModel("csc");

  assert.ok(first.colCost instanceof Float64Array);
  assert.ok(first.colLower instanceof Float64Array);
  assert.ok(first.matrix.starts instanceof Int32Array);
  assert.ok(first.matrix.indices instanceof Int32Array);
  assert.ok(first.matrix.values instanceof Float64Array);
  assert.notStrictEqual(first.colCost.buffer, source.colCost.buffer);
  assert.notStrictEqual(first.matrix.values.buffer, source.matrix.values.buffer);
  if (highs.HEAPU8) {
    assert.notStrictEqual(first.colCost.buffer, highs.HEAPU8.buffer);
    assert.notStrictEqual(first.matrix.values.buffer, highs.HEAPU8.buffer);
  }

  source.colCost[0] = 999;
  first.colCost[1] = 888;
  first.matrix.values[0] = 777;
  const second = model.getModel("csc");
  assert.deepStrictEqual([...second.colCost], [10, 20, 30, 40]);
  assert.deepStrictEqual([...second.matrix.values], [1, 2, 3, 4]);
});

test("range, set, and mask selections are explicit and unambiguous", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;

  const model = highs.createModel(makeModel());
  t.after(() => model.dispose());

  const range = { kind: "range", from: 1, to: 2 };
  const set = { kind: "set", indices: new Int32Array([3, 0]) };
  const mask = { kind: "mask", mask: new Uint8Array([0, 1, 1, 0]) };

  assert.deepStrictEqual([...model.getCols(range).cost], [20, 30]);
  assert.deepStrictEqual([...model.getCols(set).cost], [40, 10]);
  assert.deepStrictEqual([...model.getCols(mask).cost], [20, 30]);

  model.changeColsCost(range, new Float64Array([21, 31]));
  model.changeColsCost(set, new Float64Array([41, 11]));
  model.changeColsCost(mask, new Float64Array([22, 32]));
  assert.deepStrictEqual([...model.getModel().colCost], [11, 22, 32, 41]);
});
