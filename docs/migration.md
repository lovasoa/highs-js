---
layout: docs
title: Migration guide
description: Move incrementally from solve() to persistent, typed models.
permalink: /docs/migration/
---

# Migration guide

The best migration boundary is the code that translates your application’s
model into a solver model and translates the result back. Keep that boundary
small and explicit. The rest of the application should deal in domain objects
such as factories, routes, schedules, or portfolio plans—not in LP text or
solver column names.

The migration is additive. Existing solve() calls continue to work, so you can
move one workflow at a time.

## Choose the API for the workload

| Application pattern | Recommended API |
| --- | --- |
| A single solve from an LP string | highs.solve(lpText, options) |
| An interactive editor that solves the same model repeatedly | createModel() and model.run() |
| A model generated from arrays or a graph | ModelData with createModel() or passModel() |
| A browser or server request that must not block its host thread | Put the loader and model in a Worker or worker thread |
| A modeling language or application pipeline | Keep a domain compiler and use HiGHS as the final solver adapter |

Do not migrate only because the persistent API is newer. The legacy API is still
the simplest choice when a model is already available as LP text and is solved
once. The persistent API becomes useful when model state, output format, or
solve performance matters across calls.

## 1. Make loading a shared application service

Loading the WebAssembly runtime is asynchronous; calls on the resolved runtime
are synchronous. Applications commonly hide that distinction behind one
cached promise. This avoids loading one runtime for every UI component or
request.

~~~js
import loadHighs from "highs";

let highsPromise;

export function getHighs() {
  highsPromise ??= loadHighs({
    // Needed when the browser serves the wasm asset from a separate location.
    locateFile: (file) => new URL("/solver/" + file, location.href).href,
  });
  return highsPromise;
}
~~~

In Node.js, the default location normally finds highs.wasm next to the
JavaScript build. In a browser, copy the wasm file to the assets served by the
application or provide locateFile. In a container, make the wasm asset part of
the image and verify that the bundled JavaScript points to that location.

CommonJS and native ES modules use the same loader contract:

~~~js
// CommonJS
const loadHighs = require("highs");
const highs = await loadHighs();

// ES module
import loadHighs from "highs";
const highs = await loadHighs();
~~~

Keep the loader out of model-building code. That makes the model builder easy
to test without WebAssembly and makes it possible to run the same adapter in a
browser, a Worker, or a Node.js service.

## 2. Keep one-shot solves when they are the right fit

The compatibility API remains appropriate for a pipeline that already emits
CPLEX LP text:

~~~js
const highs = await getHighs();
const result = highs.solve(lpText, {
  presolve: "on",
  output_flag: false,
});

if (result.Status !== "Optimal") {
  return { ok: false, status: result.Status };
}

return Object.fromEntries(
  Object.entries(result.Columns).map(([name, column]) => [name, column.Primal]),
);
~~~

This is a good first step for an application that compiles a domain model,
solves it, and immediately turns the named result into a domain result. It is
also a useful compatibility baseline while moving to the extended API.

The legacy result is deliberately name-oriented and formatted for
compatibility. Do not expect it to have the same shape as a persistent result:
the extended API returns indexed Float64Array values from the C API.

### Legacy-to-persistent result mapping

Keep the application-facing result stable while changing the solver boundary.
The corresponding fields are:

| Legacy `solve()` result | Persistent model |
| --- | --- |
| `result.Status` | `run.modelStatus`, interpreted with `highs.constants.modelStatus` |
| `result.ObjectiveValue` | `model.getObjectiveValue()` |
| `result.Columns[name].Index` | `model.getColByName(name)` |
| `result.Columns[name].Primal` | `model.getSolution().colValue[columnIndex]` |
| `result.Columns[name].Dual` | `model.getSolution().colDual[columnIndex]` |
| `result.Rows[index].Primal` | `model.getSolution().rowValue[index]` |
| `result.Rows[index].Dual` | `model.getSolution().rowDual[index]` |
| column or row `Status` | `model.getBasis().colStatus[index]` or `rowStatus[index]` |
| column `Type` | `model.getColIntegrality(index)` |
| column or row `Name` | `model.getColName(index)` or `model.getRowName(index)` |

