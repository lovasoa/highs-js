# Extended JavaScript API

## Loading

The package has CommonJS and native ES-module entry points. Both resolve to the
same asynchronous runtime factory and load the same WebAssembly solver.

```js
// CommonJS
const loadHighs = require("highs");
const highs = await loadHighs();
```

```js
// Native ESM
import loadHighs from "highs";

const highs = await loadHighs();
```

In a browser, pass `locateFile` when the `.wasm` asset is not next to the
JavaScript module:

```js
const highs = await loadHighs({
  locateFile: (file) => new URL(`/solver-assets/${file}`, location.href).href,
});
```

Loading remains asynchronous; all calls on the resolved `highs` object are
synchronous. Run it in a Worker when blocking the current thread is undesirable.

## Compatibility API

Existing code continues to use `solve(problem, options)`:

```js
const result = highs.solve(lpText, {
  presolve: "on",
  output_flag: false,
});
```

Its accepted input, option spelling, result object, thrown errors, logging, and
exported CommonJS shape remain compatible. Internally it deliberately retains
the established text-based solution path. This isolates existing applications
from the extended API migration and its typed-array result types.

## Persistent model API

Use a persistent model when you solve more than once, modify a model, or need
the broader solver API. The native `Highs_create()` handle lives until
`dispose()`.

```js
const model = highs.createModel({
  numCols: 2,
  numRows: 1,
  sense: highs.constants.objectiveSense.minimize,
  colCost: new Float64Array([1, 2]),
  colLower: new Float64Array([0, 0]),
  colUpper: new Float64Array([highs.infinity, highs.infinity]),
  rowLower: new Float64Array([1]),
  rowUpper: new Float64Array([highs.infinity]),
  matrix: {
    format: "csc",
    numRows: 1,
    numCols: 2,
    starts: new Int32Array([0, 1, 2]),
    indices: new Int32Array([0, 0]),
    values: new Float64Array([1, 1]),
  },
});

try {
  model.options.set({ presolve: "on", output_flag: false });
  const run = model.run();
  const solution = model.getSolution();

  console.log(run.modelStatus, solution.colValue);

  // Reuse the native instance and its allocations.
  model.changeColCost(1, 3);
  model.run();
  console.log(model.getObjectiveValue());
} finally {
  model.dispose();
}
```

`dispose()` is idempotent. Any other operation after disposal throws
`HighsDisposedError`. `clearModel()` removes the current model while retaining
the instance and options; `clearSolver()` clears solver state; `clear()` resets
the complete native instance state. `releaseMemory()` asks HiGHS to release
reusable internal memory without destroying the model handle.

### Sparse input

Matrices use compressed sparse column (`"csc"`) or compressed sparse row
(`"csr"`) input. `starts` has the conventional trailing sentinel and therefore
has length `numCols + 1` for CSC or `numRows + 1` for CSR. `indices.length` and
`values.length` must equal the sentinel value. Indices are zero-based.

The wrapper validates dimensions, array lengths, monotonic starts, index ranges,
integer conversion, and allocation-size overflow before calling WebAssembly.
Validation failures throw `HighsValidationError` in the model API.

Selections are tagged so that range, set, and mask calls cannot be confused:

```js
model.getCols({ kind: "range", from: 2, to: 8 });
model.getRows({ kind: "set", indices: new Int32Array([1, 4, 7]) });
model.deleteCols({ kind: "mask", mask: new Uint8Array([0, 1, 0, 1]) });
```

Ranges follow the inclusive endpoints used by the HiGHS C API. Set indices
must increase strictly. Masks contain exactly one boolean, `0`, or `1` per
current model row or column. Mutation arrays for ranges and sets follow the
selected entries; mutation arrays used with masks span the full dimension, as
required by the C API.

## Status and error behavior

The persistent convenience API converts `kHighsStatusError` (`-1`) to a typed
`HighsError`. A successful call returns metadata containing the original
status. Warnings are never silently promoted to OK:

```js
const result = model.presolve();
// result.status is 0 (OK) or 1 (warning)
console.log(result.warnings);
console.log(model.lastCall);
```

Input errors use `HighsValidationError`, unsupported option policy uses
`HighsUnsupportedOptionError`, callback recursion uses
`HighsReentrancyError`, and use-after-dispose uses `HighsDisposedError`.

Use `highs.raw` when exact native-style status propagation is preferable:

```js
const rawModel = highs.raw.createModel();

try {
  const passed = rawModel.passLp(modelData);
  if (passed.status === -1) return;

  const ran = rawModel.run();
  if (ran.status === -1) return;

  const solution = rawModel.getSolution();
  if (solution.status !== -1) console.log(solution.value.colValue);
} finally {
  rawModel.dispose();
}
```

Raw mutators return `{status: -1 | 0 | 1}`. Raw getters that can fail return a
discriminated result: `{status: -1}` for an error, or `{status: 0 | 1, value}`
for OK and warning results. The raw API is C-shaped, but is not a pointer
escape hatch: it still validates and copies memory and uses JavaScript data
structures.

