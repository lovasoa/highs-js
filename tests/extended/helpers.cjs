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
    t.skip("extended persistent/raw API is not present in this build");
    return false;
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

module.exports = { ROOT, loadRuntime, makeModel, requireExtended };
