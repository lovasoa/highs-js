const assert = require("node:assert/strict");
const test = require("node:test");
const { loadRuntime, assertDeepApprox } = require("./helpers.cjs");

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
  assertDeepApprox(highs.solve(PROBLEM), EXPECTED);
});

test("legacy thread option inputs remain accepted for compatibility", async () => {
  const highs = await loadRuntime();
  assertDeepApprox(
    highs.solve(PROBLEM, { threads: 1, parallel: "off" }),
    EXPECTED,
  );
});

test("legacy numeric options use their native integer or double setter", async () => {
  const highs = await loadRuntime();
  assertDeepApprox(
    highs.solve(PROBLEM, { mip_max_nodes: 10, time_limit: 1 }),
    EXPECTED,
  );
  assert.throws(
    () => highs.solve(PROBLEM, { mip_max_nodes: 1.5 }),
    /Unable to set option 'mip_max_nodes'/,
  );
});

test("legacy solve cleans up after a failed option update", async () => {
  const highs = await loadRuntime();
  assert.throws(
    () => highs.solve(PROBLEM, { option_that_does_not_exist: 1 }),
    /Unable to set option 'option_that_does_not_exist'/,
  );
  assertDeepApprox(highs.solve(PROBLEM), EXPECTED);
});