The legacy Emscripten module still contains underscored linker symbols needed
by the established `solve()` implementation. They are retained for runtime
compatibility, but are not part of the documented raw API; persistent handles
use native JavaScript private fields and never expose their pointer.

## Memory ownership

Input arrays may be ordinary readonly arrays or the documented typed arrays.
They are copied into temporary packed WebAssembly allocations for the duration
of a call. Temporary allocations are freed even when validation, native code,
or callback handling fails.

Every returned `Float64Array`, `Int32Array`, and `Uint8Array` is a detached,
JavaScript-owned copy. It does not alias the WebAssembly heap and remains valid
after memory growth, another solver call, `clearModel()`, or `dispose()`.
Mutating a returned array never mutates the solver.

This safety contract intentionally excludes zero-copy heap views. For repeated
solves, keep a model alive and use mutation methods such as
`changeColsCost()` and `changeRowsBounds()`; avoiding model reconstruction is
the supported performance optimization.

`HighsInt` arrays are represented as `Int32Array` in this build. Runtime fields
`intBytes` and `intBits` report the native width. HiGHS 64-bit information
values use JavaScript `bigint`; converting them to `number` is the caller's
choice and may lose precision.

## Options and information

The new API accepts exact HiGHS `snake_case` option names. Names and types are
queried from the embedded HiGHS runtime rather than maintained as a second
hard-coded option list:

```js
model.options.set("presolve", "on");
model.options.set({ mip_rel_gap: 1e-6, output_flag: false });
console.log(model.options.get("mip_rel_gap"));
console.log(model.options.describe("mip_rel_gap"));
console.log(model.options.names());
console.log(model.info.get("simplex_iteration_count"));
```

HiGHS does not expose option descriptions through the C API, so
`describe(name)` reports type, current value, default, and numeric range only.
Information values use `number` or `bigint`, based on `Highs_getInfoType`.

### Single-thread policy

The WebAssembly build is intentionally single-threaded. The extended option API
rejects thread, parallel, and concurrency options, including future options
whose names indicate the same behavior. This avoids exposing settings that
cannot take effect reliably across Node, browsers, Workers, cross-origin
isolation policies, and Emscripten worker pools.

The legacy option type and `solve(problem, options)` handling retain their
previous fields for source and runtime compatibility. New code must not infer
that a retained legacy field enables WebAssembly threads.

Options that name files or paths, and options that ask HiGHS to write to a
file, are also rejected by the new API. Use the data-only methods below.

## Data-only I/O

No public extended API accepts a virtual-filesystem path. File-oriented native
operations use private, uniquely named temporary files that are cleaned up
before the call returns:

```js
model.readModel({ format: "lp", data: lpText });
const lpTextAgain = model.exportModel("lp");
const mpsBytes = model.exportModel("mps");

model.options.read("presolve = on\noutput_flag = false\n");
const changedOptions = model.options.export(true);
const prettySolution = model.exportSolution(true);
```

LP data is text. MPS may contain arbitrary bytes and is returned as
`Uint8Array`. Gzip input and output are unsupported because this build disables
zlib. Public path-based model, option, and solution APIs are deliberately not
provided.

## Callbacks

Callbacks run synchronously inside `model.run()`. They must return before the
solver can continue, and returning a Promise is unsupported. Callback payload
arrays are detached snapshots. The only solver-affecting operations allowed
from a callback are the methods on the event itself:

```js
const simplexInterrupt = highs.constants.callbackType.simplexInterrupt;

model.run({
  [simplexInterrupt](event) {
    if (shouldStop()) event.interrupt();
  },
});
```

Do not call model methods recursively from a callback. Such calls throw
`HighsReentrancyError`. Controls are capability-specific:

| Callback types | Data | Controls |
| --- | --- | --- |
| logging (`0`) | `log_type`, message | none |
| simplex/IPM interrupt (`1`, `2`) | the matching iteration count | `interrupt()` |
| MIP solution/improving solution (`3`, `4`) | MIP scalar data and `mip_solution` | none |
| MIP logging (`5`) | MIP scalar data | none |
| MIP interrupt (`6`) | MIP scalar data | `interrupt()` |
| MIP cut pool (`7`) | MIP scalar data and `cut_pool` | none |
| MIP user solution (`9`) | MIP scalar data | `setSolution()`, `repairSolution()` |

The event union in `highs.d.ts` exposes only controls that the native callback
type can honor. If a callback throws, the wrapper requests interruption when
that callback is interruptible and rethrows the original JavaScript exception
after the active native call unwinds. Logging payloads are intentionally
limited to `log_type`; HiGHS does not initialize solver metrics for a logging
event.

The high-level API supports callback types that are active in the stable C API.
The inert lazy-constraint callback type and the PDLP-specific callback type are
not exposed.

## Model snapshots and cloning

There is no implicit `clone()` because copying native solver state would be
expensive and the stable C API provides no clone operation. Make the cost
explicit:

```js
const snapshot = model.getModel("csc"); // numerical data; names are not included
const copy = highs.createModel(snapshot);
```

The snapshot consists entirely of detached data, so it is safe to store or
send to another Worker. Model, row, and column names are not part of the stable
bulk-extraction C calls; copy names explicitly when they matter.
