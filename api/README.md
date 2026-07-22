# API inventory

`highs-c-api.json` is the reviewable source manifest for the modern JavaScript
API. Every stable, non-deprecated function declared before the deprecated
boundary in the bundled `highs_c_api.h` must occur exactly once in a group.
The manifest records its JavaScript exposure, exceptional adapters, ownership,
and deliberate exclusions. `highs-dts-audit.json` records how the proposed
`highs.d.ts` is reconciled with the safe and efficiently implementable C API.

Validate coverage and deterministic generation with:

```sh
node scripts/generate-highs-api.mjs --check
```

Inspect the complete expanded inventory, exports, and declaration aggregate
without changing the worktree with:

```sh
node scripts/generate-highs-api.mjs --out-dir /tmp/highs-js-api-generated
```

Once the native callback and safe-name bridge symbols exist, update the three
canonical aggregates with:

```sh
node scripts/generate-highs-api.mjs --write-aggregates
```

The aggregate declaration keeps the complete legacy type surface and changes
the loader result to `Highs & HighsModernRuntime`; this is intentional so old
programs continue to type-check while new code receives the persistent API.
