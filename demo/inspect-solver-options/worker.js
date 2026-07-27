importScripts("../highs.js");

/** @typedef {import("../../types.d.ts").Highs} Highs */
/** @typedef {import("../../types.d.ts").Model} Model */
/** @typedef {import("../../types.d.ts").OptionDescriptor} OptionDescriptor */
/** @typedef {import("../../types.d.ts").OptionValue} OptionValue */

/** @type {Promise<Highs>} */
const runtimePromise = Module({
  locateFile: (file) => file === "highs.wasm" ? "../highs.wasm" : file,
});

/** @type {Model|undefined} */
let model;

/**
 * Returns the one model owned by this Worker, creating it on first use.
 * Terminating the Worker releases both this model and its Wasm runtime.
 *
 * @returns {Promise<Model>}
 */
async function getModel() {
  const highs = await runtimePromise;
  if (typeof highs.createModel !== "function") {
    throw new Error("This build does not include the extended API.");
  }
  model ||= highs.createModel();
  return model;
}

/**
 * UI wire form of an option descriptor, with shortened bound keys.
 *
 * @typedef {Pick<OptionDescriptor, "name"|"type"|"current"|"default"> & {
 *   min: OptionDescriptor["minimum"],
 *   max: OptionDescriptor["maximum"]
 * }} OptionRow
 */

/**
 * @typedef {Object} WorkerRequest
 * @property {number} id Correlation ID echoed in the response.
 * @property {string} action One of the keys in `handlers`.
 * @property {OptionDescriptor["name"]} [name] Option selected by the UI.
 * @property {OptionValue} [value] Value submitted by the UI.
 */

/**
 * Renames descriptor bounds for the UI wire contract. Structured cloning
 * preserves non-finite bounds.
 *
 * @param {OptionDescriptor} descriptor
 * @returns {OptionRow}
 */
function serializeDescriptor(descriptor) {
  return {
    name: descriptor.name,
    type: descriptor.type,
    current: descriptor.current,
    default: descriptor.default,
    min: descriptor.minimum,
    max: descriptor.maximum,
  };
}

async function optionsList() {
  const currentModel = await getModel();
  const rows = currentModel.options.names().map((name) =>
    serializeDescriptor(currentModel.options.describe(name))
  );
  return { rows };
}

async function optionsDescribe({ name }) {
  return serializeDescriptor((await getModel()).options.describe(name));
}

async function optionsSet({ name, value }) {
  const currentModel = await getModel();
  currentModel.options.set(name, value);
  return serializeDescriptor(currentModel.options.describe(name));
}

async function optionsReset() {
  (await getModel()).options.reset();
  return { ok: true };
}

const handlers = { optionsList, optionsDescribe, optionsSet, optionsReset };

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
