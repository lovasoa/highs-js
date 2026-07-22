/**
 * Extended HiGHS JavaScript API.
 *
 * This declaration deliberately builds on the currently published declaration
 * instead of restating it. The legacy `solve(problem, options)` API therefore
 * remains structurally identical. New APIs are synchronous after the loader
 * resolves, own a persistent `Highs_create()` instance, copy all input into
 * WebAssembly, and return detached JavaScript-owned arrays.
 *
 * Public methods never accept virtual-filesystem paths. Operations backed by a
 * file-oriented C function use a private temporary file and accept/return the
 * file contents. Thread, parallel, concurrency and filename options are
 * rejected by the new option API; the legacy option type remains unchanged for
 * backwards compatibility.
 *
 * Intentionally not exposed: raw pointers, arbitrary native calls, zero-copy
 * heap views, scheduler control, gzip, deprecated C aliases, and C++-only APIs.
 */

import type legacyLoader from "./types";

export type LegacyHighs = Awaited<ReturnType<typeof legacyLoader>>;
export type LegacyHighsOptions = NonNullable<
  Parameters<LegacyHighs["solve"]>[1]
>;
export type LegacyHighsSolution = ReturnType<LegacyHighs["solve"]>;
export type LegacyLoaderOptions = NonNullable<
  Parameters<typeof legacyLoader>[0]
>;

export interface InitOptions extends LegacyLoaderOptions {
  /** Preloaded WebAssembly bytes understood by the Emscripten loader. */
  wasmBinary?: ArrayBuffer | ArrayBufferView;
  /** A precompiled WebAssembly module understood by the Emscripten loader. */
  wasmModule?: WebAssembly.Module;
  print?: (message: string) => void;
  printErr?: (message: string) => void;
}

export interface HighsVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly string: string;
  readonly gitHash: string;
}

export type Highs = LegacyHighs & {
  /** Backed by Highs_version*, Highs_githash and Highs_getInfinity. */
  readonly version: HighsVersion;
  readonly infinity: number;
  /** Size reported by Highs_getSizeofHighsInt. */
  readonly intBytes: number;
  readonly intBits: number;
  readonly constants: HighsConstants;
  readonly errors: HighsErrorConstructors;

  /** Create a persistent instance backed by Highs_create. */
  createModel(source?: ModelData | EncodedModel): Model;

  /** Status-preserving APIs corresponding closely to the stable C API. */
  readonly raw: RawRuntimeApi;
};

/** Loads the CJS or ESM runtime. Existing calls remain source-compatible. */
export default function highsLoader(options?: InitOptions): Promise<Highs>;

export type HighsStatus = -1 | 0 | 1;
export type SuccessfulHighsStatus = 0 | 1;

export interface RawStatus {
  readonly status: HighsStatus;
}

export interface RawResult<T> extends RawStatus {
  /** Present when status is kHighsStatusOk or kHighsStatusWarning. */
  readonly value?: T;
}

export interface CallMetadata {
  readonly status: SuccessfulHighsStatus;
  /** Diagnostic messages captured for kHighsStatusWarning. */
  readonly warnings: readonly string[];
}

export interface CallResult<T> extends CallMetadata {
  readonly value: T;
}

export interface HighsError extends Error {
  readonly status: -1;
  readonly operation: string;
}

export interface HighsDisposedError extends HighsError {}
export interface HighsValidationError extends HighsError {}
export interface HighsReentrancyError extends HighsError {}
export interface HighsUnsupportedOptionError extends HighsError {
  readonly option: string;
}

export interface HighsErrorConstructors {
  readonly HighsError: new (message: string, operation: string) => HighsError;
  readonly HighsDisposedError: new () => HighsDisposedError;
  readonly HighsValidationError: new (message: string) => HighsValidationError;
  readonly HighsReentrancyError: new () => HighsReentrancyError;
  readonly HighsUnsupportedOptionError: new (
    option: string,
  ) => HighsUnsupportedOptionError;
}

