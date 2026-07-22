# Migration gates

These scripts make the migration's performance and package-size budgets
reproducible. Run baseline and candidate measurements on the same machine,
Node.js version, build mode, workload, warm-up, and iteration counts.

```sh
node benchmarks/runtime.mjs --module baseline/highs.js --mode legacy --label baseline > /tmp/highs-baseline-runtime.json
node benchmarks/runtime.mjs --module build/highs.js --mode legacy --label candidate > /tmp/highs-candidate-runtime.json
node benchmarks/compare-runtime.mjs /tmp/highs-baseline-runtime.json /tmp/highs-candidate-runtime.json

node benchmarks/measure-size.mjs baseline-build > /tmp/highs-baseline-size.json
node benchmarks/measure-size.mjs build > /tmp/highs-candidate-size.json
node benchmarks/compare-size.mjs /tmp/highs-baseline-size.json /tmp/highs-candidate-size.json
```

The runtime gate fails above a 5% median regression. The size gate fails above
10% growth in the total level-9 gzip size of the CommonJS loader, native ESM
loader (when present), and shared Wasm binary. Any exception should be recorded
in the release/PR notes with its measured cause; the comparison scripts do not
silently waive either budget.

To measure the persistent fast path after it exists, pass `--mode persistent`.
Do not compare that report to a legacy-mode report: the comparator deliberately
rejects mismatched scenarios.

The extended verification suite is intentionally separate from the historical
test runner until package scripts are integrated:

```sh
node --test tests/extended/*.test.cjs
npx tsc -p test-dts/tsconfig.json
```

Tests that require the new API report a clear skip against an old build. Once
`createModel` and `raw` are present, failures are strict. Legacy compatibility
and CommonJS package smoke tests always run.
