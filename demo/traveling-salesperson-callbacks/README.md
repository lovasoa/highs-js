# Traveling salesperson callbacks

This example builds an asymmetric [traveling salesperson problem](https://en.wikipedia.org/wiki/Travelling_salesman_problem) as a [mixed-integer program](https://en.wikipedia.org/wiki/Integer_programming), solves it with [branch-and-cut](https://en.wikipedia.org/wiki/Branch_and_cut), and streams search progress through [callbacks](https://en.wikipedia.org/wiki/Callback_(computer_programming)) from a dedicated [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) without blocking the page.

The API sequence is:

1. Build binary arc columns, degree equalities, and Miller-Tucker-Zemlin subtour rows in CSC form.
2. Call `passModel()`, configure MIP logging, and seed a feasible tour with `setSolution()`.
3. Call `run()` with handlers keyed by `highs.constants.callbackType`.
4. Copy callback snapshots before posting incumbents and metrics to the UI.
5. Interrupt from `mipInterrupt` when its shared atomic flag is set, then call `run()` again to resume the retained model.
6. Dispose and rebuild only when the user requests a fresh search.

Callbacks run synchronously inside `model.run()`, so ordinary Worker messages cannot be handled until the solve returns. A `SharedArrayBuffer` lets the UI set a flag while the Worker is blocked; the native interruption callback reads it with `Atomics.load()`. Without cross-origin isolation, stopping must terminate the Worker and loses the retained model.

The model deliberately starts with a crossing tour. Improving-solution callbacks carry detached solution snapshots, which the Worker converts to routes before returning control to HiGHS.
