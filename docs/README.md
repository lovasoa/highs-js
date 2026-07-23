# Extended API documentation

The extended highs-js API exposes the stable, usable HiGHS C API while keeping
the original `await require("highs")().solve(lp, options)` interface intact.
The rendered version of these guides is published at
[lovasoa.github.io/highs-js/docs](https://lovasoa.github.io/highs-js/docs/).
Choose the narrowest interface that fits the job:

- [Migration guide](migration.md): move from the legacy one-shot solver to a
  persistent model without changing results all at once.
- [API guide](api.md): model data, status handling, options, callbacks, I/O,
  ownership, CommonJS, and ES modules.
- [Options reference](options.md): every HiGHS option available in highs-js,
  generated from the runtime.
- [C API mapping](c-api-mapping.md): the native HiGHS function behind each
  JavaScript operation and the deliberately excluded surface.

The legacy API remains the compatibility path. The persistent `Model` API is
the performance path for applications that solve repeatedly, mutate models, or
need basis, ranging, IIS, ray, callback, and inspection functionality. The
`raw` API is intended for callers that need to preserve HiGHS status codes
instead of receiving JavaScript exceptions.

All extended APIs are synchronous after the asynchronous module loader has
resolved. They run in the calling JavaScript thread. Use a Web Worker when a
solve must not block a browser's main thread; see the
[extended browser example](../demo/extended/).
