importScripts("../highs.js");

/** @typedef {import("../../types").Highs} Highs */
/** @typedef {import("../../types").Model} Model */
/** @typedef {import("../../types").ModelData} ModelData */
/** @typedef {import("../../types").SparseMatrixInput} SparseMatrixInput */
/** @typedef {import("../../types").RunResult} RunResult */
/** @typedef {import("../../types").ObjectiveSense} ObjectiveSense */
/** @typedef {import("../../types").VariableType} VariableType */

/** @type {Promise<Highs>} */
const runtimePromise = Module({
  locateFile: (file) => file === "highs.wasm" ? "../highs.wasm" : file,
});

/**
 * The demo flattens model and matrix fields, using readable constant keys in
 * messages so the worker performs the public numeric-constant translation.
 * @typedef {Pick<ModelData, "colCost" | "colLower" | "colUpper" | "rowLower" | "rowUpper"> & Pick<SparseMatrixInput, "starts" | "indices" | "values"> & {sense: keyof Highs["constants"]["objectiveSense"], integrality: Array<keyof Highs["constants"]["variableType"]>}} MipSolveRequest
 */

/**
 * The demo converts status and solution data into its flat display payload.
 * @typedef {Pick<RunResult, "status"> & {elapsed: string, modelStatus: string, objective: number, primal: number[], mipGap: number}} MipSolveResponse
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
 * Translates UI keys and enforces this demo action's MIP-only contract.
 *
 * @param {Highs["constants"]["variableType"]} variableTypes
 * @param {Array<keyof Highs["constants"]["variableType"]>} names
 * @returns {VariableType[]}
 */
function resolveIntegrality(variableTypes, names) {
  const integrality = names.map((name) => {
    const type = variableTypes[name];
    if (type === undefined) throw new TypeError(`Unknown variable type: ${name}`);
    return type;
  });
  if (integrality.every((type) => type === variableTypes.continuous)) {
    throw new TypeError("A mixed-integer model needs at least one non-continuous column.");
  }
  return integrality;
}

/**
 * Expands the demo's flattened CSC message into the nested public model input.
 *
 * @param {MipSolveRequest} data
 * @param {ObjectiveSense} sense
 * @param {VariableType[]} integrality
 * @returns {ModelData}
 */
function buildModelData(data, sense, integrality) {
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
    // Integer columns bounded by zero and one act as binary decisions.
    integrality,
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
 * Flattens an available incumbent into the demo's cloneable display payload.
 *
 * @param {Highs} highs
 * @param {Model} model
 * @param {RunResult} run
 * @returns {Omit<MipSolveResponse, "elapsed">}
 */
function readMipSolution(highs, model, run) {
  const modelStatus = describeModelStatus(highs.constants.modelStatus, run.modelStatus);
  const primalStatus = model.info.get("primal_solution_status");
  if (primalStatus !== highs.constants.solutionStatus.feasible) {
    throw new Error(`Solve ended with model status ${modelStatus}; no feasible MIP incumbent is available.`);
  }

  const solution = model.getSolution();
  return {
    status: run.status,
    modelStatus,
    objective: model.getObjectiveValue(),
    primal: Array.from(solution.colValue),
    mipGap: Number(model.info.get("mip_gap")),
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
 * @param {MipSolveRequest} data
 * @returns {Promise<MipSolveResponse>}
 */
async function mipSolve(data) {
  const highs = await runtimePromise;
  if (typeof highs.createModel !== "function") {
    throw new Error("This build does not include the extended API.");
  }

  const sense = resolveObjectiveSense(highs.constants.objectiveSense, data.sense);
  const integrality = resolveIntegrality(highs.constants.variableType, data.integrality);
  const modelData = buildModelData(data, sense, integrality);

  const model = highs.createModel();
  try {
    model.passModel(modelData);
    model.options.set("output_flag", false);

    const started = performance.now();
    const run = model.run();
    const elapsed = (performance.now() - started).toFixed(1);
    const result = readMipSolution(highs, model, run);

    return { elapsed, ...result };
  } finally {
    model.dispose();
  }
}

self.addEventListener("message", async ({ data }) => {
  const id = data?.id;
  if (data?.action !== "mipSolve") {
    self.postMessage({ id, error: `Unknown action: ${String(data?.action)}` });
    return;
  }
  try {
    self.postMessage({ id, ...(await mipSolve(data)) });
  } catch (error) {
    self.postMessage({ id, error: formatError(error) });
  }
});