The model-status strings map exactly as follows:

| Legacy string | Persistent constant |
| --- | --- |
| `Not Set` | `modelStatus.notSet` |
| `Load error` | `modelStatus.loadError` |
| `Model error` | `modelStatus.modelError` |
| `Presolve error` | `modelStatus.presolveError` |
| `Solve error` | `modelStatus.solveError` |
| `Postsolve error` | `modelStatus.postsolveError` |
| `Empty` | `modelStatus.empty` |
| `Optimal` | `modelStatus.optimal` |
| `Infeasible` | `modelStatus.infeasible` |
| `Primal infeasible or unbounded` | `modelStatus.unboundedOrInfeasible` |
| `Unbounded` | `modelStatus.unbounded` |
| `Bound on objective reached` | `modelStatus.objectiveBound` |
| `Target for objective reached` | `modelStatus.objectiveTarget` |
| `Time limit reached` | `modelStatus.timeLimit` |
| `Iteration limit reached` | `modelStatus.iterationLimit` |
| `Unknown` | `modelStatus.unknown` |
| no legacy string | `modelStatus.solutionLimit` |
| no legacy string | `modelStatus.interrupted` |

Basis status is numeric in the persistent API:
`basisStatus.lower`, `basic`, `upper`, `zero`, and `nonbasic`. The legacy
pretty-solution labels `LB`, `BS`, and `UB` correspond to the first three.
Legacy labels such as `FX`, `FR`, and `NB` also incorporate bound structure, so
do not compare those strings to a basis code alone.

The compatibility result remains unchanged when the `ranging` option is set.
New code should run a persistent model and call `model.getRanging()` explicitly;
the result is six columnar records backed by detached typed arrays.

### Copyable parity harness

Run both paths in tests during migration. This helper compares the stable
observable values without requiring the two deliberately different result
objects to be deeply equal:

~~~js
import assert from "node:assert/strict";

const legacyStatusByCode = [
  "Not Set",
  "Load error",
  "Model error",
  "Presolve error",
  "Solve error",
  "Postsolve error",
  "Empty",
  "Optimal",
  "Infeasible",
  "Primal infeasible or unbounded",
  "Unbounded",
  "Bound on objective reached",
  "Target for objective reached",
  "Time limit reached",
  "Iteration limit reached",
  "Unknown",
];

function assertNear(actual, expected, label, tolerance) {
  if (Object.is(actual, expected) || actual === expected) return;
  assert.ok(
    Number.isFinite(actual) &&
      Number.isFinite(expected) &&
      Math.abs(actual - expected) <=
        tolerance * Math.max(1, Math.abs(actual), Math.abs(expected)),
    `${label}: expected ${expected}, received ${actual}`,
  );
}

export function assertSolveParity(
  highs,
  lpText,
  {
    legacyOptions = { output_flag: false },
    persistentOptions = { output_flag: false },
    tolerance = 1e-7,
  } = {},
) {
  const legacy = highs.solve(lpText, legacyOptions);
  const model = highs.createModel({ format: "lp", data: lpText });

  try {
    model.options.set(persistentOptions);
    const run = model.run();
    const solution = model.getSolution();

    assert.equal(legacy.Status, legacyStatusByCode[run.modelStatus]);
    assertNear(
      model.getObjectiveValue(),
      legacy.ObjectiveValue,
      "objective",
      tolerance,
    );

    for (const [name, column] of Object.entries(legacy.Columns)) {
      const index = model.getColByName(name);
      assert.equal(index, column.Index, `column index for ${name}`);
      if ("Primal" in column) {
        assertNear(
          solution.colValue[index],
          column.Primal,
          `column primal ${name}`,
          tolerance,
        );
      }
      if ("Dual" in column) {
        assertNear(
          solution.colDual[index],
          column.Dual,
          `column dual ${name}`,
          tolerance,
        );
      }
    }

    for (const row of legacy.Rows) {
      if ("Primal" in row) {
        assertNear(
          solution.rowValue[row.Index],
          row.Primal,
          `row primal ${row.Index}`,
          tolerance,
        );
      }
      if ("Dual" in row) {
        assertNear(
          solution.rowDual[row.Index],
          row.Dual,
          `row dual ${row.Index}`,
          tolerance,
        );
      }
    }

    return { legacy, run, solution };
  } finally {
    model.dispose();
  }
}
~~~

