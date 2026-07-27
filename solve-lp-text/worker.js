importScripts("../highs.js");

/** @typedef {import("../../types").Highs} Highs */
/** @typedef {import("../../types").LegacyHighsSolution} LegacyHighsSolution */

/** @type {Promise<Highs>} */
const runtimePromise = Module({
  locateFile: (file) => file === "highs.wasm" ? "../highs.wasm" : file,
});

/**
 * Worker message for the one-shot text demo.
 * @typedef {{problem: Parameters<Highs["solve"]>[0]}} SolveLPRequest
 */

/**
 * Worker response adds display timing to the detached public result.
 * @typedef {{elapsed: string, result: LegacyHighsSolution}} SolveLPResponse
 */

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
 * Times the complete one-shot operation for display in this demo.
 *
 * @param {SolveLPRequest} message
 * @returns {Promise<SolveLPResponse>}
 */
async function solveLP(message) {
  const highs = await runtimePromise;
  const started = performance.now();

  const result = highs.solve(message.problem, { output_flag: false });

  return {
    elapsed: (performance.now() - started).toFixed(1),
    // postMessage's structured clone preserves Infinity in model bounds.
    result,
  };
}

self.addEventListener("message", async ({ data }) => {
  const id = data?.id;
  if (data?.action !== "solveLP") {
    self.postMessage({ id, error: `Unknown action: ${String(data?.action)}` });
    return;
  }

  try {
    self.postMessage({ id, ...(await solveLP(data)) });
  } catch (error) {
    self.postMessage({
      id,
      error: formatError(error),
    });
  }
});
