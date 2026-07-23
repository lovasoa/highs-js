const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");

let runtimePromise;

function loadRuntime() {
  if (!runtimePromise) {
    const loader = require(path.join(ROOT, "build/highs.js"));
    runtimePromise = loader({ print: () => {}, printErr: () => {} });
  }
  return runtimePromise;
}

function requireExtended(t, highs) {
  if (typeof highs.createModel !== "function" || !highs.raw) {
    throw new Error("the built artifact is missing the required extended API");
  }
  return true;
}

function makeModel() {
  return {
    numCols: 4,
    numRows: 2,
    sense: -1,
    offset: 0,
    colCost: new Float64Array([10, 20, 30, 40]),
    colLower: new Float64Array([0, 0, 0, 0]),
    colUpper: new Float64Array([10, 10, 10, 10]),
    rowLower: new Float64Array([-Infinity, -Infinity]),
    rowUpper: new Float64Array([5, 7]),
    matrix: {
      format: "csc",
      numRows: 2,
      numCols: 4,
      starts: new Int32Array([0, 1, 2, 4, 4]),
      indices: new Int32Array([0, 1, 0, 1]),
      values: new Float64Array([1, 2, 3, 4]),
    },
    colNames: ["a", "b", "c", "d"],
    rowNames: ["first", "second"],
    modelName: "extended-test-model",
  };
}

/**
 * Deeply compare two values. Floating-point numbers are compared with a
 * relative tolerance to accommodate platform- and version-dependent
 * differences in the last few decimal places.
 */
function assertDeepApprox(actual, expected, message, relTol, absTol) {
  const assert = require("node:assert");
  relTol = relTol ?? 1e-6;
  absTol = absTol ?? 1e-12;

  function _check(a, e, path) {
    if (typeof a !== typeof e) {
      assert.fail(
        `type mismatch at ${path}: ${typeof a} vs ${typeof e}`, a, e, message, "!=≈",
      );
    }
    if (typeof a === "number") {
      if (!Number.isFinite(a) && !Number.isFinite(e)) {
        // ±Infinity, NaN — must match exactly
        if (!Object.is(a, e)) {
          assert.fail(`non-finite mismatch at ${path}`, a, e, message, "!=≈");
        }
        return;
      }
      const denom = Math.max(1, Math.abs(a), Math.abs(e));
      const diff = Math.abs(a - e);
      if (diff > absTol && diff / denom > relTol) {
        assert.fail(
          `numerical mismatch at ${path}: ${a} ≠≈ ${e} (Δ=${diff}, rel=${diff / denom})`,
          a,
          e,
          message,
          "!=≈",
        );
      }
      return;
    }
    if (Array.isArray(a) && Array.isArray(e)) {
      assert.equal(a.length, e.length, `${message ?? ""} length mismatch at ${path}`);
      for (let i = 0; i < a.length; i += 1) _check(a[i], e[i], `${path}[${i}]`);
      return;
    }
    if (a !== null && e !== null && typeof a === "object") {
      const aKeys = Object.keys(a).sort();
      const eKeys = Object.keys(e).sort();
      assert.deepStrictEqual(aKeys, eKeys, `${message ?? ""} key mismatch at ${path}`);
      for (const key of aKeys) _check(a[key], e[key], `${path}.${key}`);
      return;
    }
    assert.strictEqual(a, e, `${message ?? ""} mismatch at ${path}`);
  }

  _check(actual, expected, "root");
}

module.exports = { ROOT, loadRuntime, makeModel, requireExtended, assertDeepApprox };
