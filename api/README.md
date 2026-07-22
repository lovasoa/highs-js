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

Inspect the complete expanded inventory and exports without changing the
worktree with:

```sh
node scripts/generate-highs-api.mjs --out-dir /tmp/highs-js-api-generated
```

After reviewing manifest changes, update the canonical inventory and linker
exports with:

```sh
node scripts/generate-highs-api.mjs --write-exports
```

`highs.d.ts` is the hand-reviewed canonical declaration for the extended API.
`types.d.ts` remains the untouched `./legacy-types` compatibility entry and is
never generated or overwritten by this script.
