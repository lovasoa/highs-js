# Inspect solver options

This example keeps one HiGHS model alive inside a Web Worker and uses its
`options` store to list, describe, change, and reset solver settings. Serve the
`demo/` directory over HTTP and mount `ui.template.html`; WebAssembly workers do
not load reliably from a `file:` URL.

## Lifecycle

1. `ui.js` creates the example-local Worker.
2. The Worker loads `../highs.js` once and lazily creates one model.
3. `optionsList` calls `model.options.names()` and `describe()` for display.
4. `optionsSet` mutates that model, so later calls see the changed value.
5. `optionsReset` restores every option on the model to its HiGHS default.

Option descriptors provide the native type, current/default values, and numeric
limits for settings such as [presolve](https://doi.org/10.1287/ijoc.2018.0857).
Values are validated by HiGHS rather than by the table UI. Thread,
concurrency, and native-filesystem options are unavailable in WebAssembly, so
`options.names()` omits them from the listing. A production integration
should terminate the Worker when its owning view is removed; terminating it
releases the persistent model and Wasm runtime together.