export interface HighsConstants {
  readonly status: Readonly<{ error: -1; ok: 0; warning: 1 }>;
  readonly variableType: Readonly<{
    continuous: 0;
    integer: 1;
    semiContinuous: 2;
    semiInteger: 3;
    implicitInteger: 4;
  }>;
  readonly objectiveSense: Readonly<{ minimize: 1; maximize: -1 }>;
  readonly matrixFormat: Readonly<{ columnWise: 1; rowWise: 2 }>;
  readonly hessianFormat: Readonly<{ triangular: 1; square: 2 }>;
  readonly optionType: Readonly<{
    boolean: 0;
    integer: 1;
    double: 2;
    string: 3;
  }>;
  readonly infoType: Readonly<{ int64: -1; integer: 1; double: 2 }>;
  readonly solutionStatus: Readonly<{ none: 0; infeasible: 1; feasible: 2 }>;
  readonly basisValidity: Readonly<{ invalid: 0; valid: 1 }>;
  readonly basisStatus: Readonly<{
    lower: 0;
    basic: 1;
    upper: 2;
    zero: 3;
    nonbasic: 4;
  }>;
  readonly callbackType: Readonly<{
    logging: 0;
    simplexInterrupt: 1;
    ipmInterrupt: 2;
    mipSolution: 3;
    mipImprovingSolution: 4;
    mipLogging: 5;
    mipInterrupt: 6;
    mipCutPool: 7;
    mipUserSolution: 9;
  }>;
  readonly presolveStatus: Readonly<{
    notPresolved: -1;
    notReduced: 0;
    infeasible: 1;
    unboundedOrInfeasible: 2;
    reduced: 3;
    reducedToEmpty: 4;
    timeout: 5;
    nullError: 6;
    optionsError: 7;
    outOfMemory: 8;
  }>;
  readonly modelStatus: Readonly<{
    notSet: 0;
    loadError: 1;
    modelError: 2;
    presolveError: 3;
    solveError: 4;
    postsolveError: 5;
    empty: 6;
    optimal: 7;
    infeasible: 8;
    unboundedOrInfeasible: 9;
    unbounded: 10;
    objectiveBound: 11;
    objectiveTarget: 12;
    timeLimit: 13;
    iterationLimit: 14;
    unknown: 15;
    solutionLimit: 16;
    interrupted: 17;
  }>;
  readonly iis: Readonly<{
    strategyLight: 0;
    strategyRowPriority: 6;
    strategyColPriority: 14;
    boundFree: 1;
    boundLower: 2;
    boundUpper: 3;
    boundBoxed: 4;
    notInConflict: -1;
    maybeInConflict: 0;
    inConflict: 1;
  }>;
}

export type NumberInput = readonly number[] | Float64Array;
export type IndexInput = readonly number[] | Int32Array;
export type MaskInput = readonly boolean[] | Uint8Array | Int32Array;
export type VariableType = 0 | 1 | 2 | 3 | 4;
export type ObjectiveSense = 1 | -1;
export type MatrixFormat = "csc" | "csr";
export type HessianFormat = "triangular" | "square";
export type BasisStatus = 0 | 1 | 2 | 3 | 4;
export type ModelStatusCode =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17;

export interface SparseMatrixInput {
  readonly format: MatrixFormat;
  readonly numRows: number;
  readonly numCols: number;
  /** Conventional compressed-sparse starts; length is major dimension + 1. */
  readonly starts: IndexInput;
  readonly indices: IndexInput;
  readonly values: NumberInput;
}

export interface SparseMatrix {
  readonly format: MatrixFormat;
  readonly numRows: number;
  readonly numCols: number;
  readonly starts: Int32Array;
  readonly indices: Int32Array;
  readonly values: Float64Array;
}

export interface HessianInput {
  readonly format: HessianFormat;
  readonly dimension: number;
  /** Length is dimension + 1. */
  readonly starts: IndexInput;
  readonly indices: IndexInput;
  readonly values: NumberInput;
}

export interface Hessian {
  readonly format: HessianFormat;
  readonly dimension: number;
  readonly starts: Int32Array;
  readonly indices: Int32Array;
  readonly values: Float64Array;
}

export interface ModelData {
  readonly numCols: number;
  readonly numRows: number;
  readonly sense?: ObjectiveSense;
  readonly offset?: number;
  readonly colCost: NumberInput;
  readonly colLower: NumberInput;
  readonly colUpper: NumberInput;
  readonly rowLower: NumberInput;
  readonly rowUpper: NumberInput;
  readonly matrix: SparseMatrixInput;
  readonly integrality?: readonly VariableType[] | Int32Array;
  readonly hessian?: HessianInput;
  readonly colNames?: readonly string[];
  readonly rowNames?: readonly string[];
  readonly modelName?: string;
}

