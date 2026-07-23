# JavaScript to HiGHS C API mapping

The extended API is a structured binding over the stable, non-deprecated HiGHS
C interface. It does not attempt C++ or `highspy` parity. JavaScript validates
and marshals inputs, manages native allocations, turns output buffers into
detached typed arrays, and optionally converts error statuses into exceptions.

`Model` and `RawModelApi` share the same native implementation. The difference
is error policy: `Model` throws for `kHighsStatusError`; `RawModelApi` returns
the status. Unless noted, a `Model` method and its like-named raw method map to
the same C entry point.

## Runtime and lifecycle

| JavaScript | C API backing |
| --- | --- |
| `highs.version` / `raw.version()` | `Highs_version`, `Highs_versionMajor`, `Highs_versionMinor`, `Highs_versionPatch`, `Highs_githash` |
| `highs.infinity` / `rawModel.getInfinity()` | `Highs_getInfinity` |
| `highs.intBytes`, `highs.intBits` / `rawModel.getSizeofHighsInt()` | `Highs_getSizeofHighsInt` |
| `raw.lpCall()` | `Highs_lpCall` |
| `raw.mipCall()` | `Highs_mipCall` |
| `raw.qpCall()` | `Highs_qpCall` |
| `createModel()` / `raw.createModel()` | `Highs_create` |
| `dispose()` | `Highs_destroy` |
| `clear()` | `Highs_clear` |
| `clearModel()` | `Highs_clearModel` |
| `clearSolver()` | `Highs_clearSolver` |
| `releaseMemory()` | `Highs_releaseMemory` |
| `presolve()` | `Highs_presolve` |
| `run()` | `Highs_run` |
| `postsolve()` | `Highs_postsolve` |
| `getRunTime()` | `Highs_getRunTime` |
| `zeroAllClocks()` | `Highs_zeroAllClocks` |

## Passing and exporting models

| JavaScript | C API backing |
| --- | --- |
| `passModel()` | `Highs_passModel`; the wrapper selects LP, MIP, or QP fields from `ModelData` |
| `rawModel.passLp()` | `Highs_passLp` |
| `rawModel.passMip()` | `Highs_passMip` |
| `passHessian()` | `Highs_passHessian` |
| `passLinearObjectives()` | `Highs_passLinearObjectives` |
| `addLinearObjective()` | `Highs_addLinearObjective` |
| `clearLinearObjectives()` | `Highs_clearLinearObjectives` |
| `readModel({data, format})` | `Highs_readModel` through private temporary storage |
| `exportModel()` | `Highs_writeModel` through private temporary storage |
| `exportPresolvedModel()` | `Highs_writePresolvedModel` through private temporary storage |
| `exportSolution(false)` | `Highs_writeSolution` through private temporary storage |
| `exportSolution(true)` | `Highs_writeSolutionPretty` through private temporary storage |

No public operation accepts a native or virtual-filesystem path.

## Options and information

| JavaScript | C API backing |
| --- | --- |
| `options.set()` / `setOptionValue()` | `Highs_setBoolOptionValue`, `Highs_setIntOptionValue`, `Highs_setDoubleOptionValue`, or `Highs_setStringOptionValue`, selected after `Highs_getOptionType` |
| `options.get()` / `getOptionValue()` | `Highs_getBoolOptionValue`, `Highs_getIntOptionValue`, `Highs_getDoubleOptionValue`, or `Highs_getStringOptionValue` |
| `options.describe()` / `getOptionValues()` | `Highs_getBoolOptionValues`, `Highs_getIntOptionValues`, `Highs_getDoubleOptionValues`, or `Highs_getStringOptionValues` |
| `options.names()` / `getNumOptions()`, `getOptionName()` | `Highs_getNumOptions`, `Highs_getOptionName` |
| `options.reset()` | `Highs_resetOptions` |
| `options.read()` / `readOptions()` | `Highs_readOptions` through private temporary storage |
| `options.export(false)` | `Highs_writeOptions` through private temporary storage |
| `options.export(true)` | `Highs_writeOptionsDeviations` through private temporary storage |
| `info.type()` / `getInfoType()` | `Highs_getInfoType` |
| `info.get()` / `getInfoValue()` | `Highs_getIntInfoValue`, `Highs_getInt64InfoValue`, or `Highs_getDoubleInfoValue` |

`Highs_getOptionName` returns an allocated C string in this HiGHS interface; the
wrapper copies and frees it. JavaScript `bigint` preserves values returned by
`Highs_getInt64InfoValue`.

## Solution, basis, status, and analysis

