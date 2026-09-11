importScripts("../highs.js");

const runtimePromise = Module({
  locateFile: (file) => file === "highs.wasm" ? "../highs.wasm" : file,
});

/** @typedef {import("../../types.d.ts").Highs} Highs */
/** @typedef {import("../../types.d.ts").ModelData} ModelData */
/** @typedef {import("../../types.d.ts").RunResult} RunResult */

const GRID_DEMAND = Object.freeze([45, 50, 58, 72, 86, 95, 90, 80, 70, 62, 54, 48]);
const CLEAN_CAPACITY = Object.freeze([28, 35, 52, 60, 48, 30, 22, 18, 20, 25, 30, 34]);
const SOURCE_NAMES = Object.freeze(["Clean", "Gas", "Imports", "Unserved"]);
const SOURCE_COSTS = Object.freeze([12, 65, 105, 0]);
const SOURCE_EMISSIONS = Object.freeze([0, 0.5, 0.18, 0]);

/**
 * @typedef {Object} GridRequest
 * @property {"lexicographic"|"blended"} mode
 * @property {number} gasCapacity
 * @property {number} carbonTolerance
 * @property {number} reliabilityWeight
 * @property {number} carbonWeight
 */

/**
 * @typedef {Object} GridProblem
 * @property {ModelData} modelData
 * @property {number} hours
 * @property {number[]} reliability
 * @property {number[]} carbon
 * @property {number[]} operatingCost
 */

/**
 * @param {Highs} highs
 * @param {RunResult["modelStatus"]} code
 */
function describeStatus(highs, code) {
  return Object.entries(highs.constants.modelStatus).find(([, value]) => value === code)?.[0] || `code ${code}`;
}

/**
 * Expands one coefficient per source into source-major hourly column order.
 *
 * @param {readonly number[]} sourceValues
 * @param {number} hours
 * @returns {number[]}
 */
function hourlyObjective(sourceValues, hours) {
  return sourceValues.flatMap((value) => new Array(hours).fill(value));
}

/**
 * Builds the complete grid model and policy vectors without touching HiGHS.
 * Each source owns one contiguous block of hourly columns.
 *
 * @param {GridRequest} data
 * @param {Highs} highs
 * @returns {GridProblem}
 */
function buildGridProblem(data, highs) {
  const hours = GRID_DEMAND.length;
  const numCols = SOURCE_NAMES.length * hours;
  const colUpper = SOURCE_NAMES.flatMap((_, source) => GRID_DEMAND.map((load, hour) => {
    if (source === 0) return CLEAN_CAPACITY[hour];
    if (source === 1) return Number(data.gasCapacity);
    if (source === 2) return 28;
    return load;
  }));

  return {
    hours,
    reliability: hourlyObjective([0, 0, 0, 1], hours),
    carbon: hourlyObjective(SOURCE_EMISSIONS, hours),
    operatingCost: hourlyObjective(SOURCE_COSTS, hours),
    modelData: {
      numCols,
      numRows: hours,
      sense: highs.constants.objectiveSense.minimize,
      colCost: new Array(numCols).fill(0),
      colLower: new Array(numCols).fill(0),
      colUpper,
      rowLower: GRID_DEMAND,
      rowUpper: GRID_DEMAND,
      matrix: {
        format: "csc",
        numRows: hours,
        numCols,
        starts: Array.from({ length: numCols + 1 }, (_, index) => index),
        indices: Array.from({ length: numCols }, (_, index) => index % hours),
        values: new Array(numCols).fill(1),
      },
    },
  };
}

/**
 * Converts a detached primal vector into the exact presentation data consumed
 * by the grid UI.
 *
 * @param {GridProblem} problem
 * @param {number[]} primal
 * @returns {{demand: readonly number[], cleanCapacity: readonly number[], sourceNames: readonly string[], dispatch: number[][], objectives: {unserved: number, emissions: number, cost: number}}}
 */
function aggregateGridResult(problem, primal) {
  const dot = (coefficients) => coefficients.reduce((sum, value, index) => sum + value * primal[index], 0);
  return {
    demand: GRID_DEMAND,
    cleanCapacity: CLEAN_CAPACITY,
    sourceNames: SOURCE_NAMES,
    dispatch: SOURCE_NAMES.map((_, source) => primal.slice(source * problem.hours, (source + 1) * problem.hours)),
    objectives: {
      unserved: dot(problem.reliability),
      emissions: dot(problem.carbon),
      cost: dot(problem.operatingCost),
    },
  };
}

/**
 * Owns and disposes the native model used for one grid dispatch.
 *
 * @param {Highs} highs
 * @param {GridRequest} data
 * @returns {{elapsed: string, modelStatus: string} & ReturnType<typeof aggregateGridResult>}
 */
function solveGrid(highs, data) {
  const problem = buildGridProblem(data, highs);
  const model = highs.createModel();
  try {
    model.passModel(problem.modelData);
    const lexicographic = data.mode === "lexicographic";
    model.options.set({ output_flag: false, blend_multi_objectives: !lexicographic });
    model.addLinearObjective({ coefficients: problem.reliability, weight: lexicographic ? 1 : Number(data.reliabilityWeight), priority: 300, absoluteTolerance: 0, relativeTolerance: 0, offset: 0 });
    model.addLinearObjective({ coefficients: problem.carbon, weight: lexicographic ? 1 : Number(data.carbonWeight), priority: 200, absoluteTolerance: Number(data.carbonTolerance), relativeTolerance: lexicographic ? -1 : 0, offset: 0 });
    model.addLinearObjective({ coefficients: problem.operatingCost, weight: 1, priority: 100, absoluteTolerance: 0, relativeTolerance: 0, offset: 0 });

    const startedAt = performance.now();
    const run = model.run();
    const elapsed = (performance.now() - startedAt).toFixed(1);
    const modelStatus = describeStatus(highs, run.modelStatus);
    const primalStatus = model.info.get("primal_solution_status");
    if (run.modelStatus !== highs.constants.modelStatus.optimal ||
        primalStatus !== highs.constants.solutionStatus.feasible) {
      throw new Error(`HiGHS ended with model status ${modelStatus} and no optimal primal solution`);
    }

    const primal = Array.from(model.getSolution().colValue);
    return { elapsed, modelStatus, ...aggregateGridResult(problem, primal) };
  } finally {
    model.dispose();
  }
}

self.addEventListener("message", async ({ data }) => {
  try {
    if (data.action !== "multiObjectiveGrid") throw new Error(`Unknown action: ${data.action}`);
    const highs = await runtimePromise;
    self.postMessage({ id: data.id, ...solveGrid(highs, data) });
  } catch (error) {
    self.postMessage({ id: data.id, error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) });
  }
});