export interface DetachedModelData {
  readonly numCols: number;
  readonly numRows: number;
  readonly sense: ObjectiveSense;
  readonly offset: number;
  readonly colCost: Float64Array;
  readonly colLower: Float64Array;
  readonly colUpper: Float64Array;
  readonly rowLower: Float64Array;
  readonly rowUpper: Float64Array;
  readonly matrix: SparseMatrix;
  readonly integrality: Int32Array;
  readonly hessian?: Hessian;
  readonly colNames?: readonly string[];
  readonly rowNames?: readonly string[];
}

export interface EncodedModel {
  readonly format: "lp" | "mps";
  readonly data: string | Uint8Array;
}

export interface EncodedData {
  readonly format: "lp" | "mps";
  readonly data: string | Uint8Array;
}

export type IndexSelection =
  | { readonly kind: "range"; readonly from: number; readonly to: number }
  | { readonly kind: "set"; readonly indices: IndexInput }
  | { readonly kind: "mask"; readonly mask: MaskInput };

export interface ColumnData {
  readonly count: number;
  readonly cost: Float64Array;
  readonly lower: Float64Array;
  readonly upper: Float64Array;
  readonly matrix: SparseMatrix;
}

export interface RowData {
  readonly count: number;
  readonly lower: Float64Array;
  readonly upper: Float64Array;
  readonly matrix: SparseMatrix;
}

export interface SolutionInput {
  readonly colValue?: NumberInput;
  readonly rowValue?: NumberInput;
  readonly colDual?: NumberInput;
  readonly rowDual?: NumberInput;
}

export interface Solution {
  readonly colValue: Float64Array;
  readonly rowValue: Float64Array;
  readonly colDual: Float64Array;
  readonly rowDual: Float64Array;
}

export interface SparseSolutionInput {
  readonly indices: IndexInput;
  readonly values: NumberInput;
}

export interface BasisInput {
  readonly colStatus: readonly BasisStatus[] | Int32Array;
  readonly rowStatus: readonly BasisStatus[] | Int32Array;
}

export interface Basis {
  readonly colStatus: Int32Array;
  readonly rowStatus: Int32Array;
}

export interface SolveOutput {
  readonly modelStatus: ModelStatusCode;
  readonly solution: Solution;
  readonly basis: Basis;
}

export interface MipSolveOutput {
  readonly modelStatus: ModelStatusCode;
  readonly solution: {
    readonly colValue: Float64Array;
    readonly rowValue: Float64Array;
  };
}

export interface RunResult extends CallMetadata {
  readonly modelStatus: ModelStatusCode;
}

export interface PostsolveInput {
  /** Primal values for the presolved columns. */
  readonly colValue: NumberInput;
  /** Optional dual values for the presolved columns and rows. */
  readonly colDual?: NumberInput;
  readonly rowDual?: NumberInput;
}

export interface LinearObjectiveInput {
  readonly weight: number;
  readonly offset: number;
  readonly coefficients: NumberInput;
  readonly absoluteTolerance: number;
  readonly relativeTolerance: number;
  readonly priority: number;
}

export type OptionValue = boolean | number | string;
export type OptionType = "boolean" | "integer" | "double" | "string";
export type InfoType = "int64" | "integer" | "double";

export interface OptionDescriptor<T extends OptionValue = OptionValue> {
  readonly name: string;
  readonly type: OptionType;
  readonly current: T;
  readonly default: T;
  readonly minimum?: number;
  readonly maximum?: number;
}

export interface OptionStore {
  /**
   * Exact snake_case HiGHS option names. Thread/concurrency and file/path
   * options throw HighsUnsupportedOptionError in this new API.
   * Backed by Highs_set*OptionValue.
   */
  set(name: string, value: OptionValue): CallMetadata;
  set(values: Readonly<Record<string, OptionValue>>): CallMetadata;
  /** Backed by Highs_getOptionType and Highs_get*OptionValue. */
  get(name: string): OptionValue;
  /** Backed by Highs_get*OptionValues. HiGHS exposes no descriptions. */
  describe(name: string): OptionDescriptor;
  /** Backed by Highs_getNumOptions and Highs_getOptionName. */
  names(): readonly string[];
  /** Backed by Highs_resetOptions. */
  reset(): CallMetadata;
  /** Backed by Highs_readOptions through private data-only I/O. */
  read(text: string): CallMetadata;
  /** Backed by Highs_writeOptions through private data-only I/O. */
  export(deviationsOnly?: boolean): string;
}