Keep legacy and persistent option objects separate in this test. In particular,
do not pass legacy thread, path, or file-output fields to the persistent option
store. Compare domain-decoded values in addition to this low-level harness, and
set tolerances appropriate to the application rather than snapshotting decimal
formatting or the sign of zero.

## 3. Introduce a domain-to-solver adapter

Interactive planning applications usually have several layers before HiGHS:

1. Domain state is stored as objects, graph nodes, or records.
2. A model builder assigns stable variable and constraint names.
3. A solver adapter emits LP text or ModelData.
4. A result adapter maps values back to the domain model.
5. The UI or service adds explanations, validation, and suggested changes.

Keep those layers separate. A useful adapter has a shape like this:

~~~js
function solvePlan(highs, request) {
  const compiled = compilePlan(request);
  const result = highs.solve(compiled.lp, compiled.options);

  if (result.Status !== "Optimal") {
    return {
      status: result.Status,
      diagnostics: explainFailure(request, result.Status),
    };
  }

  return {
    status: result.Status,
    variables: compiled.variables.map((variable) => ({
      id: variable.id,
      amount: result.Columns[variable.name].Primal,
    })),
  };
}
~~~

The important detail is compiled.variables. It is the explicit mapping from
domain identifiers to solver indices or names. Do not rely on object iteration
order, display labels, or a solver-generated name convention.

When using ModelData, store the same mapping with the column index:

~~~js
const variables = request.items.map((item, index) => ({
  id: item.id,
  index,
  name: "item_" + item.id,
}));
~~~

Names are useful for diagnostics and exported LP files; indices are the native
persistent API’s primary addressing mechanism.

## 4. Move repeated solves to a persistent model

Use a persistent model when an editor recalculates after every meaningful
change, when a service evaluates several scenarios, or when a model must be
inspected after solving. Create it once, retain it for the lifecycle of the
request or Worker, and dispose it in the matching cleanup path.

~~~js
const highs = await getHighs();
const model = highs.createModel({ format: "lp", data: compiled.lp });

try {
  model.options.set({
    presolve: "on",
    output_flag: false,
    mip_rel_gap: 1e-6,
  });

  let run = model.run();
  if (run.modelStatus === highs.constants.modelStatus.optimal) {
    const first = model.getSolution();
    renderPlan(first.colValue);
  }

  // Reuse the native model when only a bound or coefficient changed.
  model.changeColBounds(compiled.targetColumn, 0, nextTarget);
  run = model.run();
  inspectRun(run, model.lastCall);
} finally {
  model.dispose();
}
~~~

Use mutation methods for changes to costs, bounds, integrality, or selected
rows and columns. If the graph topology changes substantially, rebuild the
ModelData and call passModel() or create a new model. Reusing a handle does not
mean that every edit should be expressed as a sequence of low-level mutations;
choose the simpler boundary for the model size and edit frequency.

Persistent results are snapshots. A later run() does not update an earlier
Float64Array, and changing a returned array does not change the model. Keep the
snapshot that belongs to each displayed request and discard stale results when
a newer request wins.

## 5. Use structured sparse input when the application already has it

Graph, scheduling, allocation, and modeling-language applications often have
coefficients in arrays already. In that case, avoid generating LP text merely
to parse it again. Pass a ModelData object:

~~~js
const data = {
  numCols,
  numRows,
  sense: highs.constants.objectiveSense.minimize,
  colCost,
  colLower,
  colUpper,
  rowLower,
  rowUpper,
  matrix: {
    format: "csc",
    numRows,
    numCols,
    starts,  // length numCols + 1
    indices,
    values,
  },
  integrality, // omit for a continuous LP
  colNames,
  rowNames,
};

