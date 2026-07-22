/** Numeric values are the exact kHighsStatus constants from the C API. */
type HighsStatusCode = -1 | 0 | 1;

interface RawStatus {
  readonly status: HighsStatusCode;
}

type RawResult<T> =
  | { readonly status: -1 }
  | { readonly status: 0 | 1; readonly value: T };

type HighsNumberInput = readonly number[] | Float64Array;
type HighsIndexInput = readonly number[] | Int32Array;
type HighsMaskInput = readonly number[] | Int32Array | Uint8Array;
type HighsBytes = Uint8Array;

type HighsMatrixFormatCode = 1 | 2;
type HighsHessianFormatCode = 1 | 2;
type HighsMatrixFormat = "csc" | "csr";
type HighsHessianFormat = "triangular" | "square";
type HighsObjectiveSenseCode = -1 | 1;
type HighsVariableTypeCode = 0 | 1 | 2 | 3 | 4;
type HighsBasisStatusCode = 0 | 1 | 2 | 3 | 4;
type HighsOptionTypeCode = 0 | 1 | 2 | 3;
type HighsOptionType = "boolean" | "integer" | "double" | "string";
type HighsInfoTypeCode = -1 | 1 | 2;
type HighsOptionValue = boolean | number | string;

/** Every starts array uses the conventional majorDimension + 1 sentinel. */
interface HighsSparseMatrixInput {
  readonly format: HighsMatrixFormat;
  readonly numRows: number;
  readonly numCols: number;
  readonly starts: HighsIndexInput;
  readonly indices: HighsIndexInput;
  readonly values: HighsNumberInput;
}

interface HighsSparseMatrix {
  readonly format: HighsMatrixFormat;
  readonly numRows: number;
  readonly numCols: number;
  readonly starts: Int32Array;
  readonly indices: Int32Array;
  readonly values: Float64Array;
}

interface HighsHessianInput {
  readonly format: HighsHessianFormat;
  readonly dimension: number;
  readonly starts: HighsIndexInput;
  readonly indices: HighsIndexInput;
  readonly values: HighsNumberInput;
}

interface HighsHessian {
  readonly format: HighsHessianFormat;
  readonly dimension: number;
  readonly starts: Int32Array;
  readonly indices: Int32Array;
  readonly values: Float64Array;
}

interface HighsLpInput {
  readonly numCols: number;
  readonly numRows: number;
  readonly sense: HighsObjectiveSenseCode;
  readonly offset?: number;
  readonly colCost: HighsNumberInput;
  readonly colLower: HighsNumberInput;
  readonly colUpper: HighsNumberInput;
  readonly rowLower: HighsNumberInput;
  readonly rowUpper: HighsNumberInput;
  readonly matrix: HighsSparseMatrixInput;
}

interface HighsMipInput extends HighsLpInput {
  readonly integrality: HighsIndexInput;
}

interface HighsModelInput extends HighsLpInput {
  readonly integrality?: HighsIndexInput;
  readonly hessian?: HighsHessianInput;
}

interface HighsLp extends Omit<HighsLpInput, "colCost" | "colLower" | "colUpper" | "rowLower" | "rowUpper" | "matrix"> {
  readonly colCost: Float64Array;
  readonly colLower: Float64Array;
  readonly colUpper: Float64Array;
  readonly rowLower: Float64Array;
  readonly rowUpper: Float64Array;
  readonly matrix: HighsSparseMatrix;
}

interface HighsModelData extends HighsLp {
  readonly integrality: Int32Array;
  readonly hessian: HighsHessian;
}

type HighsIndexSelection =
  | { readonly kind: "range"; readonly from: number; readonly to: number }
  | { readonly kind: "set"; readonly indices: HighsIndexInput }
  | { readonly kind: "mask"; readonly mask: HighsMaskInput };

interface HighsColumnSelectionResult {
  readonly count: number;
  readonly costs: Float64Array;
  readonly lower: Float64Array;
  readonly upper: Float64Array;
  readonly matrix: HighsSparseMatrix;
}

