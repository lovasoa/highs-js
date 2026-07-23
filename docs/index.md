---
layout: docs
title: Extended API documentation
description: Choose and use the compatibility, persistent, and raw highs-js APIs.
permalink: /docs/
---

# Extended API documentation

highs-js exposes the stable, usable HiGHS C API while keeping the original
`solve(lpText, options)` interface intact. Choose the narrowest interface that
fits the workload.

| API | Best fit |
| --- | --- |
| Compatibility `solve()` | One solve from existing CPLEX LP text |
| Persistent `Model` | Repeated solves, model mutation, typed sparse input, and analysis |
| `highs.raw` | Structured calls that preserve native HiGHS status codes |

## Guides

- [Extended API guide](api/): loading, model data, ownership, errors, options,
  callbacks, and data-only I/O.
- [Migration guide](migration/): keep results stable while moving one workflow
  at a time, with an exact result mapping and parity harness.
- [JavaScript-to-C API mapping](c-api-mapping/): the native function behind
  each JavaScript operation and deliberate exclusions.
- [Canonical TypeScript declaration](https://github.com/lovasoa/highs-js/blob/main/types.d.ts):
  every method signature, overload, callback event, and result type.

All solver calls are synchronous after the asynchronous loader resolves. Use a
Web Worker when a solve must not block the browser main thread. Returned typed
arrays are detached JavaScript-owned snapshots, and persistent models must be
disposed.

## Try it

- [Compatibility demo]({{ '/' | relative_url }})
- [Persistent API Worker demo]({{ '/extended/' | relative_url }})
- [Source and issue tracker](https://github.com/lovasoa/highs-js)
