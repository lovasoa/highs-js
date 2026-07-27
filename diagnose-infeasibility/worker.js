importScripts("../highs.js");

/** @typedef {import("../../types.d.ts").Highs} Highs */
/** @typedef {import("../../types.d.ts").Model} Model */
/** @typedef {import("../../types.d.ts").ModelStatusCode} ModelStatusCode */
/** @typedef {import("../../types.d.ts").IisResult} IisResult */

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

/**
 * @typedef {{
 *   colIndices: number[], rowIndices: number[], colBoundCodes: number[], rowBoundCodes: number[],
 *   colBounds: string[], rowBounds: string[], colStatus: number[], rowStatus: number[]
 * } & ModelSnapshot} IisSnapshot
 */

/**
 * @typedef {{modelStatus: string, elapsed: string, iis: IisSnapshot}} IisSuccessResponse
 */

/**
 * @typedef {{
 *   modelStatus: string, objective: number | undefined, primal: number[] | undefined,
 *   note: string, elapsed: string
 * }} IisUnavailableResponse
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
 * Produces the short bound labels displayed by this demo.
 *
 * @param {Highs["constants"]["iis"]} iisConstants
 * @param {number} code
 */
function describeIisBound(iisConstants, code) {
  const name = Object.entries(iisConstants).find(
    ([key, value]) => key.startsWith("bound") && value === code,
  )?.[0];
  return name ? name.slice("bound".length).toLowerCase() : `code ${code}`;
}

/**
 * Reads model-owned names and bounds before the model is disposed.
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

/**
 * Converts typed arrays to plain arrays and adds model context and display labels.
 *
 * @param {IisResult} iis
 * @param {ModelSnapshot} modelSnapshot
 * @param {Highs["constants"]["iis"]} iisConstants
 * @returns {IisSnapshot}
 */
function serializeIis(iis, modelSnapshot, iisConstants) {
  const colBoundCodes = arrayFrom(iis.colBound);
  const rowBoundCodes = arrayFrom(iis.rowBound);
  return {
    ...modelSnapshot,
    colIndices: arrayFrom(iis.colIndex),
    rowIndices: arrayFrom(iis.rowIndex),
    colBoundCodes,
    rowBoundCodes,
    colBounds: colBoundCodes.map((code) => describeIisBound(iisConstants, code)),
    rowBounds: rowBoundCodes.map((code) => describeIisBound(iisConstants, code)),
    colStatus: arrayFrom(iis.colStatus),
    rowStatus: arrayFrom(iis.rowStatus),
  };
}

/**
 * Builds the established no-IIS response without dropping its explicit
 * `undefined` objective and primal properties.
 *
 * @param {Highs} highs
 * @param {Model} model
 * @param {ModelStatusCode} modelStatusCode
 * @param {string} elapsed
 * @returns {IisUnavailableResponse}
 */
function unavailableResponse(highs, model, modelStatusCode, elapsed) {
  const hasSolution = modelStatusCode === highs.constants.modelStatus.optimal;
  return {
    modelStatus: describeStatus(highs.constants.modelStatus, modelStatusCode),
    objective: hasSolution ? model.getObjectiveValue() : undefined,
    primal: hasSolution ? arrayFrom(model.getSolution().colValue) : undefined,
    note: hasSolution || modelStatusCode === highs.constants.modelStatus.unbounded
      ? "The model is feasible, so there is no conflict to isolate."
      : "Infeasibility was not proved, so no IIS was requested.",
    elapsed,
  };
}

/**
 * @param {{problem: string}} request
 * @returns {Promise<IisSuccessResponse | IisUnavailableResponse | {error: string}>}
 */
async function doIis({ problem }) {
  const highs = await runtimePromise;
  if (typeof highs.createModel !== "function") return { error: "This build does not include the extended API." };

  const model = highs.createModel({ format: "lp", data: problem });
  try {
    model.options.set("output_flag", false);
    model.options.set("iis_strategy", highs.constants.iis.strategyColPriority);
    const started = performance.now();
    const run = model.run();

    if (run.modelStatus !== highs.constants.modelStatus.infeasible) {
      return unavailableResponse(highs, model, run.modelStatus, (performance.now() - started).toFixed(1));
    }

    const iis = model.getIis();
    return {
      modelStatus: describeStatus(highs.constants.modelStatus, run.modelStatus),
      elapsed: (performance.now() - started).toFixed(1),
      iis: serializeIis(iis, readModelSnapshot(model), highs.constants.iis),
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
    if (data?.action !== "doIis") {
      self.postMessage({ id, error: `Unknown action: ${data?.action}` });
      return;
    }
    self.postMessage({ id, ...await doIis(data) });
  } catch (error) {
    self.postMessage({ id, error: errorMessage(error) });
  }
});
