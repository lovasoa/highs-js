export type LegacyHighs = {
  solve(problem: string, options?: HighsOptions): HighsSolution;
};

type HighsOptions = Readonly<
  Partial<{
    /**
     * @default "choose"
     */
    presolve: 'off' | 'choose' | 'on';

    /**
     * Solver option: "simplex", "choose", "ipm" or "pdlp". If
     * "simplex"/"ipm"/"pdlp" is chosen then, for a MIP (QP) the
     * integrality
     * constraint (quadratic term) will be ignored
     * @default "choose"
     */
    solver: 'simplex' | 'choose' | 'ipm' | 'pdlp';

    /**
     * Parallel option: "off", "choose" or "on"
     * @default "choose"
     */
    parallel: 'off' | 'choose' | 'on';

    /**
     * Run IPM crossover: "off", "choose" or "on"
     * @default "on"
     */
    run_crossover: 'off' | 'choose' | 'on';

    /**
     * Time limit (seconds)
     * @default Number.POSITIVE_INFINITY
     */
    time_limit: number;

    /**
     * Compute cost, bound, RHS and basic solution ranging: "off" or "on"
     * @default "off"
     */
    ranging: 'off' | 'on';

    /**
     * Limit on |cost coefficient|: values greater than or equal to
     * this will be treated as infinite
     * @min 1e+15
     * @default 1e+20
     */
    infinite_cost: number;

    /**
     * Limit on |constraint bound|: values greater than or equal to
     * this will be treated as infinite
     * @min 1e+15
     * @default 1e+20
     */
    infinite_bound: number;

    /**
     * Lower limit on |matrix entries|: values less than or equal to this
     * will be
     * treated as zero
     * @min 1e-12
     * @default 1e-09
     */
    small_matrix_value: number;

    /**
     * Upper limit on |matrix entries|: values greater than or equal to
     * this will be treated as infinite
     * @min 1e+00
     * @default 1e+15
     */
    large_matrix_value: number;

    /**
     * Primal feasibility tolerance
     * @min 1e-10
     * @default 1e-07
     */
    primal_feasibility_tolerance: number;

    /**
     * Dual feasibility tolerance
     * @min 1e-10
     * @default 1e-07
     */
    dual_feasibility_tolerance: number;

    /**
     * IPM optimality tolerance
     * @min 1e-12
     * @default 1e-08
     */
    ipm_optimality_tolerance: number;

    /**
     * Objective bound for termination of the dual simplex solver
     * @default Number.POSITIVE_INFINITY
     */
    objective_bound: number;

    /**
     * Objective target for termination of the MIP solver
     * @default Number.NEGATIVE_INFINITY
     */
    objective_target: number;

    /**
     * random seed used in HiGHS
     * @min 0
     * @default 0
     */
    random_seed: number;

    /**
     * number of threads used by HiGHS (0: automatic)
     * @min 0
     * @default 0
     */
    threads: number;

    /**
     * Exponent of power-of-two bound scaling for model
     * @default 0
     */
    user_bound_scale: number;

    /**
     * Exponent of power-of-two cost scaling for model
     * @default 0
     */
    user_cost_scale: number;

    /**
     * Debugging level in HiGHS
     * @default 0
     */
    highs_debug_level: HighsDebugLevel;

    /**
     * Analysis level in HiGHS
     * @default 0
     */
    highs_analysis_level: HighsAnalysisLevel;

    /**
     * Strategy for simplex solver 0 => Choose; 1 => Dual (serial); 2 =>
     * Dual (PAMI); 3 => Dual (SIP); 4 => Primal
     * @default 1
     */
    simplex_strategy: SimplexStrategy;

    /**
     * Simplex scaling strategy: off / choose / equilibration / forced equilibration / max value 0 / max value 1 (0/1/2/3/4/5)
     * @default 1
     */
    simplex_scale_strategy: SimplexScaleStrategy;

    /**
     * Strategy for simplex crash: off / LTSSF / Bixby (0/1/2)
     * @default 0
     */
    simplex_crash_strategy: SimplexCrashStrategy;

    /**
     * Strategy for simplex dual edge weights: Choose / Dantzig / Devex / Steepest Edge (-1/0/1/2)
     * @default -1
     */
    simplex_dual_edge_weight_strategy: SimplexEdgeWeightStrategy;

    /**
     * Strategy for simplex primal edge weights: Choose / Dantzig / Devex (-1/0/1)
     * @default -1
     */
    simplex_primal_edge_weight_strategy: SimplexEdgeWeightStrategy;

    /**
     * Iteration limit for simplex solver when solving LPs, but not
     * subproblems in the MIP solver
     * @min 0
     * @default Number.MAX_SAFE_INTEGER
     */
    simplex_iteration_limit: number;

    /**
     * Limit on the number of simplex UPDATE operations
     * @min 0
     * @default 5000
     */
    simplex_update_limit: number;

    /**
     * Minimum level of concurrency in parallel simplex
     * @min 0
     * @default 1
     * @max 8
     */
    simplex_min_concurrency: number;

    /**
     * Maximum level of concurrency in parallel simplex
     * @min 1
     * @default 8
     * @max 8
     */
    simplex_max_concurrency: number;

    /**
     * Enables or disables solver output
     * @default true
     */
    output_flag: boolean;

    /**
     * Enables or disables console logging
     * @default true
     */
    log_to_console: boolean;

    /**
     * Solution file
     * @default ""
     */
    solution_file: string;

    /**
     * Log file
     * @default ""
     */
    log_file: string;

    /**
     * Write the primal and dual solution to a file
     * @default false
     */
    write_solution_to_file: boolean;

    /**
     * Style of solution file (raw = computer-readable,
     * pretty = human-readable):
     * -1 => HiGHS old raw (deprecated); 0 => HiGHS raw;
     * 1 => HiGHS pretty; 2 => Glpsol raw; 3 => Glpsol pretty;
     * 4 => HiGHS sparse raw
     * @default 0
     */
    write_solution_style: SolutionStyle;

    /**
     * Location of cost row for Glpsol file:
     * -2 => Last; -1 => None; 0 => None if empty, otherwise data file
     * location; 1 <= n <= num_row => Location n; n >
     * num_row => Last
     */
    glpsol_cost_row_location: GlpsolCostRowLocation | number;

    /**
     * Run iCrash
     * @default false
     */
    icrash: boolean;

    /**
     * Dualize strategy for iCrash
     * @default false
     */
    icrash_dualize: boolean;

    /**
     * Strategy for iCrash
     * @default "ICA"
     */
    icrash_strategy: string;

    /**
     * iCrash starting weight
     * @min 1e-10
     * @default 1e-03
     * @max 1e50
     */
    icrash_starting_weight: number;

    /**
     * iCrash iterations
     * @min 0
     * @default 30
     * @max 200
     */
    icrash_iterations: number;

    /**
     * iCrash approximate minimization iterations
     * @min 0
     * @default 50
     * @max 100
     */
    icrash_approx_iter: number;

    /**
     * Exact subproblem solution for iCrash
     * @default false
     */
    icrash_exact: boolean;

    /**
     * Exact subproblem solution for iCrash
     * @default false
     */
    icrash_breakpoints: boolean;

    /**
     * Write model file
     * @default ""
     */
    write_model_file: string;

    /**
     * Write the model to a file
     * @default false
     */
    write_model_to_file: boolean;

    /**
     * Write presolved model file
     * @default ""
     */
    write_presolved_model_file: string;

    /**
     * Write the presolved model to a file
     * @default false
     */
    write_presolved_model_to_file: boolean;

    /**
     * Whether MIP symmetry should be detected
     * @default true
     */
    mip_detect_symmetry: boolean;

    /**
     * Whether MIP restart is permitted
     * @default true
     */
    mip_allow_restart: boolean;

    /**
     * MIP solver max number of nodes
     * @default Number.MAX_SAFE_INTEGER
     */
    mip_max_nodes: number;

    /**
     * MIP solver max number of nodes where estimate is above cutoff bound
     * @min 0
     * @default Number.MAX_SAFE_INTEGER
     */
    mip_max_stall_nodes: number;

    /**
     * MIP solver max number of nodes when completing a partial MIP start
     * @min 0
     * @default 500
     */
    mip_max_start_nodes: number;

    // #ifdef HIGHS_DEBUGSOL
    //   /**
    //    * Solution file for debug solution of the MIP solver
    //    * @default ""
    //    */
    //   mip_debug_solution_file: string;
    // #endif

    /**
     * Whether improving MIP solutions should be saved
     * @default false
     */
    mip_improving_solution_save: boolean;

    /**
     * Whether improving MIP solutions should be reported in sparse format
     * @default false
     */
    mip_improving_solution_report_sparse: boolean;

    /**
     * File for reporting improving MIP solutions: not reported for an empty
     * string \"\"
     * @default ""
     */
    mip_improving_solution_file: string;

    /**
     * MIP solver max number of leave nodes
     * @min 0
     * @default Number.MAX_SAFE_INTEGER
     */
    mip_max_leaves: number;

    /**
     * Limit on the number of improving solutions found to stop the MIP
     * solver prematurely
     * @min 1
     * @default Number.MAX_SAFE_INTEGER
     */
    mip_max_improving_sols: number;

    /**
     * maximal age of dynamic LP rows before they are removed from the LP relaxation in the MIP solver
     * @min 0
     * @default 10
     * @max 32767
     */
    mip_lp_age_limit: number;

    /**
     * maximal age of rows in the MIP solver cutpool before they are deleted
     * @min 0
     * @default 30
     * @max 1000
     */
    mip_pool_age_limit: number;

    /**
     * soft limit on the number of rows in the MIP solver cutpool for dynamic age adjustment
     * @min 1
     * @default 10000
     */
    mip_pool_soft_limit: number;

    /**
     * minimal number of observations before MIP solver pseudo costs are considered reliable
     * @min 0
     * @default 8
     */
    mip_pscost_minreliable: number;

    /**
     * Minimal number of entries in the MIP solver cliquetable before
     * neighbourhood
     * queries of the conflict graph use parallel processing
     * @min 0
     * @default 100000
     */
    mip_min_cliquetable_entries_for_parallelism: number;

    /**
     * MIP solver reporting level
     * @min 0
     * @default 1
     * @max 2
     */
    mip_report_level: number;

    /**
     * MIP feasibility tolerance
     * @min 1e-10
     * @default 1e-06
     */
    mip_feasibility_tolerance: number;

    /**
     * Effort spent for MIP heuristics
     * @min 0
     * @default 0.05
     * @max 1
     */
    mip_heuristic_effort: number;

    /**
     * Tolerance on relative gap, |ub-lb|/|ub|, to determine whether
     * optimality has been reached for a MIP instance
     * @min 0
     * @default 1e-04
     */
    mip_rel_gap: number;

    /**
     * Tolerance on absolute gap of MIP, |ub-lb|, to determine whether
     * optimality has been reached for a MIP instance
     * @min 0
     * @default 1e-06
     */
    mip_abs_gap: number;

    /**
     * MIP minimum logging interval
     * @min 0
     * @default 5
     */
    mip_min_logging_interval: number;

    /**
     * Iteration limit for IPM solver
     * @default Number.MAX_SAFE_INTEGER
     */
    ipm_iteration_limit: number;

    /**
     * Use native termination for PDLP solver: Default = false
     * @default false
     */
    pdlp_native_termination: boolean;

    /**
     * Scaling option for PDLP solver: Default = true
     * @default true
     */
    pdlp_scaling: boolean;

    /**
     * Iteration limit for PDLP solver
     * @min 0
     */
    pdlp_iteration_limit: number;

    /**
     * Restart mode for PDLP solver: 0 => none;
     * 1 => GPU (default); 2 => CPU
     * @min 0
     * @default 1
     * @max 2
     */
    pdlp_e_restart_method: number;

    /**
     * Duality gap tolerance for PDLP solver: Default = 1e-4
     * @min 1e-12
     * @default 1e-04
     */
    pdlp_d_gap_tol: number;

    /**
     * Iteration limit for QP solver
     * @min 0
     * @default Number.MAX_SAFE_INTEGER
     */
    qp_iteration_limit: number;

    /**
     * Nullspace limit for QP solver
     * @min 0
     * @default 4000
     */
    qp_nullspace_limit: number;

    /**
     * Strategy for IIS calculation:
     * Prioritise rows (default) /
     * Prioritise columns
     * (0/1)
     * @default 0
     */
    iis_strategy: IisStrategy;
  }>
