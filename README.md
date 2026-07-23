# highs-js

> 🚀 **Prerelease available:** [`highs@1.15.3-pre.0`](https://www.npmjs.com/package/highs/v/1.15.3-pre.0) adds a persistent model API, MIP, QP, IIS, ranging, and more.
> [Try it and share feedback →](https://github.com/lovasoa/highs-js/issues/new)

[![npm version](https://badge.fury.io/js/highs.svg)](https://www.npmjs.com/package/highs)
[![CI status](https://github.com/lovasoa/highs-js/actions/workflows/CI.yml/badge.svg)](https://github.com/lovasoa/highs-js/actions/workflows/CI.yml)
[![package size](https://badgen.net/bundlephobia/minzip/highs)](https://bundlephobia.com/result?p=highs)

Use the [HiGHS](https://highs.dev/) optimization solver from JavaScript.
`highs-js` compiles HiGHS to WebAssembly and solves linear, mixed-integer, and
convex quadratic models in Node.js and modern browsers. Everything runs
locally. There is no native add-on and no solver service to operate.

```sh
npm install highs
```

The package supports CommonJS and native ES modules, includes TypeScript
declarations, and offers a small one-shot API alongside a persistent API for
larger applications.

## What can it solve?

Optimization finds the best decision that still satisfies every constraint.
The decision might be how much to produce, which jobs to schedule, where to
open facilities, or how to balance return against risk.

| Model | Best suited to | Examples |
| --- | --- | --- |
| **LP (linear programming)** | Continuous decisions with linear costs and constraints | Blending, transportation, energy dispatch, production planning |
| **MILP/MIP (mixed-integer linear programming)** | Whole-number or yes/no decisions with linear costs and constraints | Scheduling, assignment, packing, facility location, routing models |
| **Convex QP (quadratic programming)** | Continuous decisions with a convex quadratic objective | Portfolio risk, constrained least squares, control, smooth resource allocation |

HiGHS represents these models as

```text
minimize or maximize    1/2 xᵀQx + cᵀx
subject to              rowLower ≤ Ax ≤ rowUpper
                        colLower ≤  x ≤ colUpper
```

With `Q = 0`, continuous variables give an LP and integer variables give a MIP.
For a convex QP, `Q` is positive semidefinite when minimizing and negative
semidefinite when maximizing.

HiGHS is a linear and convex quadratic solver. It does not handle general
nonlinear models or mixed-integer quadratic programs.

## Quick start

A workshop makes chairs and tables. Each product earns a profit and uses
carpentry and finishing time, both in limited supply. Chairs and tables must be
produced in whole units, so the model is a MIP.

```js
import loadHighs from "highs";

const highs = await loadHighs();

const problem = `Maximize
   profit: 30 chairs + 50 tables
  Subject To
   carpentry: chairs + 2 tables <= 40
   finishing: 2 chairs + tables <= 50
  Bounds
   chairs >= 0
   tables >= 0
  Generals
   chairs tables
  End`;

const result = highs.solve(problem, { output_flag: false });

if (result.Status !== "Optimal") {
  throw new Error(`Solve ended with status: ${result.Status}`);
}

console.log(result.ObjectiveValue);         // 1100
console.log(result.Columns.chairs.Primal);  // 20
console.log(result.Columns.tables.Primal);  // 10
```

The optimum is 20 chairs and 10 tables, for a profit of 1100. Remove the
`Generals` section to allow fractional quantities and solve the model as an LP.

CommonJS uses the same loader:

```js
const loadHighs = require("highs");
```

## Choose an API

Most programs need one of these three entry points.

| Task | API |
| --- | --- |
| Solve one model already written in CPLEX LP format | `highs.solve(lpText, options)` |
| Keep a model in memory, modify it, and solve it again | `highs.createModel(...)` |
| Call the stable HiGHS C API directly and retain numeric status codes | `highs.raw` |

`highs.solve()` is the original compatibility API. It accepts CPLEX LP text and
returns results keyed by variable name.

A persistent `Model` owns one HiGHS instance until `dispose()`. Use it for
structured sparse input, repeated solves, model changes, callbacks, bases,
ranging, IIS analysis, and other advanced features.

## Algorithms

HiGHS chooses a suitable algorithm when `solver` is set to its default value,
`"choose"`. The JavaScript API exposes the main controls and diagnostics used
by the native solver.

| Model | Algorithms available | Main controls |
| --- | --- | --- |
| **LP** | Primal and dual revised simplex, an interior-point method with optional crossover, and PDLP | `solver`, `simplex_strategy`, edge-weight strategies, `run_crossover`, tolerances, iteration limits |
| **MIP** | Branch-and-cut with presolve, LP relaxations, cutting planes, heuristics, restarts, and symmetry detection | Gap limits, node limits, solution limits, feasibility settings, heuristic effort, symmetry, restarts, callbacks |
| **Convex QP** | Primal active-set QP solver | `qp_iteration_limit`, `qp_nullspace_limit`, sparse Hessian input |

For LP models, `solver` accepts:

- `"choose"`: let HiGHS choose
- `"simplex"`: revised simplex
- `"ipm"`: interior-point method
- `"pdlp"`: a first-order method based on primal-dual hybrid gradient

`simplex_strategy` selects automatic mode, serial dual simplex, the PAMI and SIP
dual variants, or primal simplex. The edge-weight options include Dantzig,
Devex, and steepest edge where the selected algorithm supports them.

For MIP and QP models, leave `solver` at `"choose"` unless you explicitly want
the LP relaxation. Selecting `"simplex"`, `"ipm"`, or `"pdlp"` tells HiGHS to
ignore integrality and the quadratic term.

This WebAssembly build is single-threaded. Run independent solves in Web
Workers when an application needs parallelism or must keep a browser interface
responsive.

The upstream [HiGHS solver overview](https://ergo-code.github.io/HiGHS/dev/solvers/)
describes the algorithms in more depth.

## Persistent models

Create a model from LP text, MPS bytes, sparse arrays, or an empty instance. The
following example keeps the production model in memory, changes one bound, and
solves it again without reparsing the LP text.

```js
const model = highs.createModel({ format: "lp", data: problem });

try {
  model.options.set({ output_flag: false, presolve: "on" });

  model.run();
  console.log(model.getObjectiveValue());

  const tables = model.getColByName("tables");
  model.changeColBounds(tables, 0, 6);
  model.run();

  console.log(model.getSolution().colValue);
} finally {
  model.dispose();
}
```

Inputs are validated before they enter WebAssembly. Arrays returned by the
public API are JavaScript-owned copies, so a later solver call or `dispose()`
does not invalidate them.

You can also build a model incrementally:

```js
const model = highs.createModel();
model.addVar(0, highs.infinity);
model.changeColCost(0, 12);
model.changeColIntegrality(0, highs.constants.variableType.integer);
model.addRow(-highs.infinity, 20, { indices: [0], values: [3] });
```

For large application-generated models, pass CSC or CSR arrays directly to
`highs.createModel(modelData)`. Add `integrality` for a MIP or `hessian` for a
convex QP.

## API map

The table below is a compact index to the persistent API. See the
[generated API reference](https://lovasoa.github.io/highs-js/docs/) or
[`types.d.ts`](./types.d.ts) for complete signatures.

| Area | Representative API |
| --- | --- |
| Create and replace models | `passModel`, `readModel`, `addVar(s)`, `addRow(s)`, `addCol(s)` |
| Change models | `changeColBounds`, `changeRowBounds`, `changeColCost`, `changeCoefficient`, `changeColIntegrality`, `deleteRows`, `deleteCols`, `scaleRow`, `scaleCol` |
| Manage the solve lifecycle | `presolve`, `run`, `postsolve`, `clearSolver`, `clearModel`, `releaseMemory`, `dispose` |
| Read and seed solutions | `getModelStatus`, `getObjectiveValue`, `getSolution`, `setSolution`, `getPrimalRay`, `getDualRay` |
| Work with simplex bases | `getBasis`, `setBasis`, `setLogicalBasis`, `getBasicVariables`, basis inverse and solve methods, reduced rows and columns, `crossover` |
| Diagnose infeasibility and sensitivity | `getIis`, `getIisLp`, `feasibilityRelaxation`, `getRanging`, `getFixedLp` |
| Inspect model data | `getModel`, `getLp`, `getPresolvedLp`, `getCols`, `getRows`, name lookups |
| Import and export | LP text, MPS bytes, presolved models, human-readable and machine-readable solutions |
| Set multiple objectives | `passLinearObjectives`, `addLinearObjective`, `clearLinearObjectives` |
| Configure the solver | `model.options.get/set/describe/names/reset/read/export` |
| Read solver statistics | `model.info.get/type`, `getRunTime`, `zeroAllClocks` |
| Receive callbacks | Logging, simplex/IPM/MIP interrupts, MIP solutions, improving solutions, cut pools, user solutions |
| Keep native status handling | `highs.raw.lpCall`, `mipCall`, `qpCall`, `highs.raw.createModel()` |

## Advanced use

### Options and solver information

```js
model.options.set("time_limit", 30);
model.options.set({ presolve: "on", mip_rel_gap: 0.01 });

console.log(model.options.describe("mip_rel_gap"));
console.log(model.options.names());

model.run();
console.log(model.info.get("simplex_iteration_count"));
console.log(model.info.get("mip_node_count")); // bigint
```

Option names match HiGHS and use `snake_case`. `describe()` reports an option's
type, current value, default, and numeric limits when available.

### Convex QP Hessian

A QP objective has the form `1/2 xᵀQx + cᵀx`. Pass `Q` as a sparse triangular
or square Hessian.

```js
model.passHessian({
  format: "triangular",
  dimension: 2,
  starts: new Int32Array([0, 1, 2]),
  indices: new Int32Array([0, 1]),
  values: new Float64Array([2, 4]),
});
model.run();
```

For minimization, HiGHS expects a positive-semidefinite Hessian. For
maximization, it expects a negative-semidefinite Hessian.

### Warm starts and bases

```js
const basis = model.getBasis();
const solution = model.getSolution();

const next = highs.createModel(relatedModelData);
next.setBasis(basis);
next.setSolution({ colValue: solution.colValue });
next.run();
```

You can warm-start a related LP from an existing simplex basis. The API also
provides basis inverse rows and columns, basis solves, transpose solves, and
reduced tableau rows and columns.

### Infeasibility analysis

```js
model.run();

if (model.getModelStatus() === highs.constants.modelStatus.infeasible) {
  const iis = model.getIis();
  const conflictingModel = model.getIisLp();
}
```

Related tools include feasibility relaxation, primal and dual rays, ranging,
fixed-LP extraction after a MIP solve, and inspection of the presolved model.

### Callbacks

```js
model.run({
  [highs.constants.callbackType.mipLogging](event) {
    console.log(event.data.mip_node_count);
  },
  [highs.constants.callbackType.mipInterrupt](event) {
    if (shouldStop()) event.interrupt();
  },
  [highs.constants.callbackType.mipUserSolution](event) {
    event.setSolution({ indices: [0], values: [1] });
  },
});
```

Callbacks run synchronously. Returning a Promise throws
`HighsValidationError`. Put long browser solves in a Worker to keep the main
thread free.

## Raw API

`highs.raw` follows the stable, non-deprecated HiGHS C API while replacing
pointers with structured JavaScript values.

```js
const result = highs.raw.lpCall(modelData);

if (result.status !== highs.constants.status.error) {
  console.log(result.value.modelStatus);
  console.log(result.value.solution.colValue);
}
```

Use `highs.raw.createModel()` for persistent C-style operations. Warnings and
errors remain numeric status values.

## Model and solution I/O

```js
const lpText = model.exportModel("lp");
const mpsBytes = model.exportModel("mps");
const solutionText = model.exportSolution(true);

const clone = highs.createModel({ format: "lp", data: lpText });
```

LP models use text; MPS models use bytes. The JavaScript API accepts and returns
data, so callers never need virtual filesystem paths.

## WebAssembly loading

Node.js normally finds `highs.wasm` beside the package loader. In a browser,
serve the file as an asset and provide `locateFile` when it lives elsewhere.

```js
const highs = await loadHighs({
  locateFile: (file) => new URL(`/solver-assets/${file}`, location.href).href,
});
```

The loader also accepts `wasmBinary` or a precompiled `wasmModule`.

Loading is asynchronous; solver calls are synchronous after initialization. A
model cannot be used reentrantly. Call `dispose()` when a persistent model is no
longer needed.

## Documentation and demos

- [Extended API reference](https://lovasoa.github.io/highs-js/docs/)
- [Online one-shot demo](https://lovasoa.github.io/highs-js/)
- [Persistent API Worker demo](https://lovasoa.github.io/highs-js/extended/)
- [Migration guide](./docs/migration.md)
- [JavaScript-to-C API mapping](./docs/c-api-mapping.md)
- [Canonical TypeScript declarations](./types.d.ts)
- [Upstream HiGHS documentation](https://ergo-code.github.io/HiGHS/)

The `highs/legacy-types` compatibility entry points to the same `types.d.ts`
declaration.

## Versioning

The package major and minor version match the embedded HiGHS version. For
example, `highs-js` 1.14.x contains HiGHS 1.14.x. Patch releases may contain
JavaScript API fixes without changing the solver version.