| JavaScript | C API backing |
| --- | --- |
| `getSolution()` | `Highs_getSolution` |
| `getBasis()` | `Highs_getBasis` |
| `setBasis(basis)` | `Highs_setBasis` |
| `setBasis()` / `setLogicalBasis()` | `Highs_setLogicalBasis` |
| `setSolution()` | `Highs_setSolution` or `Highs_setSparseSolution` according to input |
| `getModelStatus()` | `Highs_getModelStatus` |
| `getObjectiveValue()` | `Highs_getObjectiveValue` |
| `getPrimalRay()` | `Highs_getPrimalRay` |
| `getDualRay()` | `Highs_getDualRay` |
| `getDualUnboundednessDirection()` | `Highs_getDualUnboundednessDirection` |
| `getBasicVariables()` | `Highs_getBasicVariables` |
| `getBasisInverseRow()` | `Highs_getBasisInverseRow` |
| `getBasisInverseCol()` | `Highs_getBasisInverseCol` |
| `getBasisSolve()` | `Highs_getBasisSolve` |
| `getBasisTransposeSolve()` | `Highs_getBasisTransposeSolve` |
| `getReducedRow()` | `Highs_getReducedRow` |
| `getReducedColumn()` | `Highs_getReducedColumn` |
| `crossover()` | `Highs_crossover` |
| `getRanging()` | `Highs_getRanging` |
| `feasibilityRelaxation()` | `Highs_feasibilityRelaxation` |
| `getIis()` | `Highs_getIis` |

Dense analysis outputs always return `Float64Array`. When sparse output is
requested, `nonzeroIndices` comes from the C API's nonzero index output.

## Model inspection and names

| JavaScript | C API backing |
| --- | --- |
| `getDimensions()` | `Highs_getNumCol`, `Highs_getNumRow`, `Highs_getNumNz`, `Highs_getHessianNumNz` |
| `getPresolvedDimensions()` | `Highs_getPresolvedNumCol`, `Highs_getPresolvedNumRow`, `Highs_getPresolvedNumNz` |
| `getModel()` | `Highs_getModel` |
| `getLp()` | `Highs_getLp` |
| `getPresolvedLp()` | `Highs_getPresolvedLp` |
| `getIisLp()` | `Highs_getIisLp` |
| `getFixedLp()` | `Highs_getFixedLp` |
| `getCols()` | `Highs_getColsByRange`, `Highs_getColsBySet`, or `Highs_getColsByMask` |
| `getRows()` | `Highs_getRowsByRange`, `Highs_getRowsBySet`, or `Highs_getRowsByMask` |
| `passColName()` | `Highs_passColName` |
| `passRowName()` | `Highs_passRowName` |
| `passModelName()` | `Highs_passModelName` |
| `getColName()` | length-safe bridge to `Highs::getColOrRowName` on `Highs_getLp()` data |
| `getRowName()` | length-safe bridge to `Highs::getColOrRowName` on `Highs_getLp()` data |
| `getPresolvedColName()` | length-safe bridge to `Highs::getColOrRowName` on `Highs_getPresolvedLp()` data |
| `getPresolvedRowName()` | length-safe bridge to `Highs::getColOrRowName` on `Highs_getPresolvedLp()` data |
| `getColByName()` | `Highs_getColByName` |
| `getRowByName()` | `Highs_getRowByName` |
| `getColIntegrality()` | `Highs_getColIntegrality` |

These four methods are the documented exception to direct C backing. The C
getters write into a caller-owned character buffer without accepting its
length, so a small C++ bridge calls the same `Highs` name implementation with
an explicit destination capacity. It changes only buffer safety, not name
semantics.

## Mutation