>;
type HighsSolution =
  | GenericHighsSolution<true, HighsLinearSolutionColumn, HighsLinearSolutionRow>
  | GenericHighsSolution<false, HighsMixedIntegerLinearSolutionColumn, HighsMixedIntegerLinearSolutionRow>
  | GenericHighsSolution<boolean, HighsInfeasibleSolutionColumn, HighsInfeasibleSolutionRow, 'Infeasible'>;

type GenericHighsSolution<IsLinear extends boolean, ColType, RowType, Status extends HighsModelStatus = HighsModelStatus> = {
  Status: Status;
  ObjectiveValue: number;
  Columns: Record<string, ColType>;
  Rows: RowType[];
};

type HighsModelStatus =
  | 'Not Set'
  | 'Load error'
  | 'Model error'
  | 'Presolve error'
  | 'Solve error'
  | 'Postsolve error'
  | 'Empty'
  | 'Optimal'
  | 'Infeasible'
  | 'Primal infeasible or unbounded'
  | 'Unbounded'
  | 'Bound on objective reached'
  | 'Target for objective reached'
  | 'Time limit reached'
  | 'Iteration limit reached'
  | 'Unknown';

interface HighsInfeasibleSolutionBase {
  Index: number;
  Lower: number | null;
  Upper: number | null;
}

