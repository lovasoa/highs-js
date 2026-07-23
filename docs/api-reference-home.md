# highs-js API reference

TypeScript declarations for the HiGHS WebAssembly runtime. Initialization is asynchronous; model operations and solves are synchronous. Browser applications should run non-trivial solves in a Web Worker.

## API surfaces

| Surface | Entry point | Use when |
| --- | --- | --- |
| Legacy one-shot API | <a href="#" data-api-link="types/LegacyHighs.html"><code>highs.solve()</code></a> | The model already exists as CPLEX LP text and no solver state must persist. |
| Persistent API | <a href="#" data-api-link="interfaces/Model.html"><code>highs.createModel()</code> / <code>Model</code></a> | Building typed models, changing data, solving repeatedly, callbacks, basis access, ranging, IIS, or model I/O. |
| Raw API | <a href="#" data-api-link="interfaces/RawRuntimeApi.html"><code>highs.raw</code></a> | Native HiGHS status codes are required instead of exceptions. Inputs are still validated and copied. |

Search covers every exported method, property, type, constant, and enum. Start with <a href="#" data-api-link="types/Highs.html"><code>Highs</code></a>, <a href="#" data-api-link="interfaces/Model.html"><code>Model</code></a>, and <a href="#" data-api-link="interfaces/ModelData.html"><code>ModelData</code></a>.

## Persistent MILP example

This capacitated facility-location model chooses which facilities to open and routes customer demand through the open sites. It combines binary and continuous variables, named sparse model data, options, MIP callbacks, solve information, serialization, mutation, and repeated solves.

<div id="facility-example"></div>

```ts
import loadHighs from "highs";

const highs = await loadHighs();
const { minimize } = highs.constants.objectiveSense;
const { continuous, integer } = highs.constants.variableType;

// x0..x1 open facilities; x2..x7 ship from two facilities to three customers.
const model = highs.createModel({
  modelName: "facility-location",
  numCols: 8,
  numRows: 5,
  sense: minimize,
  colCost: [500, 300, 2, 4, 5, 3, 1, 3],
  colLower: [0, 0, 0, 0, 0, 0, 0, 0],
  colUpper: [1, 1, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity],
  rowLower: [80, 60, 40, -Infinity, -Infinity],
  rowUpper: [80, 60, 40, 0, 0],
  integrality: [integer, integer, continuous, continuous, continuous, continuous, continuous, continuous],
  colNames: ["open-north", "open-south", "n-a", "n-b", "n-c", "s-a", "s-b", "s-c"],
  rowNames: ["demand-a", "demand-b", "demand-c", "north-capacity", "south-capacity"],
  matrix: {
    format: "csc",
    numRows: 5,
    numCols: 8,
    starts: [0, 1, 2, 4, 6, 8, 10, 12, 14],
    indices: [3, 4, 0, 3, 1, 3, 2, 3, 0, 4, 1, 4, 2, 4],
    values: [-200, -200, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
});

try {
  model.options.set({ output_flag: false, mip_rel_gap: 1e-4 });

  const progress = [];
  const firstRun = model.run({
    [highs.constants.callbackType.mipLogging](event) {
      progress.push({
        nodes: event.data.mip_node_count,
        gap: event.data.mip_gap,
      });
      return undefined;
    },
  });

  const firstSolution = model.getSolution();
  const firstPlan = Array.from(firstSolution.colValue, (value, index) => ({
    variable: model.getColName(index),
    value,
  }));

  console.log({
    status: firstRun.modelStatus,
    objective: model.getObjectiveValue(),
    nodes: model.info.get("mip_node_count"),
    dimensions: model.getDimensions(),
    lp: model.exportModel("lp"),
    progress,
    firstPlan,
  });

  // Reuse the native model for a scenario where the south facility is cheaper.
  model.changeColCost(1, 250);
  const secondRun = model.run();
  const secondSolution = model.getSolution();
  console.log(secondRun.modelStatus, secondSolution.colValue);
} finally {
  model.dispose();
}
```

### What the example exercises

| Feature | Reference | Detail |
| --- | --- | --- |
| Typed model construction | <a href="#" data-api-link="interfaces/ModelData.html"><code>ModelData</code></a> | Exact array dimensions, objective sense, names, integrality, and bounds are validated before native entry. |
| Sparse constraints | <a href="#" data-api-link="interfaces/SparseMatrixInput.html"><code>SparseMatrixInput</code></a> | `starts`, `indices`, and `values` use zero-based compressed sparse column storage. |
| Solver configuration | <a href="#" data-api-link="interfaces/OptionStore.html"><code>OptionStore.set()</code></a> | Option names are exact HiGHS snake_case names; the persistent wrapper rejects unsupported thread and path options. |
| Progress callbacks | <a href="#" data-api-link="types/HighsCallbackMap.html"><code>HighsCallbackMap</code></a> | Callbacks run synchronously inside `run()`; callback controls expire when the handler returns. |
| Repeated scenarios | <a href="#" data-api-link="interfaces/Model.html#changecolcost"><code>Model.changeColCost()</code></a> | Mutate the existing native model and solve again without rebuilding the sparse matrix. |
| Ownership | <a href="#" data-api-link="interfaces/Model.html#dispose"><code>Model.dispose()</code></a> | Persistent models own native memory and should be disposed in `finally`. |

## Reference map

- **Model data:** <a href="#" data-api-link="interfaces/ModelData.html"><code>ModelData</code></a>, <a href="#" data-api-link="interfaces/HessianInput.html"><code>HessianInput</code></a>, <a href="#" data-api-link="types/IndexSelection.html"><code>IndexSelection</code></a>
- **Solving and results:** <a href="#" data-api-link="interfaces/Model.html#run"><code>Model.run()</code></a>, <a href="#" data-api-link="interfaces/Solution.html"><code>Solution</code></a>, <a href="#" data-api-link="types/ModelStatusCode.html"><code>ModelStatusCode</code></a>
- **Advanced analysis:** <a href="#" data-api-link="interfaces/RangingResult.html"><code>RangingResult</code></a>, <a href="#" data-api-link="interfaces/IisResult.html"><code>IisResult</code></a>, <a href="#" data-api-link="interfaces/Basis.html"><code>Basis</code></a>
- **Configuration and diagnostics:** <a href="#" data-api-link="interfaces/OptionStore.html"><code>OptionStore</code></a>, <a href="#" data-api-link="interfaces/InfoStore.html"><code>InfoStore</code></a>, <a href="#" data-api-link="interfaces/HighsConstants.html"><code>HighsConstants</code></a>
- **Lower-level access:** <a href="#" data-api-link="interfaces/RawRuntimeApi.html"><code>RawRuntimeApi</code></a>, <a href="#" data-api-link="interfaces/RawModelApi.html"><code>RawModelApi</code></a>