export interface InfoStore {
  /** Backed by Highs_getInfoType and the matching typed info getter. */
  get(name: string): number | bigint;
  type(name: string): InfoType;
}

export interface ModelDimensions {
  readonly numCols: number;
  readonly numRows: number;
  readonly numNonzeros: number;
  readonly hessianNonzeros: number;
}

export interface PresolvedDimensions {
  readonly numCols: number;
  readonly numRows: number;
  readonly numNonzeros: number;
}

export interface RangingRecord {
  readonly value: Float64Array;
  readonly objective: Float64Array;
  readonly inVariable: Int32Array;
  readonly outVariable: Int32Array;
}

export interface RangingResult {
  readonly colCostUp: RangingRecord;
  readonly colCostDown: RangingRecord;
  readonly colBoundUp: RangingRecord;
  readonly colBoundDown: RangingRecord;
  readonly rowBoundUp: RangingRecord;
  readonly rowBoundDown: RangingRecord;
}

export interface IisResult {
  readonly colIndex: Int32Array;
  readonly rowIndex: Int32Array;
  readonly colBound: Int32Array;
  readonly rowBound: Int32Array;
  readonly colStatus: Int32Array;
  readonly rowStatus: Int32Array;
}

export interface FeasibilityRelaxationInput {
  readonly globalLowerPenalty: number;
  readonly globalUpperPenalty: number;
  readonly globalRowPenalty: number;
  readonly localLowerPenalty?: NumberInput;
  readonly localUpperPenalty?: NumberInput;
  readonly localRowPenalty?: NumberInput;
}

export interface NumericVector {
  readonly values: Float64Array;
  readonly nonzeroIndices?: Int32Array;
}

export type CallbackType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 9;

export interface CallbackEvent {
  readonly type: CallbackType;
  readonly message: string;
  readonly data: CallbackData;
  /** Backed by Highs_setCallbackSolution / Highs_setCallbackSparseSolution. */
  setSolution(solution: NumberInput | SparseSolutionInput): RawStatus;
  /** Backed by Highs_repairCallbackSolution. */
  repairSolution(): RawStatus;
  /** Interrupt the current run by writing user_interrupt in callback data. */
  interrupt(): void;
}

export interface CallbackData
  extends Readonly<Record<string, unknown>> {
  readonly running_time?: number;
  readonly simplex_iteration_count?: number;
  readonly ipm_iteration_count?: number;
  readonly pdlp_iteration_count?: number;
  readonly objective_function_value?: number;
  readonly mip_node_count?: bigint;
  readonly mip_total_lp_iterations?: bigint;
  readonly mip_primal_bound?: number;
  readonly mip_dual_bound?: number;
  readonly mip_gap?: number;
  readonly mip_solution?: Float64Array;
  readonly cut_pool?: {
    readonly numCols: number;
    readonly numCuts: number;
    readonly starts: Int32Array;
    readonly indices: Int32Array;
    readonly values: Float64Array;
    readonly lower: Float64Array;
    readonly upper: Float64Array;
  };
}

/** Callback execution is synchronous; returning a Promise is unsupported. */
export type HighsCallback = (event: CallbackEvent) => void;

export interface Model {
  readonly raw: RawModelApi;
  readonly options: OptionStore;
  readonly info: InfoStore;
  readonly disposed: boolean;
  readonly lastCall: CallMetadata;

  /** Highs_clear / Highs_clearModel / Highs_clearSolver. */
  clear(): CallMetadata;
  clearModel(): CallMetadata;
  clearSolver(): CallMetadata;
  /** Highs_releaseMemory. */
  releaseMemory(): CallMetadata;

  /** Highs_readModel via private temporary storage. */
  readModel(source: EncodedModel): CallMetadata;
  /** Highs_writeModel via private temporary storage. */
  exportModel(format: "lp"): string;
  exportModel(format: "mps"): Uint8Array;
  /** Highs_writePresolvedModel via private temporary storage. */
  exportPresolvedModel(format: "lp"): string;
  exportPresolvedModel(format: "mps"): Uint8Array;
  /** Highs_writeSolution / Highs_writeSolutionPretty. */
  exportSolution(pretty?: false): string;
  exportSolution(pretty: true): string;