interface HighsInfeasibleSolutionRow extends HighsInfeasibleSolutionBase {}
interface HighsInfeasibleSolutionColumn extends HighsInfeasibleSolutionBase {
  Type: 'Integer' | 'Continuous';
}

interface HighsSolutionBase extends HighsInfeasibleSolutionBase {
  Primal: number;
}

interface HighsLinearSolutionColumn extends HighsSolutionBase {
  Dual: number;
  Name: string;
  Status: HighsBasisStatus;
}

interface HighsMixedIntegerLinearSolutionColumn extends HighsSolutionBase {
  Type: 'Integer' | 'Continuous';
  Name: string;
}

interface HighsLinearSolutionRow extends HighsSolutionBase {
  Dual: number;
  Status: HighsBasisStatus;
  Name: string;
}

interface HighsMixedIntegerLinearSolutionRow extends HighsSolutionBase {}

type HighsBasisStatus =
  /** Fixed */
  | 'FX'
  /** Lower Bound */
  | 'LB'
  /** Basis */
  | 'BS'
  /** Upper Bound */
  | 'UB'
  /** Free */
  | 'FR'
  /** Non-Bounded */
  | 'NB';

type HighsLoaderOptions = Readonly<
  Partial<{
    /** Should return the URL of an asset given its name. Useful for locating the wasm file */
    locateFile(file: string): string;
  }>