const model = highs.createModel(data);
~~~

For CSC, starts has one entry per column plus the final nonzero-count
sentinel. For CSR, it has one entry per row plus that sentinel. Indices are
zero-based. indices.length and values.length must equal the sentinel value.
The wrapper validates dimensions, starts, indices, and allocation sizes before
calling WebAssembly.

Use ordinary arrays while integrating, then use Float64Array and Int32Array
when profiling shows that conversion is significant. Typed arrays are an
optimization, not a substitute for a stable domain-to-column mapping.

## 6. Treat options as part of the solver boundary

The extended API uses the exact HiGHS snake_case names and checks them at runtime:

~~~js
model.options.set("presolve", "on");
model.options.set({ output_flag: false, mip_rel_gap: 1e-6 });

const gap = model.options.get("mip_rel_gap");
const definition = model.options.describe("mip_rel_gap");
~~~

Use names() and describe() when supporting more than one embedded HiGHS
version. Do not copy an option list into the application unless you also have a
versioning plan.

The WebAssembly build is single-threaded. The extended API rejects thread,
parallel, and concurrency options, as well as options that name files or paths.
Legacy option fields remain for compatibility; they do not enable WebAssembly
threads. Use the data-only methods for model, options, and solution I/O:

~~~js
model.readModel({ format: "lp", data: lpText });
const exportedLp = model.exportModel("lp");
const exportedMps = model.exportModel("mps");
model.options.read("presolve = on\noutput_flag = false\n");
const solutionText = model.exportSolution(true);
~~~

LP and option data are strings. MPS output is a Uint8Array. Public extended
methods do not accept virtual-filesystem paths, and gzip is not provided by
this build.

## 7. Put long or frequent solves behind a Worker

Loading is asynchronous, but solving is synchronous. A solve in a browser
component or request handler blocks that thread until it returns. Put the
complete runtime and its model in a Worker when a model can be large or users
can edit it repeatedly.

The main thread should send domain input and receive domain output. Do not try
to pass a Highs runtime or Model handle between threads:

~~~js
// planner.worker.js
import loadHighs from "highs";

const highs = await loadHighs();
let model;

self.onmessage = ({ data: request }) => {
  const compiled = compilePlan(request);
  model?.dispose();
  model = highs.createModel(compiled.model);
  model.options.set({ output_flag: false });
  const run = model.run();
  self.postMessage(toPlanResult(compiled, model, run));
};
~~~

For a UI, include a request id and ignore responses older than the current
request. For cancellation, terminate and recreate the Worker or use a HiGHS
simplex, IPM, or MIP interrupt callback to call `event.interrupt()`. A callback
is synchronous: it must not await, call back into the model, or retain native
state. Controls are capability-specific: interrupt callbacks expose
`interrupt()`, the MIP user-solution callback exposes `setSolution()` and
`repairSolution()`, and logging, solution-notification, MIP logging, and cut-pool
callbacks are read-only.

Use one runtime and one model per Worker. Application-level parallelism means
parallel Workers, not concurrent calls on one model.

## 8. Make status and diagnostics visible to the application

The solver result is not the complete user-facing result. A planning
application normally needs to distinguish:

- a valid optimum;
- an infeasible or unbounded model;
- a feasible incumbent returned after a limit or interruption;
- a wrapper or input error; and
- a warning that should be logged or shown during development.

With the persistent convenience API, native errors become typed errors and
successful calls preserve warning metadata:

~~~js
try {
  const run = model.run();
  if (run.status === highs.constants.status.warning) {
    logWarnings(run.warnings);
  }

  switch (run.modelStatus) {
    case highs.constants.modelStatus.optimal:
      return decodeSolution(model.getSolution());
    case highs.constants.modelStatus.infeasible:
      return explainInfeasible(model);
    default:
      return { status: run.modelStatus };
  }
} catch (error) {
  // Validation, unsupported options, disposal, and native failures are
  // different from a mathematically infeasible model.
  return handleSolverError(error);
}
~~~

