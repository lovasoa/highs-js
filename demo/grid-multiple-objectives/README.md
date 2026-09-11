# Grid dispatch with multiple objectives

This [multi-objective optimization](https://en.wikipedia.org/wiki/Multi-objective_optimization) example dispatches clean generation, gas, imports, and unserved demand over twelve periods. It compares [lexicographic optimization](https://en.wikipedia.org/wiki/Lexicographic_optimization) with the [weighted-sum method](https://en.wikipedia.org/wiki/Weighted_sum_model).

The API sequence is:

1. Build one continuous dispatch column per source and period, with equality rows matching demand.
2. Call `passModel()` with zero ordinary column costs.
3. Set `blend_multi_objectives` to select a weighted blend or descending priorities.
4. Add reliability, carbon, and operating-cost vectors with `addLinearObjective()`.
5. Call `run()`, read `getSolution().colValue`, and calculate each policy result from its own coefficient vector.
6. Dispose the native model after producing detached result arrays.

Adding any auxiliary linear objective causes HiGHS to ignore the ordinary `colCost` objective, so every intended goal must be represented with `addLinearObjective()`. In ordered mode, carbon uses an absolute tolerance and a negative relative tolerance: leaving relative tolerance at zero would prevent the permitted carbon degradation.

`ui.js` switches the explanation and plot between policy modes. `worker.js` owns the Wasm model and exposes only the `multiObjectiveGrid` request.
