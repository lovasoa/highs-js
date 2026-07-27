# Mixed-integer models

This example solves two [mixed-integer programming](https://en.wikipedia.org/wiki/Integer_programming) models: a 0/1 [knapsack problem](https://en.wikipedia.org/wiki/Knapsack_problem) and a capacitated [facility-location problem](https://en.wikipedia.org/wiki/Optimal_facility_location). Knapsack columns decide whether each item is selected. Facility columns combine binary warehouse-opening decisions with continuous shipment quantities.

## Files

- `ui.template.html` contains both interactive MIP views.
- `ui.js` validates inputs, assembles model arrays, and renders incumbent solutions.
- `worker.js` implements only the `mipSolve` action.

## API, matrix, and integrality sequence

The worker calls `createModel()` and `passModel()` with objective and bound arrays plus a [compressed sparse column (CSC) constraint matrix](https://en.wikipedia.org/wiki/Sparse_matrix#Compressed_sparse_column_(CSC_or_CCS)). `starts` partitions coefficients by column, `indices` stores row numbers, and `values` stores coefficients. The parallel `integrality` array marks each column as `integer` or `continuous`; an integer column with bounds `[0, 1]` is binary. After `run()`, the worker reads `getSolution()`, the objective, and `info.get("mip_gap")`, then disposes the model.

Serve `demo/` over HTTP rather than using `file://`, because workers and WebAssembly need an HTTP origin. For example, run `python3 -m http.server` from the repository root.