interface HighsRowSelectionResult {
  readonly count: number;
  readonly lower: Float64Array;
  readonly upper: Float64Array;
  readonly matrix: HighsSparseMatrix;
}

interface HighsSolutionData {
  readonly colValue: Float64Array;
  readonly colDual: Float64Array;
  readonly rowValue: Float64Array;
  readonly rowDual: Float64Array;
}

interface HighsSolutionInput {
  readonly colValue?: HighsNumberInput;
  readonly colDual?: HighsNumberInput;
  readonly rowValue?: HighsNumberInput;
  readonly rowDual?: HighsNumberInput;
}

interface HighsSparseSolutionInput {
  readonly indices: HighsIndexInput;
  readonly values: HighsNumberInput;
}

interface HighsBasisData {
  readonly colStatus: Int32Array;
  readonly rowStatus: Int32Array;
}

interface HighsBasisInput {
  readonly colStatus: HighsIndexInput;
  readonly rowStatus: HighsIndexInput;
}

interface HighsRay {
  readonly exists: boolean;
  readonly values: Float64Array;
}

interface HighsSparseVector {
  readonly dimension: number;
  readonly indices: Int32Array;
  readonly values: Float64Array;
}

interface HighsRangingRecord {
  readonly value: Float64Array;
  readonly objective: Float64Array;
  readonly inVariable: Int32Array;
  readonly outVariable: Int32Array;
}

interface HighsRangingData {
  readonly colCostUp: HighsRangingRecord;
  readonly colCostDown: HighsRangingRecord;
  readonly colBoundUp: HighsRangingRecord;
  readonly colBoundDown: HighsRangingRecord;
  readonly rowBoundUp: HighsRangingRecord;
  readonly rowBoundDown: HighsRangingRecord;
}

interface HighsIisData {
  readonly colIndex: Int32Array;
  readonly rowIndex: Int32Array;
  readonly colBound: Int32Array;
  readonly rowBound: Int32Array;
  readonly colStatus: Int32Array;
  readonly rowStatus: Int32Array;
}

interface HighsLinearObjectiveInput {
  readonly weight: number;
  readonly offset: number;
  readonly coefficients: HighsNumberInput;
  readonly absTolerance?: number;
  readonly relTolerance?: number;
  readonly priority?: number;
}

interface HighsFeasibilityRelaxationInput {
  readonly globalLowerPenalty: number;
  readonly globalUpperPenalty: number;
  readonly globalRhsPenalty: number;
  readonly localLowerPenalty?: HighsNumberInput;
  readonly localUpperPenalty?: HighsNumberInput;
  readonly localRhsPenalty?: HighsNumberInput;
}

interface HighsOptionDescriptor<T extends HighsOptionValue = HighsOptionValue> {
  readonly name: string;
  readonly type: HighsOptionType;
  readonly current: T;
  readonly default: T;
  readonly minimum?: number;
  readonly maximum?: number;
}

interface HighsVersionInfo {
  readonly string: string;
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly gitHash: string;
}

interface HighsEncodedModel {
  readonly data: string | Uint8Array;
  readonly format: "lp" | "mps";
}

type HighsModelExportFormat = "lp" | "mps";

interface HighsCallbackEvent {
  readonly type: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 9;
  readonly message: string;
  readonly runningTime?: number;
  readonly simplexIterationCount?: bigint;
  readonly ipmIterationCount?: bigint;
  readonly objectiveFunctionValue?: number;
  readonly mipNodeCount?: bigint;
  readonly mipTotalLpIterations?: bigint;
  readonly mipPrimalBound?: number;
  readonly mipDualBound?: number;
  readonly mipGap?: number;
  readonly mipSolution?: Float64Array;
}

interface HighsCallbackControl {
  interrupt(): void;
  setSolution(values: HighsNumberInput): RawStatus;
  setSparseSolution(solution: HighsSparseSolutionInput): RawStatus;
  repairSolution(): RawStatus;
}

