importScripts("../highs.js");

const runtimePromise = Module({
  locateFile: (file) => `../${file}`,
});

let persistentModel;

function serializableSolution(solution) {
  return {
    colValue: Array.from(solution.colValue),
    rowValue: Array.from(solution.rowValue),
    colDual: Array.from(solution.colDual),
    rowDual: Array.from(solution.rowDual),
  };
}

self.addEventListener("message", async ({ data: { revision, problem } }) => {
  let mode = "Loading solver…";

  try {
    const highs = await runtimePromise;

    if (typeof highs.createModel !== "function") {
      mode = "Compatibility API (this build predates the extended API)";
      self.postMessage({
        revision,
        mode,
        result: highs.solve(problem, { output_flag: false }),
      });
      return;
    }

    mode = "Persistent Model API with detached typed-array results";
    persistentModel ||= highs.createModel();
    persistentModel.clearModel();
    persistentModel.readModel({ format: "lp", data: problem });
    persistentModel.options.set("output_flag", false);

    const run = persistentModel.run();
    const solution = persistentModel.getSolution();

    self.postMessage({
      revision,
      mode,
      result: {
        status: run.status,
        warnings: run.warnings,
        modelStatus: run.modelStatus,
        objectiveValue: persistentModel.getObjectiveValue(),
        solution: serializableSolution(solution),
      },
    });
  } catch (error) {
    self.postMessage({
      revision,
      mode,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    });
  }
});
