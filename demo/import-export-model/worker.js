importScripts("../highs.js");

/** @typedef {import("../../types.d.ts").EncodedModel} EncodedModel */
/** @typedef {import("../../types.d.ts").Highs} Highs */
/** @typedef {import("../../types.d.ts").Model} Model */
/** @typedef {import("../../types.d.ts").RunResult} RunResult */
/** @typedef {import("../../types.d.ts").Solution} Solution */

/** @type {Promise<Highs>} */
const runtimePromise = Module({
  locateFile: (file) => file === "highs.wasm" ? "../highs.wasm" : file,
});

/** @type {Model|undefined} */
let model;

/**
 * @typedef {Object} WorkerRequest
 * @property {number} id Correlation ID echoed in the response.
 * @property {string} action One of the keys in `handlers`.
 * @property {Extract<EncodedModel["data"], string>} [problem] LP text submitted by the editor.
 */

/**
 * @typedef {Object} SolveResponse
 * @property {RunResult["status"]} status
 * @property {string} modelStatus Model-status name serialized for display.
 * @property {number|null} objective `null` when the UI has no feasible primal to display.
 * @property {number[]} primal Plain-array wire copy, empty when unavailable.
 * @property {string} elapsed Elapsed milliseconds formatted for the demo UI.
 */

/**
 * Copies a typed solution vector into the plain-array wire format.
 *
 * @param {Solution["colValue"]|undefined} value
 * @returns {number[]}
 */
function arrayFrom(value) {
  return value ? Array.from(value) : [];
}

/**
 * Maps model-status codes to the UI's stable display string. Unknown future
 * codes remain visible instead of being mislabeled.
 *
 * @param {Highs} highs
 * @param {RunResult["modelStatus"]} code
 * @returns {string}
 */
function describeStatus(highs, code) {
  return Object.entries(highs.constants.modelStatus).find(([, value]) => value === code)?.[0] || `code ${code}`;
}

/**
 * Makes a fully constructed model current, then releases the previous handle.
 * Publishing first keeps replacement atomic even if disposal later changes to
 * report an error.
 *
 * @param {Model} replacement
 */
function replaceModel(replacement) {
  const previous = model;
  model = replacement;
  previous?.dispose();
}

/** @returns {Model} The live model owned by this Worker. */
function requireModel() {
  if (!model) throw new Error("Load a model first.");
  return model;
}

async function ioLoad({ problem }) {
  const highs = await runtimePromise;
  if (typeof highs.createModel !== "function") {
    throw new Error("This build does not include the extended API.");
  }

  // Parse before replacing the old handle so an invalid edit does not lose it.
  const replacement = highs.createModel({ format: "lp", data: problem });
  replaceModel(replacement);
  return { message: "Model loaded successfully." };
}

async function ioExport() {
  return { lp: requireModel().exportModel("lp") };
}

/** @returns {Promise<SolveResponse>} */
async function ioSolve() {
  const currentModel = requireModel();
  const highs = await runtimePromise;
  currentModel.options.set("output_flag", false);
  const started = performance.now();
  const run = currentModel.run();
  const hasPrimal = currentModel.info.get("primal_solution_status") === highs.constants.solutionStatus.feasible;
  return {
    status: run.status,
    modelStatus: describeStatus(highs, run.modelStatus),
    objective: hasPrimal ? currentModel.getObjectiveValue() : null,
    primal: hasPrimal ? arrayFrom(currentModel.getSolution().colValue) : [],
    elapsed: (performance.now() - started).toFixed(1),
  };
}

const handlers = { ioLoad, ioExport, ioSolve };

/** @param {unknown} error */
function formatError(error) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/**
 * Validates and executes one request while preserving the `{id, ...result}`
 * response contract used by the demo Worker client.
 *
 * @param {unknown} data
 */
async function handleRequest(data) {
  let id;
  try {
    if (!data || typeof data !== "object") {
      throw new TypeError("Worker request must be an object.");
    }
    id = data.id;
    if (typeof data.action !== "string") {
      throw new TypeError("Worker request action must be a string.");
    }
    const handler = Object.hasOwn(handlers, data.action) ? handlers[data.action] : undefined;
    if (!handler) {
      self.postMessage({ id, error: `Unknown action: ${data.action}` });
      return;
    }
    self.postMessage({ id, ...await handler(data) });
  } catch (error) {
    self.postMessage({ id, error: formatError(error) });
  }
}

self.addEventListener("message", async ({ data }) => {
  await handleRequest(data);
});