type HighsCallback = (event: HighsCallbackEvent, control: HighsCallbackControl) => void;

/** Low-level runtime operations whose arguments and results are safe JS data. */
interface RawHighsApi {
  /** @capi Highs_lpCall */
  lpCall(model: HighsLpInput): RawResult<HighsOneShotLpResult>;
  /** @capi Highs_mipCall */
  mipCall(model: HighsMipInput): RawResult<HighsOneShotMipResult>;
  /** @capi Highs_qpCall */
  qpCall(model: HighsModelInput): RawResult<HighsOneShotLpResult>;
  /** @capi Highs_create / Highs_destroy */
  createModel(): RawModel;
  /** @capi Highs_version */
  version(): string;
  /** @capi Highs_versionMajor */
  versionMajor(): number;
  /** @capi Highs_versionMinor */
  versionMinor(): number;
  /** @capi Highs_versionPatch */
  versionPatch(): number;
  /** @capi Highs_githash */
  gitHash(): string;
}

interface HighsOneShotMipResult {
  readonly colValue: Float64Array;
  readonly rowValue: Float64Array;
  readonly modelStatus: number;
}

interface HighsOneShotLpResult extends HighsOneShotMipResult {
  readonly colDual: Float64Array;
  readonly rowDual: Float64Array;
  readonly colBasisStatus: Int32Array;
  readonly rowBasisStatus: Int32Array;
}

/**
 * Near-C API for one owned instance. Status-returning C functions preserve
 * their -1/0/1 status. All arrays returned here are detached copies.
 */
interface RawModel {
  readonly disposed: boolean;

  /** @capi Highs_clear */
  clear(): RawStatus;
  /** @capi Highs_clearModel */
  clearModel(): RawStatus;
  /** @capi Highs_clearSolver */
  clearSolver(): RawStatus;
  /** @capi Highs_releaseMemory */
  releaseMemory(): RawStatus;
  /** @capi Highs_presolve */
  presolve(): RawStatus;
  /** @capi Highs_run */
  run(): RawStatus;
  /** @capi Highs_postsolve */
  postsolve(solution: HighsSolutionInput, basis?: HighsBasisInput): RawStatus;

  /** @capi Highs_passLp */
  passLp(model: HighsLpInput): RawStatus;
  /** @capi Highs_passMip */
  passMip(model: HighsMipInput): RawStatus;
  /** @capi Highs_passModel */
  passModel(model: HighsModelInput): RawStatus;
  /** @capi Highs_passHessian */
  passHessian(hessian: HighsHessianInput): RawStatus;

  /** @capi Highs_passLinearObjectives */
  passLinearObjectives(objectives: readonly HighsLinearObjectiveInput[]): RawStatus;
  /** @capi Highs_addLinearObjective */
  addLinearObjective(objective: HighsLinearObjectiveInput): RawStatus;
  /** @capi Highs_clearLinearObjectives */
  clearLinearObjectives(): RawStatus;

  /** @capi Highs_passRowName */
  passRowName(row: number, name: string): RawStatus;
  /** @capi Highs_passColName */
  passColName(col: number, name: string): RawStatus;
  /** @capi Highs_passModelName */
  passModelName(name: string): RawStatus;
  /** @capi Highs_getRowName via a length-safe bridge */
  getRowName(row: number): RawResult<string>;
  /** @capi Highs_getColName via a length-safe bridge */
  getColName(col: number): RawResult<string>;
  /** @capi Highs_getRowByName */
  getRowByName(name: string): RawResult<number>;
  /** @capi Highs_getColByName */
  getColByName(name: string): RawResult<number>;
  /** @capi Highs_getPresolvedRowName */
  getPresolvedRowName(row: number): RawResult<string>;
  /** @capi Highs_getPresolvedColName */
  getPresolvedColName(col: number): RawResult<string>;

