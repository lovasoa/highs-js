importScripts("../highs.js");

/** @typedef {import("../../types").Highs} Highs */
/** @typedef {import("../../types").Model} Model */
/** @typedef {import("../../types").ModelData} ModelData */
/** @typedef {import("../../types").SparseMatrixInput} SparseMatrixInput */
/** @typedef {import("../../types").RunResult} RunResult */
/** @typedef {import("../../types").ObjectiveSense} ObjectiveSense */

/** @type {Promise<Highs>} */
const runtimePromise = Module({
  locateFile: (file) => file === "highs.wasm" ? "../highs.wasm" : file,
});

/**
 * The demo flattens the model vectors and sparse matrix into one worker message,
 * and sends the objective-sense key rather than its numeric encoding.
 * @typedef {Pick<ModelData, "colCost" | "colLower" | "colUpper" | "rowLower" | "rowUpper"> & Pick<SparseMatrixInput, "starts" | "indices" | "values"> & {sense: keyof Highs["constants"]["objectiveSense"]}} BuildSolveRequest
 */

/**
 * The demo converts the status code and typed solution snapshots for display.
 * @typedef {Pick<RunResult, "status"> & {elapsed: string, modelStatus: string, objective: number, primal: number[], dual: number[]}} BuildSolveResponse
 */

/**
 * Translates the UI's readable key at the worker boundary.
 *
 * @param {Highs["constants"]["objectiveSense"]} objectiveSenses
 * @param {keyof Highs["constants"]["objectiveSense"]} name
 * @returns {ObjectiveSense}
 */
function resolveObjectiveSense(objectiveSenses, name) {
  const sense = objectiveSenses[name];
  if (sense === undefined) throw new TypeError(`Unknown objective sense: ${name}`);
  return sense;
}

/**
 * Expands the demo's flattened CSC message into the nested public model input.
 *
 * @param {BuildSolveRequest} data
 * @param {ObjectiveSense} sense
 * @returns {ModelData}
 */
function buildModelData(data, sense) {
  const numCols = data.colCost.length;
  const numRows = data.rowLower.length;
  return {
    numCols,
    numRows,
    sense,
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
 * Converts the numeric status to the label shown by this demo.
 *
 * @param {Highs["constants"]["modelStatus"]} modelStatuses
 * @param {RunResult["modelStatus"]} code
 * @returns {string}
 */
function describeModelStatus(modelStatuses, code) {
  return Object.entries(modelStatuses)
    .find(([, value]) => value === code)?.[0] || `code ${code}`;
}

/**
 * Flattens the available solution snapshots into cloneable display arrays.
 *
 * @param {Highs} highs
 * @param {Model} model
 * @param {RunResult} run
 * @returns {Omit<BuildSolveResponse, "elapsed">}
 */
function readLinearSolution(highs, model, run) {
  const modelStatus = describeModelStatus(highs.constants.modelStatus, run.modelStatus);
  const feasible = highs.constants.solutionStatus.feasible;
  const primalStatus = model.info.get("primal_solution_status");
  if (primalStatus !== feasible) {
    throw new Error(`Solve ended with model status ${modelStatus}; no feasible primal solution is available.`);
  }

  const dualStatus = model.info.get("dual_solution_status");
  if (dualStatus !== feasible) {
    throw new Error(`Solve ended with model status ${modelStatus}; no feasible dual solution is available.`);
  }

  const solution = model.getSolution();
  return {
    status: run.status,
    modelStatus,
    objective: model.getObjectiveValue(),
    primal: Array.from(solution.colValue),
    dual: Array.from(solution.colDual),
  };
}

/**
 * Converts any thrown value into a stable message for the worker error response.
 * This helper is pure and does not expose non-cloneable error objects.
 *
 * @param {unknown} error
 * @returns {string}
 */
function formatError(error) {
  if (error instanceof Error) {
    return `${error.name || "Error"}: ${error.message}`;
  }
  try {
    return String(error);
  } catch {
    return "Unknown error";
  }
}

/**
 * Uses one model per message and measures only the blocking run for the demo UI.
 *
 * @param {BuildSolveRequest} data
 * @returns {Promise<BuildSolveResponse>}
 */
async function buildSolve(data) {
  const highs = await runtimePromise;
  if (typeof highs.createModel !== "function") {
    throw new Error("This build does not include the extended API.");
  }

  const sense = resolveObjectiveSense(highs.constants.objectiveSense, data.sense);
  const modelData = buildModelData(data, sense);

  const model = highs.createModel();
  try {
    model.passModel(modelData);
    model.options.set("output_flag", false);

    const started = performance.now();
    const run = model.run();
    const elapsed = (performance.now() - started).toFixed(1);
    const result = readLinearSolution(highs, model, run);

    return { elapsed, ...result };
  } finally {
    model.dispose();
  }
}

self.addEventListener("message", async ({ data }) => {
  const id = data?.id;
  if (data?.action !== "buildSolve") {
    self.postMessage({ id, error: `Unknown action: ${String(data?.action)}` });
    return;
  }
  try {
    self.postMessage({ id, ...(await buildSolve(data)) });
  } catch (error) {
    self.postMessage({ id, error: formatError(error) });
  }
});
