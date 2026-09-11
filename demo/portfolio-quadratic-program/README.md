# Portfolio quadratic program

This [quadratic programming](https://en.wikipedia.org/wiki/Quadratic_programming) example applies [Markowitz modern portfolio theory](https://en.wikipedia.org/wiki/Modern_portfolio_theory) to minimize the variance of a three-asset portfolio while enforcing full investment and a minimum expected return.

The API sequence is:

1. Convert the budget and return constraints to a column-wise sparse matrix.
2. Create a persistent model and call `passModel()` for the linear constraints and bounds.
3. Call `passHessian()` with one triangle of the symmetric quadratic matrix.
4. Disable solver output, call `run()`, and read `getSolution().colValue` and `getObjectiveValue()`.
5. Dispose the native model after copying the result into JavaScript values.

HiGHS evaluates `1/2 x'Qx + c'x`. The Hessian values are therefore twice the portfolio covariance values. The matrix must define a convex minimization problem with a [positive-semidefinite Hessian](https://en.wikipedia.org/wiki/Definite_matrix); HiGHS does not solve non-convex QP or mixed-integer QP models.

`ui.js` keeps DOM and visualization work on the main thread. `worker.js` owns the Wasm runtime and implements only the `qpSolve` request used by this example.