  /** @capi Highs_readModel through hidden MEMFS */
  readModel(source: HighsEncodedModel): RawStatus;
  /** @capi Highs_writeModel through hidden MEMFS */
  exportModel(format: HighsModelExportFormat): RawResult<string | Uint8Array>;
  /** @capi Highs_writePresolvedModel through hidden MEMFS */
  exportPresolvedModel(format: HighsModelExportFormat): RawResult<string | Uint8Array>;
  /** @capi Highs_writeSolution through hidden MEMFS */
  exportSolution(style?: number): RawResult<string>;
  /** @capi Highs_writeSolutionPretty through hidden MEMFS */
  exportSolutionPretty(): RawResult<string>;
  /** @capi Highs_readOptions through hidden MEMFS */
  readOptions(text: string): RawStatus;
  /** @capi Highs_writeOptions through hidden MEMFS */
  exportOptions(): RawResult<string>;
  /** @capi Highs_writeOptionsDeviations through hidden MEMFS */
  exportOptionDeviations(): RawResult<string>;

  /** @capi Highs_setBoolOptionValue / Highs_setIntOptionValue / Highs_setDoubleOptionValue / Highs_setStringOptionValue */
  setOptionValue(name: string, value: HighsOptionValue): RawStatus;
  /** @capi typed Highs_get*OptionValue */
  getOptionValue(name: string): RawResult<HighsOptionValue>;
  /** @capi Highs_getOptionType */
  getOptionType(name: string): RawResult<HighsOptionType>;
  /** @capi Highs_resetOptions */
  resetOptions(): RawStatus;
  /** @capi Highs_getNumOptions */
  getNumOptions(): number;
  /** @capi Highs_getOptionName; the returned C allocation is freed after copying */
  getOptionName(index: number): RawResult<string>;
  /** @capi typed Highs_get*OptionValues */
  getOptionValues(name: string): RawResult<HighsOptionDescriptor>;

  /** @capi Highs_getIntInfoValue / Highs_getDoubleInfoValue / Highs_getInt64InfoValue */
  getInfoValue(name: string): RawResult<number | bigint>;
  /** @capi Highs_getInfoType */
  getInfoType(name: string): RawResult<HighsInfoTypeCode>;

  /** @capi Highs_getSolution */
  getSolution(): RawResult<HighsSolutionData>;
  /** @capi Highs_getBasis */
  getBasis(): RawResult<HighsBasisData>;
  /** @capi Highs_getModelStatus */
  getModelStatus(): number;
  /** @capi Highs_getObjectiveValue */
  getObjectiveValue(): number;
  /** @capi Highs_getDualRay */
  getDualRay(): RawResult<HighsRay>;
  /** @capi Highs_getDualUnboundednessDirection */
  getDualUnboundednessDirection(): RawResult<HighsRay>;
  /** @capi Highs_getPrimalRay */
  getPrimalRay(): RawResult<HighsRay>;

  /** @capi Highs_getBasicVariables */
  getBasicVariables(): RawResult<Int32Array>;
  /** @capi Highs_getBasisInverseRow */
  getBasisInverseRow(row: number): RawResult<HighsSparseVector>;
  /** @capi Highs_getBasisInverseCol */
  getBasisInverseCol(col: number): RawResult<HighsSparseVector>;
  /** @capi Highs_getBasisSolve */
  getBasisSolve(rhs: HighsNumberInput): RawResult<HighsSparseVector>;
  /** @capi Highs_getBasisTransposeSolve */
  getBasisTransposeSolve(rhs: HighsNumberInput): RawResult<HighsSparseVector>;
  /** @capi Highs_getReducedRow */
  getReducedRow(row: number): RawResult<HighsSparseVector>;
  /** @capi Highs_getReducedColumn */
  getReducedColumn(col: number): RawResult<HighsSparseVector>;

