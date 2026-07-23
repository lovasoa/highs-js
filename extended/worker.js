importScripts("../highs.js");

const runtimePromise = Module({
  locateFile: (file) => `../${file}`,
});

let persistentModel;
let compatibilityProblem;

function serializableSolution(solution) {
  return {
    colValue: Array.from(solution.colValue),
    rowValue: Array.from(solution.rowValue),
    colDual: Array.from(solution.colDual),
    rowDual: Array.from(solution.rowDual),
  };
}

self.addEventListener("message", async ({ data }) => {
  const { revision, action } = data;
  let mode = "Loading solver…";

  try {
    const highs = await runtimePromise;

    if (typeof highs.createModel !== "function") {
      mode = "Compatibility API (this build predates the extended API)";
      if (action === "load") compatibilityProblem = data.problem;
      if (!compatibilityProblem) throw new Error("Load an LP model first");
      self.postMessage({
        revision,
        mode,
        result: highs.solve(compatibilityProblem, { output_flag: false }),
      });
      return;
    }

    if (action === "load") {
      persistentModel?.dispose();
      persistentModel = highs.createModel({
        format: "lp",
        data: data.problem,
      });
      persistentModel.options.set("output_flag", false);
    } else if (action === "mutate") {
      if (!persistentModel) throw new Error("Load an LP model first");
      if (!Number.isFinite(data.cost) || !Number.isFinite(data.upper)) {
        throw new TypeError("Cost and upper bound must be finite numbers");
      }
      persistentModel.changeColCost(0, data.cost);
      persistentModel.changeColBounds(0, 0, data.upper);
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    mode = "Persistent Model: retained handle, direct cost/bound mutation";
    const run = persistentModel.run();
    const solution = persistentModel.getSolution();
    const statusName =
      Object.entries(highs.constants.modelStatus).find(
        ([, value]) => value === run.modelStatus,
      )?.[0] || "unknown";

    const ranging =
      run.modelStatus === highs.constants.modelStatus.optimal
        ? persistentModel.getRanging()
        : undefined;

    self.postMessage({
      revision,
      mode,
      result: {
        status: run.status,
        warnings: run.warnings,
        modelStatus: { code: run.modelStatus, name: statusName },
        objectiveValue: persistentModel.getObjectiveValue(),
        solution: serializableSolution(solution),
        firstColumnCostRange: ranging
          ? {
              down: ranging.colCostDown.value[0],
              up: ranging.colCostUp.value[0],
            }
          : undefined,
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
