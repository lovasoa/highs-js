**highs-js** compiles the [HiGHS](https://highs.dev/) C++ linear, mixed-integer,
and quadratic optimization solver to WebAssembly. It publishes a dual-format npm
package (`require` and `import`) that runs in Node.js ≥18 and modern browsers.

The package exposes two layers:

1. **Legacy (one-shot) API** — `highs.solve(problem, options)` accepts a model in
   CPLEX LP text format and returns a name-keyed result object. This is the
   compatibility entry point declared as the default export in [types.d.ts](./types.d.ts).
2. **Extended (persistent) API** — `highs.createModel()` / `highs.raw` expose the
   full HiGHS C interface with typed model-building, incremental solves, callbacks,
   basis access, ranging, etc. The runtime implementation lives in the
   [extended runtime source](./src/extended.ts) and the [C++ bridge](./src/highs_js_bridge.cpp).


## Dev Container

The project provides a pre-configured dev container via
[devcontainer.json](./.devcontainer/devcontainer.json) and
[compose.yaml](./compose.yaml). The container installs Emscripten, CMake,
and all npm dependencies, then runs a full build (`npm ci && npm run build`).

When you are running outside the dev container:
  ```sh
  # Run the full CI pipeline (install, build, test) in a disposable container:
  docker compose run --rm tests

  # Open a shell in the container for iterative development:
  docker compose run --rm tests bash -l
  ```

Any command that requires Emscripten (such as `npm run build`) should be run
inside the container via `docker compose run --rm tests <command>` if the host
system does not have a working Emscripten installed. The container's entrypoint
sources `/emsdk/emsdk_env.sh` automatically, so no manual setup is needed.

```sh
# Run a build inside the container
docker compose run --rm tests npm run build

# Run tests inside the container after a build
docker compose run --rm tests npm test

# Check the API manifest inside the container
docker compose run --rm tests npm run check:api
```

---

## Project Layout

| Path | Purpose |
|---|---|
| [HiGHS/](./HiGHS/) | Vendored HiGHS C++ source (git submodule) |
| [src/](./src/) | TypeScript & C++ glue between JS and HiGHS |
| [C++ bridge](./src/highs_js_bridge.cpp) | Custom C++ bridge exposing HiGHS functions to Emscripten |
| [Extended runtime](./src/extended.ts) | TypeScript runtime that decorates the Emscripten module with the extended (persistent) API |
| [Emscripten preamble](./src/pre.js) | Emscripten `--pre-js` preamble |
| [Emscripten postamble](./src/post.js) | Emscripten `--post-js` postamble |
| [Additional type declarations](./src/types/) | Extra type declarations |
| [build/](./build/) | Build output: `highs.js` (CJS), `highs.mjs` (ESM), `highs.wasm`, and generated code |
| [Build script](./build.sh) | Full build script (CMake → Emscripten link → CJS + ESM) |
| [Public type declarations](./types.d.ts) | Public TypeScript declarations for both legacy and extended APIs |
| [api/](./api/) | Audited C API inventory and DTS audit schemas |
| [API manifest generator](./scripts/generate-highs-api.mjs) | Generates the expanded API manifest and export list from the hand-maintained JSON |
| [Package test script](./scripts/test-packed-package.mjs) | Verifies the packed npm package contents |
| [Exported functions](./exported_functions.json) | List of C functions exported to WebAssembly |
| [tsconfig.json](./tsconfig.json) | Type-checks `src/` for JS type errors (no emit) |
| [tsconfig.runtime.json](./tsconfig.runtime.json) | Compiles `src/extended.ts` → `build/generated/extended.js` |
| [Tests](./tests/) | Test suites |
| [Extended tests](./tests/extended/) | Extended (persistent) API tests, each a standalone `node:test` suite |
| [Declaration tests](./test-dts/) | TypeScript declaration tests (compilation-only with `--noEmit`) |
| [Benchmarks](./benchmarks/) | Runtime and size regression benchmarks |
| [compose.yaml](./compose.yaml) | Docker Compose setup for the dev container |

---

## Architecture

The build pipeline works as follows:

1. The [API manifest generator](./scripts/generate-highs-api.mjs) reads
   the hand-maintained [C API manifest](./api/highs-c-api.json), validates it
   against the vendored HiGHS headers, and generates the
   [expanded API descriptor](./api/highs-c-api.generated.json) and the
   [linker export list](./exported_functions.json).
2. **`tsc`** compiles the [extended runtime](./src/extended.ts) via
   [tsconfig.runtime.json](./tsconfig.runtime.json) to
   `build/generated/extended.js`. This keeps the handwritten marshalling code
   type-checkable without modifying the generated loader.
3. **`emcmake cmake`** configures the vendored HiGHS C++ source into CMake.
4. **`emmake make`** compiles HiGHS into object files.
5. **`emcc`** links the object files with the glue code into two loaders:
   - `build/highs.js` — CommonJS (MODULARIZE=1)
   - `build/highs.mjs` — Native ES module (MODULARIZE=1 + EXPORT_ES6=1)

   Both link passes inject the [preamble](./src/pre.js), the
   [marshalling postamble](./src/post.js), and the compiled
   [persistent API layer](./build/generated/extended.js) via `--pre-js`/`--post-js`.
   They share the same object files and flags, so `build/highs.wasm` is identical
   after either pass.

---

## Test Suites

### Legacy tests ([tests/test.js](./tests/test.js))
Exercises the one-shot `highs.solve()` path with CPLEX LP models and asserts
numerical results. Run with `node tests/test.js`.

### Extended tests ([tests/extended/](./tests/extended/))
Node.js native test suite (`node:test`). Each file is a standalone test. Run
all of them with `node --test tests/extended/*.test.cjs`.

Key extended test files:

| File | Coverage |
|---|---|
| [advanced.test.cjs](./tests/extended/advanced.test.cjs) | Advanced solver features (MIP starts, SOS, etc.) |
| [basis.test.cjs](./tests/extended/basis.test.cjs) | Basis query and manipulation |
| [callbacks.test.cjs](./tests/extended/callbacks.test.cjs) | MIP callbacks (interrupt, solution injection) |
| [compatibility.test.cjs](./tests/extended/compatibility.test.cjs) | Legacy API parity on the extended surface |
| [memory.test.cjs](./tests/extended/memory.test.cjs) | Memory ownership, disposal, reuse |
| [model-io.test.cjs](./tests/extended/model-io.test.cjs) | Read/write LP/MPS/rewired models |
| [model-views.test.cjs](./tests/extended/model-views.test.cjs) | Column/row view snapshots |
| [mutation.test.cjs](./tests/extended/mutation.test.cjs) | Incremental model modification |
| [options-info.test.cjs](./tests/extended/options-info.test.cjs) | Option introspection and metadata |
| [persistent.test.cjs](./tests/extended/persistent.test.cjs) | Multi-solve persistence and state |
| [runtime-contract.test.cjs](./tests/extended/runtime-contract.test.cjs) | Runtime vs declarations vs C API audit |
| [helpers.cjs](./tests/extended/helpers.cjs) | Shared test utilities (`loadRuntime`, `requireExtended`) |

### Declaration tests ([test-dts/](./test-dts/))
TypeScript files compiled with `--noEmit` and `strict: true` via
[test-dts/tsconfig.json](./test-dts/tsconfig.json) to verify that public types
compile correctly.

---

## Quality Gates

### CI pipeline ([.github/workflows/CI.yml](./.github/workflows/CI.yml))

1. **`check:api`** — Verifies that the generated C API inventory and linker
   exports have not drifted from the vendored HiGHS headers.
2. **`build`** — Full [build.sh](./build.sh) run.
3. **`test`** — Runs `npm test`; extended tests are always mandatory.
4. **`test:package`** — Verifies the packed package has the expected files and
   structure via the [package test script](./scripts/test-packed-package.mjs).
5. **Package consumer tests** — Installs the packed tarball in a fresh directory
   and exercises CJS `require`, ESM `import`, and Wasm binary/module overrides
   across Node.js 18, 20, 22, and the canonical version.

### Budget gates ([benchmarks/](./benchmarks/))

- **Runtime regression** — The [runtime benchmark](./benchmarks/runtime.mjs)
  measures solve times. The [comparator](./benchmarks/compare-runtime.mjs) fails
  above a 5% median regression.
- **Size regression** — The [size measurement script](./benchmarks/measure-size.mjs)
  records level-9 gzip sizes for the JS loaders and Wasm binary. The
  [comparator](./benchmarks/compare-size.mjs) fails above 10% growth.

### Audit schemas ([api/](./api/))

- [C API manifest schema](./api/highs-c-api.schema.json) — Schema for
  the hand-maintained C API manifest.
- [DTS audit schema](./api/highs-dts-audit.schema.json) — Schema
  for the DTS audit file that cross-references TypeScript declarations against
  the C function list.

---

## Useful Commands

All commands that involve Emscripten (`build`, `check:api`) MUST be run inside
the dev container. See the [Dev Container](#dev-container) section above.

```sh
# Full build inside the container
docker compose run --rm tests npm run build

# Check API manifest
docker compose run --rm tests npm run check:api

# Run full test suite
docker compose run --rm tests npm test
```

```sh
# Build everything (CMake + Emscripten link + CJS + ESM)
npm run build

# Run all tests (legacy + extended + declaration compilation)
npm test

# Run only extended tests (faster during development)
node --test tests/extended/*.test.cjs

# Run only legacy tests
node tests/test.js

# Check that the C API manifest is in sync with HiGHS headers
npm run check:api

# Verify the packed npm package
npm run test:package

# Measure runtime performance (save output for comparison)
node benchmarks/runtime.mjs --module build/highs.js --mode legacy --label baseline

# Compare two runtime reports
node benchmarks/compare-runtime.mjs /tmp/baseline.json /tmp/candidate.json

# Measure package size
node benchmarks/measure-size.mjs build

# Compare two size reports
node benchmarks/compare-size.mjs /tmp/baseline-size.json /tmp/candidate-size.json

# Compile declaration tests only
npx tsc -p test-dts/tsconfig.json

# Type-check the extended runtime source
npx tsc -p tsconfig.runtime.json

# Regenerate the expanded C API manifest (writes api/highs-c-api.generated.json)
node scripts/generate-highs-api.mjs --out-dir api

# Regenerate the linker export list (writes exported_functions.json)
node scripts/generate-highs-api.mjs --write-exports
```

---

## Environment Variables

| Variable | Effect |
|---|---|
| `HIGHS_WASM_BINARY` | Override the Wasm binary path at runtime |
| `HIGHS_WASM_MODULE` | Pass a pre-compiled `WebAssembly.Module` instead of a binary path |

---

## Release Process

1. CI runs all quality gates (see [CI pipeline](./.github/workflows/CI.yml)).
2. On a release tag, the [release workflow](./.github/workflows/release.yml)
   publishes to npm.
3. The [benchmark scripts](./benchmarks/) are manual migration gates, not CI
   steps — they compare a candidate build against a baseline on the same machine.

---

## Common Pitfalls for Agents

- **Do not edit [exported_functions.json](./exported_functions.json) or
  [api/highs-c-api.generated.json](./api/highs-c-api.generated.json) by hand.**
  They are generated by the [API manifest generator](./scripts/generate-highs-api.mjs)
  from the [hand-maintained manifest](./api/highs-c-api.json). Edit the
  hand-maintained JSON and re-generate.
- **`check:api` must pass before building.** It compares the generated manifest
  against the HiGHS headers. If you add or remove C function exports, update
  [api/highs-c-api.json](./api/highs-c-api.json) first.
- **TypeScript compilation is split.** [tsconfig.json](./tsconfig.json)
  type-checks `src/` (JavaScript, no emit).
  [tsconfig.runtime.json](./tsconfig.runtime.json) compiles
  the [extended runtime](./src/extended.ts) → `build/generated/extended.js`.
  [test-dts/tsconfig.json](./test-dts/tsconfig.json) validates declaration
  compilation.
- **Tests always require the extended API.** There are no graceful skips for
  missing features.
- **The Wasm binary is shared** between `build/highs.js` and `build/highs.mjs`.
  Both link passes use the same object files and flags, so the second pass
  overwrites `build/highs.wasm` with the same content.
- **If you are outside the dev container**, prefix every Emscripten-related
  command with `docker compose run --rm tests`. The entrypoint sources
  `/emsdk/emsdk_env.sh` automatically. See [Dev Container](#dev-container).