>;

declare enum HighsAnalysisLevel {
  kHighsAnalysisLevelNone = 0,
  kHighsAnalysisLevelModelData = 1,
  kHighsAnalysisLevelSolverSummaryData = 2,
  kHighsAnalysisLevelSolverRuntimeData = 4,
  kHighsAnalysisLevelSolverTime = 8,
  kHighsAnalysisLevelNlaData = 16,
  kHighsAnalysisLevelNlaTime = 32,
  kHighsAnalysisLevelMin = 0,
  kHighsAnalysisLevelMax = 63
}

declare enum HighsDebugLevel {
  kHighsDebugLevelNone = 0,
  kHighsDebugLevelCheap,
  kHighsDebugLevelCostly,
  kHighsDebugLevelExpensive,
  kHighsDebugLevelMin = 0,
  kHighsDebugLevelMax = 3
}

declare enum SimplexScaleStrategy {
  kSimplexScaleStrategyMin = 0,
  kSimplexScaleStrategyOff = 0,
  kSimplexScaleStrategyChoose, // 1
  kSimplexScaleStrategyEquilibration, // 2
  kSimplexScaleStrategyForcedEquilibration, // 3
  kSimplexScaleStrategyMaxValue015, // 4
  kSimplexScaleStrategyMaxValue0157, // 5
  kSimplexScaleStrategyMax = 5
}