  /** @capi Highs_setBasis */
  setBasis(basis: HighsBasisInput): RawStatus;
  /** @capi Highs_setLogicalBasis */
  setLogicalBasis(): RawStatus;
  /** @capi Highs_setSolution */
  setSolution(solution: HighsSolutionInput): RawStatus;
  /** @capi Highs_setSparseSolution */
  setSparseSolution(solution: HighsSparseSolutionInput): RawStatus;

  /** @capi Highs_setCallback / Highs_startCallback */
  startCallback(type: HighsCallbackEvent["type"], callback: HighsCallback): RawStatus;
  /** @capi Highs_stopCallback */
  stopCallback(type: HighsCallbackEvent["type"]): RawStatus;

  /** @capi Highs_getRunTime */
  getRunTime(): number;
  /** @capi Highs_zeroAllClocks */
  zeroAllClocks(): RawStatus;

  /** @capi Highs_addCol */
  addCol(cost: number, lower: number, upper: number, indices: HighsIndexInput, values: HighsNumberInput): RawStatus;
  /** @capi Highs_addCols */
  addCols(costs: HighsNumberInput, lower: HighsNumberInput, upper: HighsNumberInput, matrix: HighsSparseMatrixInput): RawStatus;
  /** @capi Highs_addVar */
  addVar(lower: number, upper: number): RawStatus;
  /** @capi Highs_addVars */
  addVars(lower: HighsNumberInput, upper: HighsNumberInput): RawStatus;
  /** @capi Highs_addRow */
  addRow(lower: number, upper: number, indices: HighsIndexInput, values: HighsNumberInput): RawStatus;
  /** @capi Highs_addRows */
  addRows(lower: HighsNumberInput, upper: HighsNumberInput, matrix: HighsSparseMatrixInput): RawStatus;
  /** @capi Highs_ensureColwise */
  ensureColwise(): RawStatus;
  /** @capi Highs_ensureRowwise */
  ensureRowwise(): RawStatus;

  /** @capi Highs_changeObjectiveSense */
  changeObjectiveSense(sense: HighsObjectiveSenseCode): RawStatus;
  /** @capi Highs_changeObjectiveOffset */
  changeObjectiveOffset(offset: number): RawStatus;
  /** @capi Highs_changeColIntegrality */
  changeColIntegrality(col: number, type: HighsVariableTypeCode): RawStatus;
  /** @capi Highs_changeColsIntegralityByRange */
  changeColsIntegralityByRange(from: number, to: number, types: HighsIndexInput): RawStatus;
  /** @capi Highs_changeColsIntegralityBySet */
  changeColsIntegralityBySet(indices: HighsIndexInput, types: HighsIndexInput): RawStatus;
  /** @capi Highs_changeColsIntegralityByMask */
  changeColsIntegralityByMask(mask: HighsMaskInput, types: HighsIndexInput): RawStatus;
  /** @capi Highs_clearIntegrality */
  clearIntegrality(): RawStatus;

  /** @capi Highs_changeColCost */
  changeColCost(col: number, cost: number): RawStatus;
  /** @capi Highs_changeColsCostByRange */
  changeColsCostByRange(from: number, to: number, costs: HighsNumberInput): RawStatus;
  /** @capi Highs_changeColsCostBySet */
  changeColsCostBySet(indices: HighsIndexInput, costs: HighsNumberInput): RawStatus;
  /** @capi Highs_changeColsCostByMask */
  changeColsCostByMask(mask: HighsMaskInput, costs: HighsNumberInput): RawStatus;
  /** @capi Highs_changeColBounds */
  changeColBounds(col: number, lower: number, upper: number): RawStatus;
  /** @capi Highs_changeColsBoundsByRange */
  changeColsBoundsByRange(from: number, to: number, lower: HighsNumberInput, upper: HighsNumberInput): RawStatus;
  /** @capi Highs_changeColsBoundsBySet */
  changeColsBoundsBySet(indices: HighsIndexInput, lower: HighsNumberInput, upper: HighsNumberInput): RawStatus;
  /** @capi Highs_changeColsBoundsByMask */
  changeColsBoundsByMask(mask: HighsMaskInput, lower: HighsNumberInput, upper: HighsNumberInput): RawStatus;
  /** @capi Highs_changeRowBounds */
  changeRowBounds(row: number, lower: number, upper: number): RawStatus;
  /** @capi Highs_changeRowsBoundsByRange */
  changeRowsBoundsByRange(from: number, to: number, lower: HighsNumberInput, upper: HighsNumberInput): RawStatus;
  /** @capi Highs_changeRowsBoundsBySet */
  changeRowsBoundsBySet(indices: HighsIndexInput, lower: HighsNumberInput, upper: HighsNumberInput): RawStatus;
  /** @capi Highs_changeRowsBoundsByMask */
  changeRowsBoundsByMask(mask: HighsMaskInput, lower: HighsNumberInput, upper: HighsNumberInput): RawStatus;
  /** @capi Highs_changeCoeff */
  changeCoeff(row: number, col: number, value: number): RawStatus;