Use model.lastCall when the code path needs the most recent warning metadata.
Use highs.raw only at a boundary that already handles native return codes; raw
getters return a discriminated { status, value } result and must be checked
before value is read.

Do not turn every non-optimal status into an exception. Let the domain layer
decide whether a feasible incumbent is acceptable, whether a retry is useful,
and which constraints or inputs should be shown to the user. Keep the compiled
request, objective choice, and relevant options with diagnostics so an
infeasible result can be reproduced.

## 9. Define a numeric policy at the domain boundary

HiGHS returns floating-point values. Even an integer or fixed-point business
domain can receive values such as 29.999999999. Decide explicitly where to
scale, round, and validate:

~~~js
function toIntegerAmount(value, epsilon = 1e-7) {
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) > epsilon) {
    throw new Error("Expected an integer amount, got " + value);
  }
  return rounded;
}
~~~

For money, token quantities, or other exact units, prefer an integer scale in
the model when it keeps coefficients well-conditioned, then validate every
decoded flow against bounds and conservation equations before converting to
bigint or an application-specific amount type. Do not use
Number.isSafeInteger() as the first test for a solver value without applying an
appropriate tolerance.

For floating-point domains, preserve the solver value and use tolerances when
checking constraints. The solver’s feasibility tolerance is not a guarantee
that the application’s own exactness requirements are satisfied.

## 10. Keep persistence and sharing domain-oriented

Persist the user’s model definition, selected recipes or routes, objective,
options, and application version. Recreate the solver model after loading.
Native handles are not serializable and solver arrays are normally derived
state.

If transferring a model between Workers is a measured requirement, use
getModel() to obtain detached data and createModel(snapshot) to make the copy
explicit. For normal save files, storing the domain request is smaller, more
stable across HiGHS versions, and easier to migrate.

Cache a solution only with the input revision, objective, options, and solver
version that produced it. A result from an older graph or recipe database must
never silently replace a newer result.

## 11. Test the adapter, not just the solver call

Useful tests follow the same boundaries as the application:

- model compilation produces the expected variables, bounds, objective, and
  sparse matrix;
- result decoding maps every variable and constraint to the right domain id;
- optimal, infeasible, unbounded, limited, and interrupted statuses are handled
  intentionally;
- repeated mutations produce the same model as a fresh rebuild;
- integer rounding and conservation checks reject meaningful residuals but
  tolerate floating-point noise;
- a changed request cannot be overwritten by a stale Worker response; and
- representative scenarios cover zero-valued variables, optional inputs,
  alternative recipes or routes, and multiple objectives.

During migration, compare objective values, statuses, and domain-level primal
values between the legacy and persistent paths. Do not compare complete result
objects: the legacy path is name-keyed and the persistent path is index-keyed.

## Suggested migration sequence

1. Put the loader behind one cached promise and verify the wasm asset in every
   deployment target.
2. Extract model compilation and result decoding from UI or service code while
   leaving solve() in place.
3. Add status handling, numeric validation, and domain-level diagnostics.
4. Use createModel() for repeated solves; mutate bounds and coefficients where
   that is simpler than rebuilding.
5. Move model generation to ModelData when sparse data is already available or
   LP parsing becomes measurable.
6. Move the complete runtime into a Worker for long browser solves, then add
   request ids and cancellation.
7. Persist domain input and test both fresh-build and repeated-mutation paths.

## Compatibility checklist

- Existing require("highs") and the default async factory still work.
- Existing solve(problem, options) input and result shapes remain supported.
- Legacy logging hooks and legacy option declarations remain available.
- The extended API is feature-detectable with
  typeof highs.createModel === "function".
- Persistent results use detached typed arrays and are snapshots.
- Persistent models must be disposed; one-shot legacy solves need no new
  cleanup.
- CommonJS and ESM loading do not remove the need to deploy highs.wasm.
- Thread, path, and file-output assumptions must be removed from extended API
  code.