declare enum SimplexStrategy {
  kSimplexStrategyMin = 0,
  kSimplexStrategyChoose = 0,
  kSimplexStrategyDual, // 1
  kSimplexStrategyDualPlain = 1,
  kSimplexStrategyDualTasks, // 2
  kSimplexStrategyDualMulti, // 3
  kSimplexStrategyPrimal, // 4
  kSimplexStrategyMax = 4,
  kSimplexStrategyNum
}

declare enum SimplexCrashStrategy {
  kSimplexCrashStrategyMin = 0,
  kSimplexCrashStrategyOff = 0,
  kSimplexCrashStrategyLtssfK,
  kSimplexCrashStrategyLtssf = 1,
  kSimplexCrashStrategyBixby,
  kSimplexCrashStrategyLtssfPri,
  kSimplexCrashStrategyLtsfK,
  kSimplexCrashStrategyLtsfPri,
  kSimplexCrashStrategyLtsf,
  kSimplexCrashStrategyBixbyNoNonzeroColCosts,
  kSimplexCrashStrategyBasic,
  kSimplexCrashStrategyTestSing,
  kSimplexCrashStrategyMax = 11
}

declare enum SimplexEdgeWeightStrategy {
  kSimplexEdgeWeightStrategyMin = -1,
  kSimplexEdgeWeightStrategyChoose = -1,
  kSimplexEdgeWeightStrategyDantzig,
  kSimplexEdgeWeightStrategyDevex,
  kSimplexEdgeWeightStrategySteepestEdge,
  kSimplexEdgeWeightStrategyMax = 2
}

declare enum SolutionStyle {
  kSolutionStyleOldRaw = -1,
  kSolutionStyleRaw = 0,
  kSolutionStylePretty, // 1;
  kSolutionStyleGlpsolRaw, // 2;
  kSolutionStyleGlpsolPretty, // 3;
  kSolutionStyleSparse, // 4;
  kSolutionStyleMin = -1,
  kSolutionStyleMax = 4
}

declare enum GlpsolCostRowLocation {
  kGlpsolCostRowLocationLast = -2,
  kGlpsolCostRowLocationNone, // -1
  kGlpsolCostRowLocationNoneIfEmpty, // 0
  kGlpsolCostRowLocationMin = -2
}

declare enum IisStrategy {
  kIisStrategyMin = 0,
  kIisStrategyFromLpRowPriority = 0,
  kIisStrategyFromLpColPriority,                    // 1
  //  kIisStrategyFromRayRowPriority,                     // 2
  //  kIisStrategyFromRayColPriority,                     // 3
  kIisStrategyMax = 1
}

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

export type LegacyHighsOptions = HighsOptions;
export type LegacyHighsSolution = HighsSolution;
export type LegacyLoaderOptions = HighsLoaderOptions;

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
  /** Current Wasm linear-memory capacity, not the amount of live allocation. */
  readonly memoryBytes: number;
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

export type RawResult<T> =
  | { readonly status: -1; readonly value?: never }
  | {
      readonly status: SuccessfulHighsStatus;
      readonly value: T;
    };

export interface CallMetadata {
  readonly status: SuccessfulHighsStatus;
  /** Stable wrapper summaries for kHighsStatusWarning. */
  readonly warnings: readonly string[];
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
}

export interface EncodedModel {
  readonly format: "lp" | "mps";
  readonly data: string | Uint8Array;
}

export type IndexSelection =
  | { readonly kind: "range"; readonly from: number; readonly to: number }
  /** Indices must increase strictly, matching the stable C set operations. */
  | { readonly kind: "set"; readonly indices: IndexInput }
  /** Masks contain one boolean/0/1 entry per model row or column. */
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

export interface SparseEntriesInput {
  readonly indices: IndexInput;
  readonly values: NumberInput;
}

export interface SparseSolutionInput extends SparseEntriesInput {}

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

export interface CallbackEventBase<T extends CallbackType = CallbackType> {
  readonly type: T;
  readonly message: string;
  readonly data: CallbackData;
}

export interface InterruptCallbackEvent
  extends CallbackEventBase<1 | 2 | 6> {
  /** Valid only for simplex, IPM, and MIP interrupt callback types. */
  interrupt(): void;
}

export interface UserSolutionCallbackEvent extends CallbackEventBase<9> {
  /** Valid only while a MIP user-solution callback is active. */
  setSolution(solution: NumberInput | SparseSolutionInput): RawStatus;
  repairSolution(): RawStatus;
}