  /** @capi Highs_getObjectiveSense */
  getObjectiveSense(): RawResult<HighsObjectiveSenseCode>;
  /** @capi Highs_getObjectiveOffset */
  getObjectiveOffset(): RawResult<number>;
  /** @capi Highs_getColIntegrality */
  getColIntegrality(col: number): RawResult<HighsVariableTypeCode>;
  /** @capi Highs_getColsByRange / Highs_getColsBySet / Highs_getColsByMask */
  getCols(selection: HighsIndexSelection): RawResult<HighsColumnSelectionResult>;
  /** @capi Highs_getRowsByRange / Highs_getRowsBySet / Highs_getRowsByMask */
  getRows(selection: HighsIndexSelection): RawResult<HighsRowSelectionResult>;

  /** @capi Highs_deleteColsByRange / Highs_deleteColsBySet / Highs_deleteColsByMask */
  deleteCols(selection: HighsIndexSelection): RawStatus;
  /** @capi Highs_deleteRowsByRange / Highs_deleteRowsBySet / Highs_deleteRowsByMask */
  deleteRows(selection: HighsIndexSelection): RawStatus;
  /** @capi Highs_scaleCol */
  scaleCol(col: number, factor: number): RawStatus;
  /** @capi Highs_scaleRow */
  scaleRow(row: number, factor: number): RawStatus;

  /** @capi Highs_getInfinity */
  getInfinity(): number;
  /** @capi Highs_getSizeofHighsInt */
  getSizeofHighsInt(): number;
  /** @capi Highs_getNumCol */
  getNumCol(): number;
  /** @capi Highs_getNumRow */
  getNumRow(): number;
  /** @capi Highs_getNumNz */
  getNumNz(): number;
  /** @capi Highs_getHessianNumNz */
  getHessianNumNz(): number;
  /** @capi Highs_getPresolvedNumCol */
  getPresolvedNumCol(): number;
  /** @capi Highs_getPresolvedNumRow */
  getPresolvedNumRow(): number;
  /** @capi Highs_getPresolvedNumNz */
  getPresolvedNumNz(): number;

  /** @capi Highs_getModel */
  getModel(format?: HighsMatrixFormat): RawResult<HighsModelData>;
  /** @capi Highs_getLp */
  getLp(format?: HighsMatrixFormat): RawResult<HighsLp>;
  /** @capi Highs_getPresolvedLp */
  getPresolvedLp(format?: HighsMatrixFormat): RawResult<HighsLp>;
  /** @capi Highs_getIisLp */
  getIisLp(format?: HighsMatrixFormat): RawResult<HighsLp>;
  /** @capi Highs_getFixedLp */
  getFixedLp(format?: HighsMatrixFormat): RawResult<HighsLp>;

  /** @capi Highs_crossover */
  crossover(solution: HighsSolutionInput): RawStatus;
  /** @capi Highs_getRanging */
  getRanging(): RawResult<HighsRangingData>;
  /** @capi Highs_feasibilityRelaxation */
  feasibilityRelaxation(input: HighsFeasibilityRelaxationInput): RawStatus;
  /** @capi Highs_getIis */
  getIis(): RawResult<HighsIisData>;

