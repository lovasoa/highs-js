const assert = require("node:assert/strict");
const test = require("node:test");
const { loadRuntime } = require("./helpers.cjs");

const PROBLEM = `Maximize
 obj: x
Subject To
 c: x <= 2
Bounds
 0 <= x
End`;

const EXPECTED = {
  Status: "Optimal",
  Columns: {
    x: {
      Index: 0,
      Status: "BS",
      Lower: 0,
      Upper: Infinity,
      Primal: 2,
      Dual: -0,
      Name: "x",
      Type: "Continuous",
    },
  },
  Rows: [
    {
      Index: 0,
      Status: "UB",
      Lower: -Infinity,
      Upper: 2,
      Primal: 2,
      Dual: 1,
      Name: "c",
    },
  ],
  ObjectiveValue: 2,
};

test("legacy solve keeps its exact result shape", async () => {
  const highs = await loadRuntime();
  assert.deepStrictEqual(highs.solve(PROBLEM), EXPECTED);
});

test("legacy thread option inputs remain accepted for compatibility", async () => {
  const highs = await loadRuntime();
  assert.deepStrictEqual(
    highs.solve(PROBLEM, { threads: 1, parallel: "off" }),
    EXPECTED,
  );
});
