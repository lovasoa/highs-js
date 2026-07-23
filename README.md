# highs-js

[![npm version](https://badge.fury.io/js/highs.svg)](https://www.npmjs.com/package/highs)
[![CI status](https://github.com/lovasoa/highs-js/actions/workflows/CI.yml/badge.svg)](https://github.com/lovasoa/highs-js/actions/workflows/CI.yml)
[![package size](https://badgen.net/bundlephobia/minzip/highs)](https://bundlephobia.com/result?p=highs)

highs-js brings the [HiGHS](https://highs.dev/) linear, mixed-integer, and
quadratic optimization solver to JavaScript and WebAssembly. It works in Node.js
and browsers, supports CommonJS and native ES modules, and remains compatible
with the original one-shot `solve(problem, options)` API.

## Install

```sh
npm install highs
```

## Quick start

The compatibility API accepts a model in CPLEX LP text format and returns the
established name-keyed result:

```js
const loadHighs = require("highs");
const highs = await loadHighs();

const result = highs.solve(
  `Maximize
   obj: x + 2 y
  Subject To
   capacity: x + y <= 20
  Bounds
   x >= 0
   y >= 0
  End`,
  { output_flag: false },
);

console.log(result.Status, result.ObjectiveValue);
console.log(result.Columns.x.Primal, result.Columns.y.Primal);
```

Existing `require("highs")`, loader options, `solve()` inputs, option names, and
result shapes remain supported.

## Persistent models

Use a persistent model for repeated solves, structured sparse input, LP/MIP/QP
models, mutation, callbacks, basis analysis, IIS, ranging, and the stable
non-deprecated HiGHS C API:

```js
import loadHighs from "highs";

const highs = await loadHighs();
const model = highs.createModel({
  numCols: 2,
  numRows: 1,
  sense: highs.constants.objectiveSense.maximize,
  colCost: new Float64Array([1, 2]),
  colLower: new Float64Array([0, 0]),
  colUpper: new Float64Array([highs.infinity, highs.infinity]),
  rowLower: new Float64Array([-highs.infinity]),
  rowUpper: new Float64Array([20]),
  matrix: {
    format: "csc",
    numRows: 1,
    numCols: 2,
    starts: new Int32Array([0, 1, 2]),
    indices: new Int32Array([0, 0]),
    values: new Float64Array([1, 1]),
  },
  colNames: ["x", "y"],
  rowNames: ["capacity"],
});

try {
  model.options.set({ output_flag: false, presolve: "on" });
  let run = model.run();
  console.log(run.modelStatus, model.getSolution().colValue);

  // Re-solve without rebuilding or reparsing the model.
  model.changeColBounds(1, 0, 5);
  run = model.run();
  console.log(run.modelStatus, model.getObjectiveValue());
} finally {
  model.dispose();
}
```

Inputs are validated before entering WebAssembly. Public array results are
detached JavaScript-owned typed arrays, so they remain valid after another
solver call or `dispose()`. The lower-level `highs.raw` API exposes the same
structured operations while preserving native status codes.

| Workload | API |
| --- | --- |
| One solve from existing LP text | `highs.solve(lpText, options)` |
| Repeated solves or model mutation | `highs.createModel(...)` |
| Existing CSC/CSR arrays or QP Hessian data | `highs.createModel(modelData)` |
| Exact C-style status handling | `highs.raw` |
| Long browser solve | Put the loader and model in a Web Worker |

## Model I/O

Export and re-import models in LP or MPS format, and export solutions as
human-readable text:

```js
const highs = await loadHighs();
const model = highs.createModel(/* ... */);
model.run();

// Round-trip a model through LP text
const lpText = model.exportModel("lp");
const clone = highs.createModel();
clone.readModel({ format: "lp", data: lpText });

// MPS binary export
const mpsBytes = model.exportModel("mps");

// Export the current solution
console.log(model.exportSolution(true)); // pretty
console.log(model.exportSolution());       // machine-readable

// After presolve, export the reduced model
model.presolve();
const reducedLp = model.exportPresolvedModel("lp");

clone.dispose();
model.dispose();
```

## Options and solver info

Inspect and modify solver options, and read solver statistics after a run:

```js
const model = highs.createModel(/* ... */);

// Set options individually or in bulk
model.options.set("time_limit", 30);
model.options.set({ presolve: "on", mip_rel_gap: 0.01 });

// Query current values and metadata
console.log(model.options.get("time_limit"));          // 30
console.log(model.options.describe("mip_rel_gap"));     // { type, current, default, min, max }
console.log(model.options.names());                     // all option names

// Round-trip options as text
const saved = model.options.export(true);               // only non-default values
model.options.reset();                                  // restore defaults
model.options.read(saved);                              // re-apply

model.run();

// Solver statistics after the run
console.log(model.info.get("simplex_iteration_count")); // number
console.log(model.info.get("mip_node_count"));          // bigint
console.log(model.info.type("objective_function_value")); // "integer" | "double" | "int64"
```

## WebAssembly loading

The package ships `build/highs.wasm`. Node.js normally finds it next to the
JavaScript build. In a browser, copy the file into your served assets and use
`locateFile` when it is not next to `highs.js` or `highs.mjs`:

```js
import loadHighs from "highs";

const highs = await loadHighs({
  locateFile: (file) => new URL(`/solver-assets/${file}`, location.href).href,
});
```

Loading is asynchronous; solver operations are synchronous after the loader
resolves. This WebAssembly build is deliberately single-threaded. The extended
API rejects thread/concurrency and public file/path options; use Workers for
application-level parallelism and the data-only model, option, and solution I/O
methods.

## Documentation and demos

- [Extended API documentation](https://lovasoa.github.io/highs-js/docs/)
- [Migration guide](./docs/migration.md)
- [JavaScript-to-C API mapping](./docs/c-api-mapping.md)
- [Online compatibility demo](https://lovasoa.github.io/highs-js/)
- [Persistent API Worker demo](https://lovasoa.github.io/highs-js/extended/)

The single canonical TypeScript declaration is [`types.d.ts`](./types.d.ts).
The `highs/legacy-types` compatibility entry points to that same declaration.

## Versioning

The package major and minor version match the embedded HiGHS major and minor
version. For example, `1.14.x` contains HiGHS `v1.14.x`. The package patch
version may change for JavaScript API fixes without changing the embedded
solver version.
