# Build sparse models

This example builds three continuous [linear programs](https://en.wikipedia.org/wiki/Linear_programming) from application data: [production planning](https://en.wikipedia.org/wiki/Production_planning), a minimum-cost [diet problem](https://en.wikipedia.org/wiki/Diet_problem), and a [transportation problem](https://en.wikipedia.org/wiki/Transportation_theory_(mathematics)).

## Files

- `ui.template.html` contains all three interactive model views.
- `ui.js` reads the controls, converts each dense teaching matrix to [compressed sparse column (CSC) form](https://en.wikipedia.org/wiki/Sparse_matrix#Compressed_sparse_column_(CSC_or_CCS)), and renders solutions.
- `worker.js` implements only the `buildSolve` action with the persistent model API.

## API and matrix sequence

The UI sends column costs and bounds, row bounds, and a compressed sparse column matrix. In CSC, `starts[j]` points to the first nonzero for column `j`, while each entry in `indices` gives that coefficient's row and the matching `values` entry gives its value. The worker calls `createModel()`, `passModel()`, disables solver logging, calls `run()`, reads `getSolution()` and `getObjectiveValue()`, then calls `dispose()` to release native memory. All columns in these examples are continuous.

Serve `demo/` over HTTP rather than using `file://`, because workers and WebAssembly need an HTTP origin. For example, run `python3 -m http.server` from the repository root.
