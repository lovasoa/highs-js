importScripts("../highs.js");

/** @typedef {import("../../types.d.ts").Highs} Highs */
/** @typedef {import("../../types.d.ts").Model} Model */
/** @typedef {import("../../types.d.ts").Solution} Solution */
/** @typedef {import("../../types.d.ts").Basis} Basis */
/** @typedef {import("../../types.d.ts").ModelStatusCode} ModelStatusCode */
/** @typedef {import("../../types.d.ts").RangingRecord} RangingRecord */
/** @typedef {import("../../types.d.ts").RangingResult} RangingResult */

/** @type {Promise<Highs>} */
const runtimePromise = Module({
  /** @param {string} file */
  locateFile: (file) => file === "highs.wasm" ? "../highs.wasm" : file,
});

/**
 * @typedef {{
 *   colNames: string[], rowNames: string[], colCost: number[],
 *   colLower: number[], colUpper: number[], rowLower: number[], rowUpper: number[]
 * }} ModelSnapshot
 */

/** @typedef {{[K in keyof RangingRecord]: number[]}} RangingRecordSnapshot */

/** @typedef {{[K in keyof Solution]: number[]}} SolutionSnapshot */

/** @typedef {{[K in keyof Basis]: number[]}} BasisSnapshot */

/**
 * @typedef {{modelStatus: string, elapsed: string, note: string}} RangingUnavailableResponse
 */

/**
 * @typedef {{
 *   modelStatus: string,
 *   elapsed: string,
 *   objective: number,
 *   sense: "maximize" | "minimize",
 *   model: ModelSnapshot,
 *   solution: SolutionSnapshot,
 *   basis: BasisSnapshot,
 *   ranging: {[K in keyof RangingResult]: RangingRecordSnapshot}
 * }} RangingSuccessResponse
 */

/** @param {ArrayLike<number> | null | undefined} value @returns {number[]} */
function arrayFrom(value) {
  return value ? Array.from(value) : [];
}

/** @param {Highs["constants"]["modelStatus"]} statuses @param {ModelStatusCode} code */
function describeStatus(statuses, code) {
  return Object.entries(statuses).find(([, value]) => value === code)?.[0] || `code ${code}`;
}

/**
 * Reads model-owned data and immediately detaches it into the response format.
 * Keeping native reads here makes the serializers below independent of model lifetime.
 *
 * @param {Model} model
 * @returns {ModelSnapshot}
 */
function readModelSnapshot(model) {
  const { numCols, numRows } = model.getDimensions();
  const columns = numCols ? model.getCols({ kind: "range", from: 0, to: numCols - 1 }) : { cost: [], lower: [], upper: [] };
  const rows = numRows ? model.getRows({ kind: "range", from: 0, to: numRows - 1 }) : { lower: [], upper: [] };
  return {
    colNames: Array.from({ length: numCols }, (_, index) => model.getColName(index) || `x${index}`),
    rowNames: Array.from({ length: numRows }, (_, index) => model.getRowName(index) || `r${index}`),
    colCost: arrayFrom(columns.cost),
    colLower: arrayFrom(columns.lower),
    colUpper: arrayFrom(columns.upper),
    rowLower: arrayFrom(rows.lower),
    rowUpper: arrayFrom(rows.upper),
  };
}

/** @param {Model} model @returns {SolutionSnapshot} */
function readSolutionSnapshot(model) {
  const solution = model.getSolution();
  return {
    colValue: arrayFrom(solution.colValue),
    rowValue: arrayFrom(solution.rowValue),
    colDual: arrayFrom(solution.colDual),
    rowDual: arrayFrom(solution.rowDual),
  };
}

/** @param {Model} model @returns {BasisSnapshot} */
function readBasisSnapshot(model) {
  const basis = model.getBasis();
  return {
    colStatus: arrayFrom(basis.colStatus),
    rowStatus: arrayFrom(basis.rowStatus),
  };
}

/**
 * Converts typed arrays to the plain arrays used by this demo's response.
 *
 * @param {RangingRecord} record
 * @returns {RangingRecordSnapshot}
 */
function serializeRangingRecord(record) {
  return {
    value: arrayFrom(record.value),
    objective: arrayFrom(record.objective),
    inVariable: arrayFrom(record.inVariable),
    outVariable: arrayFrom(record.outVariable),
  };
}

/**
 * @param {RangingResult} ranging
 * @returns {{[K in keyof RangingResult]: RangingRecordSnapshot}}
 */
function serializeRanging(ranging) {
  return {
    colCostDown: serializeRangingRecord(ranging.colCostDown),
    colCostUp: serializeRangingRecord(ranging.colCostUp),
    colBoundDown: serializeRangingRecord(ranging.colBoundDown),
    colBoundUp: serializeRangingRecord(ranging.colBoundUp),
    rowBoundDown: serializeRangingRecord(ranging.rowBoundDown),
    rowBoundUp: serializeRangingRecord(ranging.rowBoundUp),
  };
}

/**
 * @param {{problem: string}} request
 * @returns {Promise<RangingSuccessResponse | RangingUnavailableResponse | {error: string}>}
 */
async function doRanging({ problem }) {
  const highs = await runtimePromise;
  if (typeof highs.createModel !== "function") return { error: "This build does not include the extended API." };

  const model = highs.createModel({ format: "lp", data: problem });
  try {
    model.options.set("output_flag", false);
    const started = performance.now();
    const run = model.run();
    const elapsed = (performance.now() - started).toFixed(1);
    const modelStatus = describeStatus(highs.constants.modelStatus, run.modelStatus);

    if (run.modelStatus !== highs.constants.modelStatus.optimal) {
      return { modelStatus, elapsed, note: "Ranging is only available for optimal solutions." };
    }
    if (model.info.get("basis_validity") !== highs.constants.basisValidity.valid) {
      return { modelStatus, elapsed, note: "Ranging requires a valid optimal simplex basis." };
    }

    return {
      modelStatus,
      elapsed,
      objective: model.getObjectiveValue(),
      sense: model.getObjectiveSense() === highs.constants.objectiveSense.maximize ? "maximize" : "minimize",
      model: readModelSnapshot(model),
      solution: readSolutionSnapshot(model),
      basis: readBasisSnapshot(model),
      ranging: serializeRanging(model.getRanging()),
    };
  } finally {
    model.dispose();
  }
}

/** @param {unknown} error */
function errorMessage(error) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

self.addEventListener("message", async (/** @type {MessageEvent} */ { data }) => {
  const id = data?.id;
  try {
    if (data?.action !== "doRanging") {
      self.postMessage({ id, error: `Unknown action: ${data?.action}` });
      return;
    }
    self.postMessage({ id, ...await doRanging(data) });
  } catch (error) {
    self.postMessage({ id, error: errorMessage(error) });
  }
});