export interface PassiveCallbackEvent
  extends CallbackEventBase<0 | 3 | 4 | 5 | 7> {}

export type CallbackEvent =
  | InterruptCallbackEvent
  | UserSolutionCallbackEvent
  | PassiveCallbackEvent;

export type CallbackEventFor<T extends CallbackType> =
  T extends 1 | 2 | 6
    ? InterruptCallbackEvent & { readonly type: T }
    : T extends 9
      ? UserSolutionCallbackEvent
      : PassiveCallbackEvent & { readonly type: T };

export interface CallbackData
  extends Readonly<Record<string, unknown>> {
  /** Present only for callback type 0. */
  readonly log_type?: number;
  /** MIP scalar fields are present only for callback types 3 through 7 and 9. */
  readonly running_time?: number;
  /** Present only for callback type 1. */
  readonly simplex_iteration_count?: number;
  /** Present only for callback type 2. */
  readonly ipm_iteration_count?: number;
  readonly objective_function_value?: number;
  readonly mip_node_count?: bigint;
  readonly mip_total_lp_iterations?: bigint;
  readonly mip_primal_bound?: number;
  readonly mip_dual_bound?: number;
  readonly mip_gap?: number;
  /** Present only for callback types 3 and 4. */
  readonly mip_solution?: Float64Array;
  /** Present only for callback type 7. */
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
export type HighsCallback = (event: CallbackEvent) => undefined;

export type HighsCallbackMap = {
  readonly [T in CallbackType]?: (
    event: CallbackEventFor<T>,
  ) => undefined;
};

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
  run(callbacks?: HighsCallbackMap): RunResult;
  postsolve(input: PostsolveInput): CallMetadata;
  /** Highs_getRunTime / Highs_zeroAllClocks. */
  getRunTime(): number;
  zeroAllClocks(): CallMetadata;

  /** Highs_getSolution / Highs_getBasis / Highs_getModelStatus. */
  getSolution(): Solution;
  getBasis(): Basis;
  getModelStatus(): ModelStatusCode;
  getObjectiveValue(): number;
  getObjectiveSense(): ObjectiveSense;
  getObjectiveOffset(): number;
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
  addCol(cost: number, lower: number, upper: number, entries: SparseEntriesInput): CallMetadata;
  addCols(data: Omit<ColumnData, "count">): CallMetadata;
  addRow(lower: number, upper: number, entries: SparseEntriesInput): CallMetadata;
  addRows(data: Omit<RowData, "count">): CallMetadata;
  /** Highs_ensureColwise / Highs_ensureRowwise. */
  ensureColwise(): CallMetadata;
  ensureRowwise(): CallMetadata;

  changeObjectiveSense(sense: ObjectiveSense): CallMetadata;
  changeObjectiveOffset(offset: number): CallMetadata;
  changeColIntegrality(index: number, type: VariableType): CallMetadata;
  /** Values follow selected entries; mask values instead span every column. */
  changeColsIntegrality(selection: IndexSelection, types: readonly VariableType[] | Int32Array): CallMetadata;
  clearIntegrality(): CallMetadata;
  changeColCost(index: number, cost: number): CallMetadata;
  /** Values follow selected entries; mask values instead span every column. */
  changeColsCost(selection: IndexSelection, costs: NumberInput): CallMetadata;
  changeColBounds(index: number, lower: number, upper: number): CallMetadata;
  /** Arrays follow selected entries; mask arrays instead span every column. */
  changeColsBounds(selection: IndexSelection, lower: NumberInput, upper: NumberInput): CallMetadata;
  changeRowBounds(index: number, lower: number, upper: number): CallMetadata;
  /** Arrays follow selected entries; mask arrays instead span every row. */
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
  getModelStatus(): ModelStatusCode;
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

  addCol(cost: number, lower: number, upper: number, entries: SparseEntriesInput): RawStatus;
  addCols(data: Omit<ColumnData, "count">): RawStatus;
  addVar(lower: number, upper: number): RawStatus;
  addVars(lower: NumberInput, upper: NumberInput): RawStatus;
  addRow(lower: number, upper: number, entries: SparseEntriesInput): RawStatus;
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