  dispose(): void;
}

interface ModelRunResult {
  readonly modelStatus: number;
  readonly warning?: HighsWarning;
}

interface HighsWarning {
  readonly status: 1;
  readonly operation: string;
  readonly message: string;
}

/** Persistent convenience API. C errors throw HighsError; warnings are retained. */
interface Model {
  readonly raw: RawModel;
  readonly disposed: boolean;
  readonly lastWarning: HighsWarning | undefined;
  readonly numCols: number;
  readonly numRows: number;
  readonly numNonzeros: number;

  readModel(source: HighsEncodedModel): void;
  exportModel(format: HighsModelExportFormat): string | Uint8Array;
  exportPresolvedModel(format: HighsModelExportFormat): string | Uint8Array;
  exportSolution(style?: number): string;
  exportSolutionPretty(): string;
  readOptions(text: string): void;
  exportOptions(): string;
  exportOptionDeviations(): string;

  passLp(model: HighsLpInput): void;
  passMip(model: HighsMipInput): void;
  passModel(model: HighsModelInput): void;
  passHessian(hessian: HighsHessianInput): void;
  run(): ModelRunResult;
  presolve(): void;
  postsolve(solution: HighsSolutionInput, basis?: HighsBasisInput): void;
  clear(): void;
  clearModel(): void;
  clearSolver(): void;
  releaseMemory(): void;

  setOption(name: string, value: HighsOptionValue): void;
  getOption(name: string): HighsOptionValue;
  describeOption(name: string): HighsOptionDescriptor;
  listOptions(): readonly HighsOptionDescriptor[];
  resetOptions(): void;
  getInfo(name: string): number | bigint;

  getSolution(): HighsSolutionData;
  getBasis(): HighsBasisData;
  setSolution(solution: HighsSolutionInput): void;
  setSparseSolution(solution: HighsSparseSolutionInput): void;
  setBasis(basis: HighsBasisInput): void;
  setLogicalBasis(): void;
  getModel(format?: HighsMatrixFormat): HighsModelData;
  getLp(format?: HighsMatrixFormat): HighsLp;
  getPresolvedLp(format?: HighsMatrixFormat): HighsLp;
  getCols(selection: HighsIndexSelection): HighsColumnSelectionResult;
  getRows(selection: HighsIndexSelection): HighsRowSelectionResult;

  startCallback(type: HighsCallbackEvent["type"], callback: HighsCallback): void;
  stopCallback(type: HighsCallbackEvent["type"]): void;
  dispose(): void;
}

