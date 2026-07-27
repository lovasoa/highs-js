# Solve LP text

This example solves a [linear programming](https://en.wikipedia.org/wiki/Linear_programming) model that maximizes `3x + 2y` under two resource constraints. The model is written in human-readable CPLEX LP format and solved in one call.

## Files

- `ui.template.html` contains the complete interactive panel.
- `ui.js` sends edited LP text to a dedicated worker and renders the result.
- `worker.js` loads HiGHS and implements only the `solveLP` action.

## API sequence

The worker loads `highs.js`, awaits `Module()`, then calls `highs.solve(lpText, { output_flag: false })`. The returned object names columns and rows exactly as the LP text does. This one-shot API parses and solves the model on every call.

Serve `demo/` over HTTP rather than opening the template with `file://`; browsers require an HTTP origin to load the worker and WebAssembly files. For example, run `python3 -m http.server` from the repository root and open the demo URL it prints.