| JavaScript | C API backing |
| --- | --- |
| `addVar()` | `Highs_addVar` |
| `addVars()` | `Highs_addVars` |
| `addCol()` | `Highs_addCol` |
| `addCols()` | `Highs_addCols` |
| `addRow()` | `Highs_addRow` |
| `addRows()` | `Highs_addRows` |
| `ensureColwise()` | `Highs_ensureColwise` |
| `ensureRowwise()` | `Highs_ensureRowwise` |
| `changeObjectiveSense()` | `Highs_changeObjectiveSense` |
| `changeObjectiveOffset()` | `Highs_changeObjectiveOffset` |
| `rawModel.getObjectiveSense()` | `Highs_getObjectiveSense` |
| `rawModel.getObjectiveOffset()` | `Highs_getObjectiveOffset` |
| `changeColIntegrality()` | `Highs_changeColIntegrality` |
| `changeColsIntegrality()` | `Highs_changeColsIntegralityByRange`, `Highs_changeColsIntegralityBySet`, or `Highs_changeColsIntegralityByMask` |
| `clearIntegrality()` | `Highs_clearIntegrality` |
| `changeColCost()` | `Highs_changeColCost` |
| `changeColsCost()` | `Highs_changeColsCostByRange`, `Highs_changeColsCostBySet`, or `Highs_changeColsCostByMask` |
| `changeColBounds()` | `Highs_changeColBounds` |
| `changeColsBounds()` | `Highs_changeColsBoundsByRange`, `Highs_changeColsBoundsBySet`, or `Highs_changeColsBoundsByMask` |
| `changeRowBounds()` | `Highs_changeRowBounds` |
| `changeRowsBounds()` | `Highs_changeRowsBoundsByRange`, `Highs_changeRowsBoundsBySet`, or `Highs_changeRowsBoundsByMask` |
| `changeCoefficient()` / `changeCoeff()` | `Highs_changeCoeff` |
| `deleteCols()` | `Highs_deleteColsByRange`, `Highs_deleteColsBySet`, or `Highs_deleteColsByMask` |
| `deleteRows()` | `Highs_deleteRowsByRange`, `Highs_deleteRowsBySet`, or `Highs_deleteRowsByMask` |
| `scaleCol()` | `Highs_scaleCol` |
| `scaleRow()` | `Highs_scaleRow` |

## Callbacks

| JavaScript | C API backing |
| --- | --- |
| `rawModel.setCallback()` | `Highs::setCallback` through `Highs_js_setCallback`, a type-aware C++ bridge |
| `rawModel.startCallback()` | `Highs_startCallback` |
| `rawModel.stopCallback()` | `Highs_stopCallback` |
| type-9 `event.setSolution(dense)` | `Highs_setCallbackSolution` |
| type-9 `event.setSolution(sparse)` | `Highs_setCallbackSparseSolution` |
| type-9 `event.repairSolution()` | `Highs_repairCallbackSolution` |
| type-1/2/6 `event.interrupt()` | sets the C callback data `user_interrupt` field |

Callback data is copied before delivery to JavaScript. The bridge is
synchronous, exposes only fields initialized for the active callback type,
passes no input-control pointer when HiGHS supplies none, and prevents
recursive entry into the same `Highs` instance.

## Deliberate exclusions and alternatives

The following are not exposed merely to make a declaration appear complete:

| Excluded surface | Reason and supported alternative |
| --- | --- |
| Raw pointers, arbitrary `ccall`/`cwrap`, and live heap views | They cannot remain safe across memory growth and allow use-after-free. Use the structured raw API and detached arrays. |
| `getCoefficient(row, col)` | There is no stable C API entry point. Fetch the sparse row with `getRows({kind: "range", from: row, to: row})`, which is also faster for reading multiple coefficients. |
| Native `clone()` | The stable C API does not clone a `Highs` instance. Use `getModel()` followed by `createModel(snapshot)` and make the numerical copy cost explicit; copy names separately if needed. |
| Scheduler reset and thread-pool controls | The WebAssembly build is single-threaded. No public wrapper for `Highs_resetGlobalScheduler` is provided. |
| External asynchronous interrupt | The stable C API does not provide a safe general external-interrupt operation for this synchronous build. Interrupt from a registered callback or terminate a dedicated Worker. |
| Gzip model I/O | zlib is disabled. Decompress before `readModel()` or compress exported bytes in JavaScript. |
| Public file/path APIs | They expose Emscripten implementation details and leak temporary-state concerns. Use data-only I/O. |
| Deprecated C aliases and compilation-date metadata | They add compatibility burden without solver capability. Use the non-deprecated methods and semantic version fields. |
| Lazy-constraint callback type and PDLP callback type | The lazy callback is inert in this native version and the PDLP-specific type is not part of the supported solver configuration. |
| C++/`highspy` expression objects, variable handles, constraint handles, and stable object IDs | They are not stable C API concepts. Use numeric indices, sparse data, and tagged selections. |
| C++-only standard-form, condition-number, ill-conditioning, scaling-suggestion, saved-MIP-solution, presolve-log/map, primal-assessment, and matrix-image helpers | There is no stable C backing. Implement analysis from detached model/solution data when needed. |
| File-based basis/solution readers and basis/info/run/IIS writers | Their required public path semantics conflict with the data-only contract and not all have stable C backing. Use structured basis/solution getters and setters. |
| Multiobjective getters and deletion | The stable C interface can pass, add, and clear linear objectives but does not expose complete retrieval/deletion semantics. Re-pass the objective set explicitly. |

The exported native symbol list is generated from a reviewed ABI manifest. An
API declaration alone is not evidence that a function is shipped: mapping,
marshalling, runtime tests, ownership tests, and package tests are required for
each family.