interface HighsConstants {
  readonly kHighsMaximumStringLength: 512;
  readonly kHighsStatusError: -1;
  readonly kHighsStatusOk: 0;
  readonly kHighsStatusWarning: 1;
  readonly kHighsVarTypeContinuous: 0;
  readonly kHighsVarTypeInteger: 1;
  readonly kHighsVarTypeSemiContinuous: 2;
  readonly kHighsVarTypeSemiInteger: 3;
  readonly kHighsVarTypeImplicitInteger: 4;
  readonly kHighsOptionTypeBool: 0;
  readonly kHighsOptionTypeInt: 1;
  readonly kHighsOptionTypeDouble: 2;
  readonly kHighsOptionTypeString: 3;
  readonly kHighsInfoTypeInt64: -1;
  readonly kHighsInfoTypeInt: 1;
  readonly kHighsInfoTypeDouble: 2;
  readonly kHighsObjSenseMinimize: 1;
  readonly kHighsObjSenseMaximize: -1;
  readonly kHighsMatrixFormatColwise: 1;
  readonly kHighsMatrixFormatRowwise: 2;
  readonly kHighsHessianFormatTriangular: 1;
  readonly kHighsHessianFormatSquare: 2;
  readonly kHighsSolutionStatusNone: 0;
  readonly kHighsSolutionStatusInfeasible: 1;
  readonly kHighsSolutionStatusFeasible: 2;
  readonly kHighsBasisValidityInvalid: 0;
  readonly kHighsBasisValidityValid: 1;
  readonly kHighsPresolveStatusNotPresolved: -1;
  readonly kHighsPresolveStatusNotReduced: 0;
  readonly kHighsPresolveStatusInfeasible: 1;
  readonly kHighsPresolveStatusUnboundedOrInfeasible: 2;
  readonly kHighsPresolveStatusReduced: 3;
  readonly kHighsPresolveStatusReducedToEmpty: 4;
  readonly kHighsPresolveStatusTimeout: 5;
  readonly kHighsPresolveStatusNullError: 6;
  readonly kHighsPresolveStatusOptionsError: 7;
  readonly kHighsPresolveStatusOutOfMemory: 8;
  readonly kHighsModelStatusNotset: 0;
  readonly kHighsModelStatusLoadError: 1;
  readonly kHighsModelStatusModelError: 2;
  readonly kHighsModelStatusPresolveError: 3;
  readonly kHighsModelStatusSolveError: 4;
  readonly kHighsModelStatusPostsolveError: 5;
  readonly kHighsModelStatusModelEmpty: 6;
  readonly kHighsModelStatusOptimal: 7;
  readonly kHighsModelStatusInfeasible: 8;
  readonly kHighsModelStatusUnboundedOrInfeasible: 9;
  readonly kHighsModelStatusUnbounded: 10;
  readonly kHighsModelStatusObjectiveBound: 11;
  readonly kHighsModelStatusObjectiveTarget: 12;
  readonly kHighsModelStatusTimeLimit: 13;
  readonly kHighsModelStatusIterationLimit: 14;
  readonly kHighsModelStatusUnknown: 15;
  readonly kHighsModelStatusSolutionLimit: 16;
  readonly kHighsModelStatusInterrupt: 17;
  readonly kHighsBasisStatusLower: 0;
  readonly kHighsBasisStatusBasic: 1;
  readonly kHighsBasisStatusUpper: 2;
  readonly kHighsBasisStatusZero: 3;
  readonly kHighsBasisStatusNonbasic: 4;
  readonly kHighsCallbackLogging: 0;
  readonly kHighsCallbackSimplexInterrupt: 1;
  readonly kHighsCallbackIpmInterrupt: 2;
  readonly kHighsCallbackMipSolution: 3;
  readonly kHighsCallbackMipImprovingSolution: 4;
  readonly kHighsCallbackMipLogging: 5;
  readonly kHighsCallbackMipInterrupt: 6;
  readonly kHighsCallbackMipGetCutPool: 7;
  readonly kHighsCallbackMipDefineLazyConstraints: 8;
  readonly kHighsCallbackCallbackMipUserSolution: 9;
  readonly kHighsIisStrategyLight: 0;
  readonly kHighsIisStrategyFromLpRowPriority: 6;
  readonly kHighsIisStrategyFromLpColPriority: 14;
  readonly kHighsIisBoundFree: 1;
  readonly kHighsIisBoundLower: 2;
  readonly kHighsIisBoundUpper: 3;
  readonly kHighsIisBoundBoxed: 4;
  readonly kHighsIisStatusNotInConflict: -1;
  readonly kHighsIisStatusMaybeInConflict: 0;
  readonly kHighsIisStatusInConflict: 1;
}

interface HighsModernRuntime {
  readonly raw: RawHighsApi;
  readonly versionInfo: HighsVersionInfo;
  readonly infinity: number;
  readonly intBytes: number;
  readonly intBits: number;
  readonly constants: HighsConstants;
  createModel(): Model;
}

declare class HighsError extends Error {
  readonly status: HighsStatusCode;
  readonly operation: string;
  constructor(message: string, options: { status: HighsStatusCode; operation: string });
}
