# Extended browser demo

This Worker-based demo exercises the persistent API when it is available and
falls back to the compatibility `solve()` API when viewing a build that
predates it. The feature check is:

```js
typeof highs.createModel === "function"
```

The release workflow places `highs.js` and `highs.wasm` in the parent `demo/`
directory. Serve that directory over HTTP and open `/extended/`; WebAssembly
loading will not work reliably from a `file:` URL.

The model handle is retained inside the Worker. “Load edited LP” is the explicit
parse boundary. The cost/bound controls then call `changeColCost()` and
`changeColBounds()` before rerunning that same native model. The result includes
a readable model status and the first column's cost-ranging interval.