  /** Highs_passModel, selecting LP/MIP/QP from supplied fields. */
  passModel(model: ModelData): CallMetadata;
  /** Highs_passHessian. */
  passHessian(hessian: HessianInput): CallMetadata;
  /** Highs_passLinearObjectives / Highs_addLinearObjective. */
  passLinearObjectives(objectives: readonly LinearObjectiveInput[]): CallMetadata;
  addLinearObjective(objective: LinearObjectiveInput): CallMetadata;
  /** Highs_clearLinearObjectives. */
  clearLinearObjectives(): CallMetadata;

  /** Highs_presolve / Highs_run / Highs_postsolve. */
  presolve(): CallMetadata;
  run(callbacks?: Partial<Record<CallbackType, HighsCallback>>): RunResult;
  postsolve(input: PostsolveInput): CallMetadata;
  /** Highs_getRunTime / Highs_zeroAllClocks. */
  getRunTime(): number;
  zeroAllClocks(): CallMetadata;

  /** Highs_getSolution / Highs_getBasis / Highs_getModelStatus. */
  getSolution(): Solution;
  getBasis(): Basis;
  getModelStatus(): ModelStatusCode;
  getObjectiveValue(): number;
  setSolution(solution: SolutionInput | SparseSolutionInput): CallMetadata;
  setBasis(basis?: BasisInput): CallMetadata;
  setLogicalBasis(): CallMetadata;

  getPrimalRay(): NumericVector | undefined;
  getDualRay(): NumericVector | undefined;
  getDualUnboundednessDirection(): NumericVector | undefined;

  /** Highs_getModel / Highs_getLp / Highs_getPresolvedLp. */
  getModel(format?: MatrixFormat): DetachedModelData;
  getLp(format?: MatrixFormat): DetachedModelData;
  getPresolvedLp(format?: MatrixFormat): DetachedModelData;
  getIisLp(format?: MatrixFormat): DetachedModelData;
  getFixedLp(format?: MatrixFormat): DetachedModelData;

  getDimensions(): ModelDimensions;
  getPresolvedDimensions(): PresolvedDimensions;
  getCols(selection: IndexSelection): ColumnData;
  getRows(selection: IndexSelection): RowData;
  getColName(index: number): string;
  getRowName(index: number): string;
  getPresolvedColName(index: number): string;
  getPresolvedRowName(index: number): string;
  getColByName(name: string): number;
  getRowByName(name: string): number;
  getColIntegrality(index: number): VariableType;

  addVar(lower: number, upper: number): CallMetadata;
  addVars(lower: NumberInput, upper: NumberInput): CallMetadata;
  addCol(cost: number, lower: number, upper: number, entries: SparseSolutionInput): CallMetadata;
  addCols(data: Omit<ColumnData, "count">): CallMetadata;
  addRow(lower: number, upper: number, entries: SparseSolutionInput): CallMetadata;
  addRows(data: Omit<RowData, "count">): CallMetadata;
  /** Highs_ensureColwise / Highs_ensureRowwise. */
  ensureColwise(): CallMetadata;
  ensureRowwise(): CallMetadata;

  changeObjectiveSense(sense: ObjectiveSense): CallMetadata;
  changeObjectiveOffset(offset: number): CallMetadata;
  changeColIntegrality(index: number, type: VariableType): CallMetadata;
  changeColsIntegrality(selection: IndexSelection, types: readonly VariableType[] | Int32Array): CallMetadata;
  clearIntegrality(): CallMetadata;
  changeColCost(index: number, cost: number): CallMetadata;
  changeColsCost(selection: IndexSelection, costs: NumberInput): CallMetadata;
  changeColBounds(index: number, lower: number, upper: number): CallMetadata;
  changeColsBounds(selection: IndexSelection, lower: NumberInput, upper: NumberInput): CallMetadata;
  changeRowBounds(index: number, lower: number, upper: number): CallMetadata;
  changeRowsBounds(selection: IndexSelection, lower: NumberInput, upper: NumberInput): CallMetadata;
  changeCoefficient(row: number, col: number, value: number): CallMetadata;
  deleteCols(selection: IndexSelection): CallMetadata;
  deleteRows(selection: IndexSelection): CallMetadata;
  scaleCol(index: number, factor: number): CallMetadata;
  scaleRow(index: number, factor: number): CallMetadata;
  passColName(index: number, name: string): CallMetadata;
  passRowName(index: number, name: string): CallMetadata;
  passModelName(name: string): CallMetadata;

