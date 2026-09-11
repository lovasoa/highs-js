# Import and export a model

This example parses LP text in a Web Worker, retains the resulting native HiGHS
model, and can export or solve that same model. Serve the `demo/` directory over
HTTP and mount `ui.template.html`; WebAssembly workers do not load reliably from
a `file:` URL.

## Lifecycle

1. `ui.js` creates an example-local Worker and sends the editor contents.
2. `ioLoad` parses the text with `highs.createModel({ format: "lp", data })`.
3. The Worker disposes the previous model only after the replacement parses.
4. `ioExport` serializes the retained model with `exportModel("lp")`.
5. `ioSolve` runs that same handle and reads its objective and primal solution
   only when HiGHS reports that a feasible primal is available.

LP uses strings. [MPS format](https://en.wikipedia.org/wiki/MPS_(format))
integrations may use `Uint8Array` so bytes survive the Worker boundary exactly.
Exported text is HiGHS' normalized internal model, not
a round trip of comments, whitespace, or source layout. Loading is the explicit
state boundary: editing the textarea alone does not mutate the Worker model. A
production integration should terminate the Worker when its view is removed;
that releases both the persistent model and Wasm runtime.
