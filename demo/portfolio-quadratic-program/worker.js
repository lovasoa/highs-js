importScripts("../highs.js");

const runtimePromise = Module({
  locateFile: (file) => file === "highs.wasm" ? "../highs.wasm" : file,
});

/** @typedef {import("../../types.d.ts").Highs} Highs */
/** @typedef {import("../../types.d.ts").HighsConstants} HighsConstants */
/** @typedef {import("../../types.d.ts").ModelData} ModelData */
/** @typedef {import("../../types.d.ts").HessianInput} HessianInput */
/** @typedef {import("../../types.d.ts").RunResult} RunResult */

/**
 * @typedef {Pick<ModelData, "colCost"|"colLower"|"colUpper"|"rowLower"|"rowUpper"> & {
 *   sense: keyof HighsConstants["objectiveSense"],
 *   starts: ModelData["matrix"]["starts"],
 *   indices: ModelData["matrix"]["indices"],
 *   values: ModelData["matrix"]["values"],
 *   hessian: HessianInput
 * }} QpSolveRequest
 */

/**
 * @typedef {Object} QpSolveResult
 * @property {string} elapsed
 * @property {string} modelStatus
 * @property {number} objective
 * @property {number[]} primal
 */

/**
 * @param {Highs} highs
 * @param {RunResult["modelStatus"]} code
 */
function describeStatus(highs, code) {
  return Object.entries(highs.constants.modelStatus).find(([, value]) => value === code)?.[0] || `code ${code}`;
}

/**
 * Converts the request payload into linear model data. The Hessian is
 * passed separately so the example keeps the two API steps visible.
 *
 * @param {QpSolveRequest} data
 * @param {Highs} highs
 * @returns {ModelData}
 */
function buildQpModelData(data, highs) {
  const numCols = data.colCost.length;
  const numRows = data.rowLower.length;
  return {
    numCols,
    numRows,
    sense: highs.constants.objectiveSense[data.sense],
    colCost: data.colCost,
    colLower: data.colLower,
    colUpper: data.colUpper,
    rowLower: data.rowLower,
    rowUpper: data.rowUpper,
    matrix: {
      format: "csc",
      numRows,
      numCols,
      starts: data.starts,
      indices: data.indices,
      values: data.values,
    },
  };
}

/**
 * Owns one native model for exactly one solve and copies all returned data
 * before disposing it.
 *
 * @param {Highs} highs
 * @param {QpSolveRequest} data
 * @returns {QpSolveResult}
 */
function solveQp(highs, data) {
  const model = highs.createModel();
  try {
    model.passModel(buildQpModelData(data, highs));
    model.passHessian(data.hessian);
    model.options.set("output_flag", false);

    const startedAt = performance.now();
    const run = model.run();
    const elapsed = (performance.now() - startedAt).toFixed(1);
    const modelStatus = describeStatus(highs, run.modelStatus);
    const primalStatus = model.info.get("primal_solution_status");
    if (run.modelStatus !== highs.constants.modelStatus.optimal ||
        primalStatus !== highs.constants.solutionStatus.feasible) {
      throw new Error(`HiGHS ended with model status ${modelStatus} and no optimal primal solution`);
    }

    return {
      elapsed,
      modelStatus,
      objective: model.getObjectiveValue(),
      primal: Array.from(model.getSolution().colValue),
    };
  } finally {
    model.dispose();
  }
}

self.addEventListener("message", async ({ data }) => {
  try {
    if (data.action !== "qpSolve") throw new Error(`Unknown action: ${data.action}`);
    const highs = await runtimePromise;
    self.postMessage({ id: data.id, ...solveQp(highs, data) });
  } catch (error) {
    self.postMessage({ id: data.id, error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) });
  }
});