  getBasicVariables(): Int32Array;
  getBasisInverseRow(row: number, sparse?: boolean): NumericVector;
  getBasisInverseCol(col: number, sparse?: boolean): NumericVector;
  getBasisSolve(rhs: NumberInput, sparse?: boolean): NumericVector;
  getBasisTransposeSolve(rhs: NumberInput, sparse?: boolean): NumericVector;
  getReducedRow(row: number, sparse?: boolean): NumericVector;
  getReducedColumn(col: number, sparse?: boolean): NumericVector;

  crossover(input: SolutionInput): CallMetadata;
  getRanging(): RangingResult;
  feasibilityRelaxation(input: FeasibilityRelaxationInput): CallMetadata;
  getIis(): IisResult;

  /** Highs_destroy. Idempotent. */
  dispose(): void;
}

/**
 * Raw runtime operations. Structured arguments replace C pointers, but status
 * codes are never converted to exceptions.
 */
export interface RawRuntimeApi {
  /** Highs_version*, Highs_githash. */
  version(): HighsVersion;
  /** Highs_lpCall. */
  lpCall(model: ModelData): RawResult<SolveOutput>;
  /** Highs_mipCall. */
  mipCall(model: ModelData): RawResult<MipSolveOutput>;
  /** Highs_qpCall. */
  qpCall(model: ModelData): RawResult<SolveOutput>;
  /** Highs_create; dispose() invokes Highs_destroy. */
  createModel(): RawModelApi;
}

/**
 * Every method is backed by the like-named stable C function. File-oriented C
 * functions are intentionally represented as data operations. Pointer
 * arguments are validated, copied into packed temporary allocations, and freed
 * before return. Returned arrays are detached copies.
 */
export interface RawModelApi {
  readonly disposed: boolean;

  clear(): RawStatus;
  clearModel(): RawStatus;
  clearSolver(): RawStatus;
  releaseMemory(): RawStatus;
  presolve(): RawStatus;
  run(): RawStatus;
  postsolve(input: PostsolveInput): RawStatus;
  getRunTime(): number;
  zeroAllClocks(): RawStatus;

  readModel(source: EncodedModel): RawStatus;
  exportModel(format: "lp" | "mps"): RawResult<string | Uint8Array>;
  exportPresolvedModel(format: "lp" | "mps"): RawResult<string | Uint8Array>;
  exportSolution(pretty?: boolean): RawResult<string>;

  passLp(model: ModelData): RawStatus;
  passMip(model: ModelData): RawStatus;
  passModel(model: ModelData): RawStatus;
  passHessian(hessian: HessianInput): RawStatus;
  passLinearObjectives(objectives: readonly LinearObjectiveInput[]): RawStatus;
  addLinearObjective(objective: LinearObjectiveInput): RawStatus;
  clearLinearObjectives(): RawStatus;

  passRowName(row: number, name: string): RawStatus;
  passColName(col: number, name: string): RawStatus;
  passModelName(name: string): RawStatus;

  readOptions(text: string): RawStatus;
  setOptionValue(name: string, value: OptionValue): RawStatus;
  getOptionValue(name: string): RawResult<OptionValue>;
  getOptionType(name: string): RawResult<OptionType>;
  resetOptions(): RawStatus;
  exportOptions(deviationsOnly?: boolean): RawResult<string>;
  getNumOptions(): number;
  getOptionName(index: number): RawResult<string>;
  getOptionValues(name: string): RawResult<OptionDescriptor>;

