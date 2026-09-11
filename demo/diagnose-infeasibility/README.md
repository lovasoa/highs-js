# Diagnose infeasibility

This example solves an LP, verifies that HiGHS proved it infeasible, and calls
`getIis()` to isolate one irreducible infeasible subsystem (IIS). Serve `demo/`
over HTTP and load the template and module from this directory; the Worker
loads `../highs.js` and its adjacent Wasm binary.

**New to conflict analysis?** Read the first-party guide to
[irreducible infeasible subsystems](../concepts/irreducible-infeasible-subsystem/)
before using the result to change a model.

## Assumptions

- The initial solve must return the `infeasible` model status. A feasible,
  unbounded, or interrupted model has no proved conflict to analyze.
- An IIS is irreducible: removing any returned member resolves that particular
  conflict. It is not necessarily the smallest conflict, and other IISs may
  exist.
- `highs.constants.iis.strategyColPriority` is `14`: it combines the from-LP,
  irreducible, and column-priority strategy bits to request a true IIS.

## Returned data

The Worker returns the solve status and elapsed time. For an infeasible model,
`iis.colIndices` and `iis.rowIndices` identify participating columns and rows in
the loaded model. `colBoundCodes` and `rowBoundCodes` preserve the native enum
values; `colBounds` and `rowBounds` translate them into lower, upper, boxed, or
free labels. Status arrays and a snapshot of model names and bounds provide the
context needed to explain each conflict member.

The [IIS concept guide](../concepts/irreducible-infeasible-subsystem/) explains
how to map these arrays back to model rows and variable bounds, interpret each
bound status, and debug safely when more than one IIS may exist.
