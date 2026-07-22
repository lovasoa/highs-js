# Migration guide

The migration is additive. Existing `solve()` calls do not need to move, and a
project can migrate one solve path at a time.

## 1. Keep the loader and legacy result stable

This remains supported in CommonJS:

```js
const highs = await require("highs")();
const legacyResult = highs.solve(lpText, legacyOptions);
```

The same default factory is available to native ES modules:

```js
import loadHighs from "highs";

const highs = await loadHighs();
const legacyResult = highs.solve(lpText, legacyOptions);
```

Do this module-format migration independently from the solver-API migration.
It keeps failures small and makes it clear whether a difference came from the
loader or model handling.

## 2. Replace repeated text parsing with a persistent model

When an application repeatedly solves a model, load it once and retain the
native handle:

```js
const model = highs.createModel({ format: "lp", data: lpText });

try {
  model.options.set({ presolve: "on", output_flag: false });
  model.run();
  const first = model.getSolution();

  model.changeColBounds(4, 0, 12);
  model.run();
  const second = model.getSolution();
} finally {
  model.dispose();
}
```

At this stage, compare objective values, model statuses, and primal values with
the legacy result in application tests. Do not compare the complete objects:
the legacy API returns name-keyed objects parsed from pretty solution text,
while the new API returns indexed typed arrays directly from the C API.

## 3. Move options to runtime-checked names

The persistent API uses exact HiGHS `snake_case` names:

```js
model.options.set("mip_rel_gap", 1e-6);
model.options.set("presolve", "on");
```

Thread, parallel, concurrency, path, and file-output options are forbidden in
the persistent and raw APIs. Remove them or retain that solve on the legacy API
until its configuration can be changed. The WebAssembly runtime remains
single-threaded even though legacy fields are retained for compatibility.

Use `model.options.names()` and `model.options.describe(name)` when adapting to
a different embedded HiGHS version. Option documentation is not synthesized by
the wrapper because the C API does not expose descriptions.

## 4. Prefer structured data for generated models

Applications that already hold sparse arrays should avoid serializing LP text.
Build `ModelData` with CSC or CSR arrays and call `createModel(modelData)` or
`passModel(modelData)`. The wrapper accepts ordinary arrays, but using
`Float64Array` and `Int32Array` avoids intermediate JavaScript conversion.

Keep conventional sparse starts, including the final nonzero-count sentinel.
All inputs are validated before the native call, so malformed arrays fail
without partially mutating the model.

## 5. Choose high-level or raw status handling per boundary

Use `Model` in most application code. It throws typed errors on native error,
retains warning status in return metadata, and provides `lastCall` for
inspection.

Use `highs.raw` at a boundary that already switches on native return codes.
Check `status === -1` before reading a getter's optional `value`. The raw API
does not expose pointers or WebAssembly memory.

## 6. Make ownership explicit

Wrap each persistent model in `try`/`finally` and call `dispose()`. Reuse one
model only on the JavaScript thread that owns it; use one runtime/model per
Worker for parallel application-level jobs.

Returned arrays are detached copies. Cache them when useful, but remember that
they are snapshots and are not updated by a subsequent solve. To change the
native model, call an explicit mutation method.

## 7. Move filesystem workflows to data

Replace public Emscripten filesystem paths with content:

- `readModel({format, data})` for LP or MPS input;
- `exportModel(format)` and `exportPresolvedModel(format)` for model output;
- `model.options.read(text)` and `model.options.export(...)` for options;
- `exportSolution(pretty)` for solution output.

LP and option data are strings; MPS output is a `Uint8Array`. Gzip is not
available. Temporary internal files are an implementation detail and are
removed before each method returns.

## 8. Move long solves into a Worker before adding callbacks

The solver and callback bridge are synchronous. First put the complete runtime
inside a Worker, then add callbacks. Callback code must not await, call back
into the model, or retain callback-owned native state. Use only the event's
`setSolution`, `repairSolution`, and `interrupt` controls.

An exception thrown in a callback is rethrown by `run()` after the native solver
unwinds, so normal application error handling still applies.

## Compatibility checklist

- Existing `require("highs")` and the default async factory still work.
- Existing `solve(problem, options)` inputs and result shape are unchanged.
- Existing legacy option declarations, including historical thread-related
  fields, remain available.
- Existing logging hooks and direct legacy exports remain available.
- All new capabilities are additive and feature-detectable with
  `typeof highs.createModel === "function"`.
- Persistent results use typed arrays and must not be substituted blindly for
  the legacy name-keyed result.
- Dispose persistent handles; the legacy one-shot API needs no new cleanup.
