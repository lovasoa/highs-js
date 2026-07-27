# LP sensitivity analysis

This example solves a continuous [linear program][linear-programming] and calls
`getRanging()` to perform [sensitivity analysis][sensitivity-analysis]: it
measures how far one objective coefficient or bound can move while the current
optimal [simplex basis][simplex] remains optimal. Serve `demo/` over HTTP and
load the template and module from this directory; the Worker loads `../highs.js`
and its adjacent Wasm binary.

## Assumptions

- The model is an LP with an optimal, valid simplex basis. Check the
  `basis_validity` info item before requesting ranges. Ranging does not apply
  to MIP or QP solutions.
- Each reported interval assumes one coefficient or bound changes at a time.
  It does not guarantee basis stability for simultaneous changes.
- Infinite endpoints mean that HiGHS found no finite limiting value in that
  direction.

## Returned data

The Worker returns the model status, objective sense and value, model names and
bounds, primal and dual solution arrays, and column/row basis statuses. The
`ranging` object contains `colCostDown`, `colCostUp`, `colBoundDown`,
`colBoundUp`, `rowBoundDown`, and `rowBoundUp`. Each record has parallel
`value`, `objective`, `inVariable`, and `outVariable` arrays. `value` is the
absolute limiting endpoint, not a delta. Entering and leaving variables use an
augmented index space containing columns followed by rows, with `-1` for none.

[linear-programming]: https://en.wikipedia.org/wiki/Linear_programming
[sensitivity-analysis]: https://en.wikipedia.org/wiki/Sensitivity_analysis
[simplex]: https://en.wikipedia.org/wiki/Simplex_algorithm