  getInfoValue(name: string): RawResult<number | bigint>;
  getInfoType(name: string): RawResult<InfoType>;
  getSolution(): RawResult<Solution>;
  getBasis(): RawResult<Basis>;
  getModelStatus(): number;
  getDualRay(): RawResult<NumericVector | undefined>;
  getDualUnboundednessDirection(): RawResult<NumericVector | undefined>;
  getPrimalRay(): RawResult<NumericVector | undefined>;
  getObjectiveValue(): number;
  getBasicVariables(): RawResult<Int32Array>;
  getBasisInverseRow(row: number, sparse?: boolean): RawResult<NumericVector>;
  getBasisInverseCol(col: number, sparse?: boolean): RawResult<NumericVector>;
  getBasisSolve(rhs: NumberInput, sparse?: boolean): RawResult<NumericVector>;
  getBasisTransposeSolve(rhs: NumberInput, sparse?: boolean): RawResult<NumericVector>;
  getReducedRow(row: number, sparse?: boolean): RawResult<NumericVector>;
  getReducedColumn(col: number, sparse?: boolean): RawResult<NumericVector>;
  setBasis(basis: BasisInput): RawStatus;
  setLogicalBasis(): RawStatus;
  setSolution(solution: SolutionInput): RawStatus;
  setSparseSolution(solution: SparseSolutionInput): RawStatus;

  setCallback(callback: HighsCallback | undefined): RawStatus;
  startCallback(type: CallbackType): RawStatus;
  stopCallback(type: CallbackType): RawStatus;

  addCol(cost: number, lower: number, upper: number, entries: SparseSolutionInput): RawStatus;
  addCols(data: Omit<ColumnData, "count">): RawStatus;
  addVar(lower: number, upper: number): RawStatus;
  addVars(lower: NumberInput, upper: NumberInput): RawStatus;
  addRow(lower: number, upper: number, entries: SparseSolutionInput): RawStatus;
  addRows(data: Omit<RowData, "count">): RawStatus;
  ensureColwise(): RawStatus;
  ensureRowwise(): RawStatus;

  changeObjectiveSense(sense: ObjectiveSense): RawStatus;
  changeObjectiveOffset(offset: number): RawStatus;
  changeColIntegrality(col: number, type: VariableType): RawStatus;
  changeColsIntegrality(selection: IndexSelection, types: readonly VariableType[] | Int32Array): RawStatus;
  clearIntegrality(): RawStatus;
  changeColCost(col: number, cost: number): RawStatus;
  changeColsCost(selection: IndexSelection, costs: NumberInput): RawStatus;
  changeColBounds(col: number, lower: number, upper: number): RawStatus;
  changeColsBounds(selection: IndexSelection, lower: NumberInput, upper: NumberInput): RawStatus;
  changeRowBounds(row: number, lower: number, upper: number): RawStatus;
  changeRowsBounds(selection: IndexSelection, lower: NumberInput, upper: NumberInput): RawStatus;
  changeCoeff(row: number, col: number, value: number): RawStatus;

  getObjectiveSense(): RawResult<ObjectiveSense>;
  getObjectiveOffset(): RawResult<number>;
  getCols(selection: IndexSelection): RawResult<ColumnData>;
  getRows(selection: IndexSelection): RawResult<RowData>;
  getRowName(row: number): RawResult<string>;
  getRowByName(name: string): RawResult<number>;
  getColName(col: number): RawResult<string>;
  getColByName(name: string): RawResult<number>;
  getColIntegrality(col: number): RawResult<VariableType>;

  deleteCols(selection: IndexSelection): RawStatus;
  deleteRows(selection: IndexSelection): RawStatus;
  scaleCol(col: number, factor: number): RawStatus;
  scaleRow(row: number, factor: number): RawStatus;

  getInfinity(): number;
  getSizeofHighsInt(): number;
  getDimensions(): ModelDimensions;
  getPresolvedDimensions(): PresolvedDimensions;
  getModel(format?: MatrixFormat): RawResult<DetachedModelData>;
  getLp(format?: MatrixFormat): RawResult<DetachedModelData>;
  getPresolvedLp(format?: MatrixFormat): RawResult<DetachedModelData>;
  getPresolvedColName(col: number): RawResult<string>;
  getPresolvedRowName(row: number): RawResult<string>;
  getIisLp(format?: MatrixFormat): RawResult<DetachedModelData>;
  getFixedLp(format?: MatrixFormat): RawResult<DetachedModelData>;

  crossover(input: SolutionInput): RawStatus;
  getRanging(): RawResult<RangingResult>;
  feasibilityRelaxation(input: FeasibilityRelaxationInput): RawStatus;
  getIis(): RawResult<IisResult>;

  dispose(): void;
}
