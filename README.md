# highs-js

[![npm version](https://badge.fury.io/js/highs.svg)](https://www.npmjs.com/package/highs)
[![CI status](https://github.com/lovasoa/highs-js/actions/workflows/CI.yml/badge.svg)](https://github.com/lovasoa/highs-js/actions/workflows/CI.yml)
[![package size](https://badgen.net/bundlephobia/minzip/highs)](https://bundlephobia.com/result?p=highs)

This is a javascript mixed integer linear programming library.
It is built by compiling a high-performance C++ solver developed by the University of Edinburgh, ([HiGHS](https://highs.dev)), to WebAssembly using emscripten.

## Versioning

The package major and minor version match the embedded HiGHS major and minor
version. For example, `1.14.x` contains HiGHS `v1.14.x`. The patch version may
differ when highs-js releases JavaScript API changes or bug fixes without
changing the embedded HiGHS version.

## Demo

See the online demo at: https://lovasoa.github.io/highs-js/

The [extended API demo](https://lovasoa.github.io/highs-js/extended/) shows
persistent model reuse in a Web Worker.

## Usage

```js
const highs_settings = {
  // In node, locateFile is not needed
  // In the browser, point locateFile to the URL of the wasm file (see below)
  locateFile: (file) => "https://lovasoa.github.io/highs-js/" + file
};
const highs_promise = require("highs")(highs_settings);

const PROBLEM = `Maximize
 obj:
    x1 + 2 x2 + 4 x3 + x4
Subject To
 c1: - x1 + x2 + x3 + 10 x4 <= 20
 c2: x1 - 4 x2 + x3 <= 30
 c3: x2 - 0.5 x4 = 0
Bounds
 0 <= x1 <= 40
 2 <= x4 <= 3
End`;

const EXPECTED_SOLUTION = {
  Status: 'Optimal',
  ObjectiveValue: 87.5,
  Columns: {
    x1: {
      Index: 0,
      Status: 'BS',
      Lower: 0,
      Upper: 40,
      Type: 'Continuous',
      Primal: 17.5,
      Dual: -0,
      Name: 'x1'
    },
    x2: {
      Index: 1,
      Status: 'BS',
      Lower: 0,
      Upper: Infinity,
      Type: 'Continuous',
      Primal: 1,
      Dual: -0,
      Name: 'x2'
    },
    x3: {
      Index: 2,
      Status: 'BS',
      Lower: 0,
      Upper: Infinity,
      Type: 'Continuous',
      Primal: 16.5,
      Dual: -0,
      Name: 'x3'
    },
    x4: {
      Index: 3,
      Status: 'LB',
      Lower: 2,
      Upper: 3,
      Type: 'Continuous',
      Primal: 2,
      Dual: -8.75,
      Name: 'x4'
    }
  },
  Rows: [
    {
      Index: 0,
      Name: 'c1',
      Status: 'UB',
      Lower: -Infinity,
      Upper: 20,
      Primal: 20,
      Dual: 1.5
    },
    {
      Index: 1,
      Name: 'c2',
      Status: 'UB',
      Lower: -Infinity,
      Upper: 30,
      Primal: 30,
      Dual: 2.5
    },
    {
      Index: 2,
      Name: 'c3',
      Status: 'UB',
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: 10.5
    }
  ]
};

async function test() {
  const highs = await highs_promise;
  const sol = highs.solve(PROBLEM);
  require("assert").deepEqual(sol, EXPECTED_SOLUTION);
}
```

The problem has to be passed in the [CPLEX .lp file format](http://web.mit.edu/lpsolve/doc/CPLEX-format.htm).

For a more complete example, see the [`demo`](./demo/) folder.

### Persistent and raw APIs

The legacy `solve(problem, options)` API above remains supported unchanged.
For repeated solves, typed sparse input, mutation, callbacks, basis analysis,
IIS/ranging, and the rest of the stable HiGHS C API, create a persistent model:

```js
import loadHighs from "highs";

const highs = await loadHighs();
const model = highs.createModel({ format: "lp", data: PROBLEM });
try {
  model.options.set({ output_flag: false, presolve: "on" });
  const run = model.run();
  const solution = model.getSolution(); // detached Float64Array values
  console.log(run.modelStatus, solution.colValue);
} finally {
  model.dispose();
}
```

CommonJS (`require("highs")`) and native ESM (`import ... from "highs"`) use
the same `highs.wasm` binary. The WebAssembly build is deliberately
single-threaded. New APIs reject thread/concurrency and file/path options; use
the data-only model, options, and solution I/O methods instead.

See the [extended API guide](./docs/api.md), [migration guide](./docs/migration.md),
and [complete JavaScript-to-C mapping](./docs/c-api-mapping.md).

### Loading the wasm file

This package requires a wasm file.
You can find it in `node_modules/highs/build/highs.wasm` inside the NPM package,
or download it from the [release page](https://github.com/lovasoa/highs-js/releases).
By default, it will be loaded from the same path as the javascript file,
which means you have to add the wasm file to your assets.

Alternatively, if you don't want to bother with that, 
if you are running highs-js in a web browser (and not in node),
you can load the file directly from github:

```js
const highs_loader = require("highs");

const highs = await highs_loader({
  // In a browser, one can load the wasm file from github
  locateFile: (file) => "https://lovasoa.github.io/highs-js/" + file
});
```
## Passing custom options

HiGHS is configurable through [a large number of options](https://ergo-code.github.io/HiGHS/dev/options/definitions/).

You can pass options as the second parameter to `solve` : 

```js
const highs_promise = require("highs")(highs_settings);
const highs = await highs_promise;
const sol = highs.solve(PROBLEM, {
  "allowed_cost_scale_factor": 2,
  "run_crossover": true,
  "presolve": "on",
});
```
