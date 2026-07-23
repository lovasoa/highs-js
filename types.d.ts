/** Legacy one-shot solver returned by the loader. Calls are synchronous and blocking. */
export type LegacyHighs = {
  /**
   * Parses a CPLEX LP model, solves it, and returns a newly allocated result.
   * Option values are applied to a fresh native instance for this call. Native
   * read, option-setting, and run errors throw; terminal model states are
   * represented by `Status`. Malformed option values may also throw.
   */
  solve(problem: string, options?: HighsOptions): HighsSolution;
};

/** Read-only legacy solver options; omitted properties retain HiGHS defaults. */
type HighsOptions = Readonly<
  Partial<{
    /**
     * @default "choose"
     */
    presolve: 'off' | 'choose' | 'on';

    /**
     * LP/QP solver selection. Incompatible choices are warned about and ignored,
     * not used to discard integrality or quadratic terms: MIPs use the MIP
     * solver, while QPs support `choose`, `qpasm`, `ipm`, or `hipo`.
     * @default "choose"
     */
    solver: 'choose' | 'simplex' | 'ipm' | 'ipx' | 'hipo' | 'pdlp' | 'qpasm' | 'hipdlp';

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
     * Cumulative time budget in seconds for this native instance. Repeated
     * operations consume the remaining budget until clocks are reset.
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
     * Simplex scaling strategy: off / choose / equilibration / forced
     * equilibration / maximum-value scaling (0/1/2/3/4).
     * @default 2
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
     * @default 2147483647
     */
    simplex_iteration_limit: number;

    /**
     * Limit on the number of simplex UPDATE operations
     * @min 1
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
     * @default 2147483647
     */
    mip_max_nodes: number;

    /**
     * MIP solver max number of nodes where estimate is above cutoff bound
     * @min 0
     * @default 2147483647
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
     * @default 2147483647
     */
    mip_max_leaves: number;

    /**
     * Limit on the number of improving solutions found to stop the MIP
     * solver prematurely
     * @min 1
     * @default 2147483647
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
     * @default 2147483647
     */
    ipm_iteration_limit: number;

    /**
     * Iteration limit for PDLP solver
     * @min 0
     * @default 2147483647
     */
    pdlp_iteration_limit: number;

    /**
     * PDLP scaling bit mask: 1 => Ruiz, 2 => L2, and 4 => Pock-Chambolle.
     * @min 0
     * @default 5
     * @max 7
     */
    pdlp_scaling_mode: number;

    /**
     * PDLP restart strategy: 0 => off, 1 => fixed, 2 => adaptive, 3 => Halpern.
     * @min 0
     * @default 2
     * @max 3
     */
    pdlp_restart_strategy: number;

    /**
     * cuPDLP-C restart method: 0 => none, 1 => GPU, 2 => CPU.
     * @min 0
     * @default 1
     * @max 2
     */
    pdlp_cupdlpc_restart_method: number;

    /**
     * PDLP feasibility and optimality tolerance.
     * @min 1e-10
     * @default 1e-7
     */
    pdlp_optimality_tolerance: number;

    /**
     * Iteration limit for QP solver
     * @min 0
     * @default 2147483647
     */
    qp_iteration_limit: number;

    /**
     * Nullspace limit for QP solver
     * @min 0
     * @default 4000
     */
    qp_nullspace_limit: number;

    /**
     * IIS strategy bit mask. Combine `FromRay` (1), `FromLp` (2),
     * `Irreducible` (4), `ColPriority` (8), and `Relaxation` (16), or use
     * `Light`/`Default` (0).
     * @default 0
     */
    iis_strategy: IisStrategy;
  }>
>;
/**
 * Legacy solve result. `Rows` use zero-based model order and `Columns` are
 * keyed by column name. The union fully models only `Infeasible`: at runtime
 * `Not Set`, load/model/presolve/solve/postsolve errors, `Empty`, and `Unknown`
 * also omit primal, dual, and basis fields. Limit and unbounded statuses can
 * carry the best solution available, but do not imply one exists.
 */
type HighsSolution =
  | GenericHighsSolution<true, HighsLinearSolutionColumn, HighsLinearSolutionRow>
  | GenericHighsSolution<false, HighsMixedIntegerLinearSolutionColumn, HighsMixedIntegerLinearSolutionRow>
  | GenericHighsSolution<boolean, HighsInfeasibleSolutionColumn, HighsInfeasibleSolutionRow, 'Infeasible'>;

/** Common shape of a detached legacy solution. `IsLinear` selects LP or MIP fields. */
type GenericHighsSolution<IsLinear extends boolean, ColType, RowType, Status extends HighsModelStatus = HighsModelStatus> = {
  /** Human-readable HiGHS model status. */
  Status: Status;
  /** Objective value including the model offset; may be non-finite without a solution. */
  ObjectiveValue: number;
  /** Detached column results keyed by unique model column name. */
  Columns: Record<string, ColType>;
  /** Detached row results in zero-based model row order. */
  Rows: RowType[];
};

/** Human-readable terminal or error state reported by the legacy solver. */
type HighsModelStatus =
  /** No solve status has been established. */
  | 'Not Set'
  /** Input could not be loaded. */
  | 'Load error'
  /** Model data is invalid. */
  | 'Model error'
  /** Presolve failed. */
  | 'Presolve error'
  /** The selected solver failed. */
  | 'Solve error'
  /** Mapping the presolved solution back failed. */
  | 'Postsolve error'
  /** The model has no rows or columns requiring optimization. */
  | 'Empty'
  /** An optimal solution was proved. */
  | 'Optimal'
  /** Infeasibility was proved. */
  | 'Infeasible'
  /** Presolve could not distinguish infeasibility from unboundedness. */
  | 'Primal infeasible or unbounded'
  /** Primal unboundedness was proved. */
  | 'Unbounded'
  /** The configured objective bound stopped the solve. */
  | 'Bound on objective reached'
  /** The configured MIP objective target was reached. */
  | 'Target for objective reached'
  /** The configured wall-clock limit stopped the solve. */
  | 'Time limit reached'
  /** A solver iteration limit stopped the solve. */
  | 'Iteration limit reached'
  /** HiGHS could not classify the final state. */
  | 'Unknown';

/** Bounds and zero-based index returned when no feasible primal solution exists. */
interface HighsInfeasibleSolutionBase {
  /** Zero-based row or column index. */
  Index: number;
  /** Lower bound; the legacy runtime uses `-Infinity` when unbounded below. */
  Lower: number;
  /** Upper bound; the legacy runtime uses `Infinity` when unbounded above. */
  Upper: number;
}

/** Infeasible legacy row metadata, in model order. */
interface HighsInfeasibleSolutionRow extends HighsInfeasibleSolutionBase {}
/** Infeasible legacy column metadata. */
interface HighsInfeasibleSolutionColumn extends HighsInfeasibleSolutionBase {
  /** Legacy integrality classification; semi-variable kinds are not distinguished. */
  Type: 'Integer' | 'Continuous';
}

/** Common bounds, index, and primal value for a feasible legacy result item. */
interface HighsSolutionBase extends HighsInfeasibleSolutionBase {
  /** Primal column value or row activity. */
  Primal: number;
}

/** LP column result including dual and basis information. */
interface HighsLinearSolutionColumn extends HighsSolutionBase {
  /** Reduced cost of the column. */
  Dual: number;
  /** Column name copied from the parsed model. */
  Name: string;
  /** Legacy basis label derived from native basis status and bounds. */
  Status: HighsBasisStatus;
}

/** MIP column result; dual and basis values are not defined for MIP solutions. */
interface HighsMixedIntegerLinearSolutionColumn extends HighsSolutionBase {
  /** Legacy integrality classification. */
  Type: 'Integer' | 'Continuous';
  /** Column name copied from the parsed model. */
  Name: string;
}

/** LP row result including shadow price and basis information. */
interface HighsLinearSolutionRow extends HighsSolutionBase {
  /** Row dual value (shadow price). */
  Dual: number;
  /** Legacy basis label derived from native row basis status and bounds. */
  Status: HighsBasisStatus;
  /** Row name copied from the parsed model. */
  Name: string;
}

/** MIP row result; only bounds, index, and primal activity are available. */
interface HighsMixedIntegerLinearSolutionRow extends HighsSolutionBase {}

/** Compact legacy basis labels used by the one-shot result. */
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

/** Legacy Emscripten loader customization. */
type HighsLoaderOptions = Readonly<
  Partial<{
    /** Returns the URL/path for a loader asset, notably `highs.wasm`. */
    locateFile(file: string): string;
  }>
>;

/** Bit mask selecting optional internal analysis diagnostics. Flags may be combined. */
declare enum HighsAnalysisLevel {
  /** Disable analysis output. */
  kHighsAnalysisLevelNone = 0,
  /** Analyze model data. */
  kHighsAnalysisLevelModelData = 1,
  /** Collect solver summary data. */
  kHighsAnalysisLevelSolverSummaryData = 2,
  /** Collect solver runtime data. */
  kHighsAnalysisLevelSolverRuntimeData = 4,
  /** Collect solver timing data. */
  kHighsAnalysisLevelSolverTime = 8,
  /** Collect numerical linear algebra data. */
  kHighsAnalysisLevelNlaData = 16,
  /** Collect numerical linear algebra timings. */
  kHighsAnalysisLevelNlaTime = 32,
  /** Collect MIP analysis data. */
  kHighsAnalysisLevelMipData = 64,
  /** Collect MIP timing data. */
  kHighsAnalysisLevelMipTime = 128,
  /** Collect presolve timing data. */
  kHighsAnalysisLevelPresolveTime = 256,
  /** Smallest valid mask. */
  kHighsAnalysisLevelMin = 0,
  /** Largest valid combined mask. */
  kHighsAnalysisLevelMax = 511
}

/** Cost level of internal debug checks; higher levels can be substantially slower. */
declare enum HighsDebugLevel {
  /** Disable debug checks. */
  kHighsDebugLevelNone = 0,
  /** Enable inexpensive checks. */
  kHighsDebugLevelCheap,
  /** Enable costly checks. */
  kHighsDebugLevelCostly,
  /** Enable the most expensive checks. */
  kHighsDebugLevelExpensive,
  /** Minimum accepted level. */
  kHighsDebugLevelMin = 0,
  /** Maximum accepted level. */
  kHighsDebugLevelMax = 3
}

/** Simplex matrix scaling algorithm. */
declare enum SimplexScaleStrategy {
  /** Minimum valid strategy value. */
  kSimplexScaleStrategyMin = 0,
  /** Disable scaling. */
  kSimplexScaleStrategyOff = 0,
  /** Let HiGHS choose the strategy. */
  kSimplexScaleStrategyChoose, // 1
  /** Use equilibration scaling. */
  kSimplexScaleStrategyEquilibration, // 2
  /** Force equilibration even when HiGHS would skip it. */
  kSimplexScaleStrategyForcedEquilibration, // 3
  /** Scale by each row/column's maximum absolute value. */
  kSimplexScaleStrategyMaxValue, // 4
  /** Alias for maximum-value scaling. */
  kSimplexScaleStrategyMaxValue015 = 4,
  /** Legacy alias for maximum-value scaling. */
  kSimplexScaleStrategyMaxValue0157 = 4,
  /** Maximum valid strategy value. */
  kSimplexScaleStrategyMax = 4
}

/** Simplex algorithm selection. */
declare enum SimplexStrategy {
  /** Minimum valid strategy value. */
  kSimplexStrategyMin = 0,
  /** Let HiGHS choose the algorithm. */
  kSimplexStrategyChoose = 0,
  /** Use dual simplex. */
  kSimplexStrategyDual, // 1
  /** Alias for serial dual simplex. */
  kSimplexStrategyDualPlain = 1,
  /** Use task-parallel dual simplex (PAMI). */
  kSimplexStrategyDualTasks, // 2
  /** Use multi-threaded dual simplex (SIP). */
  kSimplexStrategyDualMulti, // 3
  /** Use primal simplex. */
  kSimplexStrategyPrimal, // 4
  /** Maximum selectable strategy value. */
  kSimplexStrategyMax = 4,
  /** Number of strategy values in the native enum. */
  kSimplexStrategyNum
}

/** Initial-basis crash strategy used before simplex iterations. */
declare enum SimplexCrashStrategy {
  /** Minimum valid strategy value. */
  kSimplexCrashStrategyMin = 0,
  /** Do not crash an initial basis. */
  kSimplexCrashStrategyOff = 0,
  /** LTSSF crash variant using K ordering. */
  kSimplexCrashStrategyLtssfK,
  /** Alias for the default LTSSF crash. */
  kSimplexCrashStrategyLtssf = 1,
  /** Bixby crash. */
  kSimplexCrashStrategyBixby,
  /** Primal LTSSF crash variant. */
  kSimplexCrashStrategyLtssfPri,
  /** LTSF crash variant using K ordering. */
  kSimplexCrashStrategyLtsfK,
  /** Primal LTSF crash variant. */
  kSimplexCrashStrategyLtsfPri,
  /** LTSF crash variant. */
  kSimplexCrashStrategyLtsf,
  /** Bixby crash ignoring nonzero column costs. */
  kSimplexCrashStrategyBixbyNoNonzeroColCosts,
  /** Construct a basic crash basis. */
  kSimplexCrashStrategyBasic,
  /** Diagnostic strategy for singularity testing. */
  kSimplexCrashStrategyTestSing,
  /** Maximum valid strategy value. */
  kSimplexCrashStrategyMax = 9
}

/** Simplex pricing edge-weight strategy. Primal simplex does not support steepest edge. */
declare enum SimplexEdgeWeightStrategy {
  /** Minimum valid strategy value. */
  kSimplexEdgeWeightStrategyMin = -1,
  /** Let HiGHS choose a pricing strategy. */
  kSimplexEdgeWeightStrategyChoose = -1,
  /** Dantzig pricing. */
  kSimplexEdgeWeightStrategyDantzig,
  /** Devex pricing. */
  kSimplexEdgeWeightStrategyDevex,
  /** Steepest-edge pricing, valid for dual simplex. */
  kSimplexEdgeWeightStrategySteepestEdge,
  /** Maximum valid dual pricing value. */
  kSimplexEdgeWeightStrategyMax = 2
}

/** Serialization style for solution files. */
declare enum SolutionStyle {
  /** Deprecated legacy HiGHS raw format. */
  kSolutionStyleOldRaw = -1,
  /** Machine-readable HiGHS format. */
  kSolutionStyleRaw = 0,
  /** Human-readable HiGHS format. */
  kSolutionStylePretty, // 1;
  /** Machine-readable GLPSOL format. */
  kSolutionStyleGlpsolRaw, // 2;
  /** Human-readable GLPSOL format. */
  kSolutionStyleGlpsolPretty, // 3;
  /** Sparse machine-readable HiGHS format. */
  kSolutionStyleSparse, // 4;
  /** Minimum accepted style code. */
  kSolutionStyleMin = -1,
  /** Maximum accepted style code. */
  kSolutionStyleMax = 4
}

/** Placement of the objective row in GLPSOL solution output. */
declare enum GlpsolCostRowLocation {
  /** Place the objective row last. */
  kGlpsolCostRowLocationLast = -2,
  /** Omit the objective row. */
  kGlpsolCostRowLocationNone, // -1
  /** Omit an empty objective row; otherwise preserve its data-file position. */
  kGlpsolCostRowLocationNoneIfEmpty, // 0
  /** Minimum special location code; positive values denote one-based row locations. */
  kGlpsolCostRowLocationMin = -2
}

/** Combinable IIS strategy bits supported by this vendored HiGHS version. */
declare enum IisStrategy {
  /** Minimum valid strategy value. */
  kIisStrategyMin = 0,
  /** Lightweight default strategy with no optional bits. */
  kIisStrategyLight = 0,
  /** Try to derive the conflict from a dual ray. */
  kIisStrategyFromRay = 1,
  /** Try an elastic LP. */
  kIisStrategyFromLp = 2,
  /** Refine the result to a true irreducible subsystem. */
  kIisStrategyIrreducible = 4,
  /** Prioritize columns rather than rows. */
  kIisStrategyColPriority = 8,
  /** Find a relaxation IIS for a MIP. */
  kIisStrategyRelaxation = 16,
  /** Alias for the lightweight default strategy. */
  kIisStrategyDefault = 0,
  /** Maximum valid combination of strategy bits. */
  kIisStrategyMax = 31
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

/** Public alias for options accepted by the legacy one-shot solver. */
export type LegacyHighsOptions = HighsOptions;
/** Public alias for the detached legacy one-shot result union. */
export type LegacyHighsSolution = HighsSolution;
/** Public alias for legacy loader asset-location options. */
export type LegacyLoaderOptions = HighsLoaderOptions;

/** Loader configuration. Inputs are read during asynchronous module initialization. */
export interface InitOptions extends LegacyLoaderOptions {
  /** Returns the URL or environment path for an Emscripten asset, notably `highs.wasm`. */
  locateFile?(file: string): string;
  /** Preloaded Wasm bytes; the loader does not take ownership of the supplied buffer. */
  wasmBinary?: ArrayBuffer | ArrayBufferView;
  /** Precompiled module, avoiding compilation of `wasmBinary` or the located file. */
  wasmModule?: WebAssembly.Module;
  /** Receives normal native output synchronously instead of the default console sink. */
  print?: (message: string) => void;
  /** Receives native diagnostics synchronously instead of the default error sink. */
  printErr?: (message: string) => void;
}

/** Immutable version metadata compiled into the loaded native library. */
export interface HighsVersion {
  /** Upstream semantic-version major component. */
  readonly major: number;
  /** Upstream semantic-version minor component. */
  readonly minor: number;
  /** Upstream semantic-version patch component. */
  readonly patch: number;
  /** Complete upstream version string. */
  readonly string: string;
  /** Source revision reported by the vendored HiGHS build. */
  readonly gitHash: string;
}

/** Loaded runtime combining the compatibility solver with persistent and raw APIs. */
export type Highs = LegacyHighs & {
  /** Immutable version metadata for the loaded Wasm build. */
  readonly version: HighsVersion;
  /** IEEE positive infinity returned by this build of HiGHS. */
  readonly infinity: number;
  /** Native `HighsInt` width in bytes. */
  readonly intBytes: number;
  /** Width of native `HighsInt`; indices must fit this signed width. */
  readonly intBits: number;
  /** Current Wasm linear-memory capacity, not the amount of live allocation. */
  readonly memoryBytes: number;
  /** Immutable numeric encodings accepted and returned by the API. */
  readonly constants: HighsConstants;
  /** Error classes used by throwing persistent wrappers. */
  readonly errors: HighsErrorConstructors;

  /** Creates an owned persistent instance and optionally copies/decodes its initial model. */
  createModel(source?: ModelData | EncodedModel): Model;

  /** Status-preserving APIs corresponding closely to the stable C API. */
  readonly raw: RawRuntimeApi;
};

/** Loads and instantiates the runtime asynchronously; solver calls thereafter block synchronously. */
export default function highsLoader(options?: InitOptions): Promise<Highs>;

/** Native call status: error, success, or success with warning. */
export type HighsStatus = -1 | 0 | 1;
/** Non-error native status retained by throwing wrapper metadata. */
export type SuccessfulHighsStatus = 0 | 1;

/** Status-only result from a raw operation; raw errors do not throw. */
export interface RawStatus {
  /** Native status code. */
  readonly status: HighsStatus;
}

/** Raw value result. A value exists only when status is success or warning. */
export type RawResult<T> =
  | {
      /** Native error; no value was produced. */
      readonly status: -1;
      /** Prevents consumers from treating an error result as carrying data. */
      readonly value?: never;
    }
  | {
      /** Native success or warning status. */
      readonly status: SuccessfulHighsStatus;
      /** Detached result value owned by JavaScript. */
      readonly value: T;
    };

/** Metadata retained by a successful throwing-wrapper call. */
export interface CallMetadata {
  /** Native success or warning status. */
  readonly status: SuccessfulHighsStatus;
  /** Stable wrapper summaries for kHighsStatusWarning. */
  readonly warnings: readonly string[];
}

/** Error thrown when a persistent wrapper receives native status `-1`. */
export interface HighsError extends Error {
  /** Native error status. */
  readonly status: -1;
  /** Stable wrapper operation label associated with the failure. */
  readonly operation: string;
}

/** Error thrown when any non-idempotent operation uses a disposed model. */
export interface HighsDisposedError extends HighsError {}
/** Error thrown before native entry when JavaScript input violates a wrapper invariant. */
export interface HighsValidationError extends HighsError {}
/** Error thrown when a callback reenters an operation not safe during native execution. */
export interface HighsReentrancyError extends HighsError {}
/** Error thrown for thread, path, and other options intentionally blocked by the wrapper. */
export interface HighsUnsupportedOptionError extends HighsError {
  /** Exact rejected snake_case option name. */
  readonly option: string;
}

/** Constructors corresponding to errors thrown by persistent wrapper methods. */
export interface HighsErrorConstructors {
  /** General native-status failure constructor. */
  readonly HighsError: {
    /** Creates an error identifying the failed wrapper operation. */
    new (message: string, operation: string): HighsError;
  };
  /** Disposed-model error constructor. */
  readonly HighsDisposedError: {
    /** Creates the standard use-after-dispose error. */
    new (): HighsDisposedError;
  };
  /** Input-validation error constructor. */
  readonly HighsValidationError: {
    /** Creates a wrapper input-validation error. */
    new (message: string): HighsValidationError;
  };
  /** Callback-reentrancy error constructor. */
  readonly HighsReentrancyError: {
    /** Creates the standard callback-reentrancy error. */
    new (): HighsReentrancyError;
  };
  /** Unsupported-option error constructor. */
  readonly HighsUnsupportedOptionError: {
    /** Creates an error for the exact blocked HiGHS option name. */
    new (option: string): HighsUnsupportedOptionError;
  };
}

/** Numeric native constants grouped by domain; objects are immutable. */
export interface HighsConstants {
  /** Native call status codes. */
  readonly status: Readonly<{
    /** Operation failed; raw results carry no value. */
    error: -1;
    /** Operation completed normally. */
    ok: 0;
    /** Operation completed with a non-fatal warning. */
    warning: 1;
  }>;
  /** Column-domain encodings for continuous, integer, semi, and implicit integer variables. */
  readonly variableType: Readonly<{
    /** Unrestricted continuous variable. */
    continuous: 0;
    /** Integer variable. */
    integer: 1;
    /** Continuous variable that is zero or within its bounds. */
    semiContinuous: 2;
    /** Integer variable that is zero or within its bounds. */
    semiInteger: 3;
    /** Implicit integer domain used internally/by supported model formats. */
    implicitInteger: 4;
  }>;
  /** Branded objective senses, avoiding ambiguous raw numeric literals. */
  readonly objectiveSense: Readonly<{
    /** Minimize the objective (`1` natively). */
    minimize: ObjectiveSense;
    /** Maximize the objective (`-1` natively). */
    maximize: ObjectiveSense;
  }>;
  /** Native compressed sparse matrix orientation codes. */
  readonly matrixFormat: Readonly<{
    /** Compressed columns. */
    columnWise: 1;
    /** Compressed rows. */
    rowWise: 2;
  }>;
  /** Native Hessian storage format codes. */
  readonly hessianFormat: Readonly<{
    /** Store one triangle of the symmetric Hessian. */
    triangular: 1;
    /** Store the full square Hessian. */
    square: 2;
  }>;
  /** Native option-value type codes. */
  readonly optionType: Readonly<{
    /** Boolean option. */
    boolean: 0;
    /** Native integer option. */
    integer: 1;
    /** Double-precision option. */
    double: 2;
    /** String option. */
    string: 3;
  }>;
  /** Native information-value type codes; `int64` is returned as `bigint`. */
  readonly infoType: Readonly<{
    /** Native 64-bit integer, exposed as `bigint`. */
    int64: -1;
    /** Native `HighsInt`, exposed as `number`. */
    integer: 1;
    /** Double-precision value. */
    double: 2;
  }>;
  /** Availability/feasibility codes for primal and dual solutions. */
  readonly solutionStatus: Readonly<{
    /** No solution is available. */
    none: 0;
    /** Available values are known infeasible. */
    infeasible: 1;
    /** A feasible solution is available. */
    feasible: 2;
  }>;
  /** Basis validity codes. */
  readonly basisValidity: Readonly<{
    /** Basis state is absent or invalid. */
    invalid: 0;
    /** Basis state is valid. */
    valid: 1;
  }>;
  /** Column/row basis status codes. */
  readonly basisStatus: Readonly<{
    /** Nonbasic at lower bound. */
    lower: 0;
    /** Basic variable or row slack. */
    basic: 1;
    /** Nonbasic at upper bound. */
    upper: 2;
    /** Nonbasic at zero for a free variable. */
    zero: 3;
    /** Generic nonbasic status. */
    nonbasic: 4;
  }>;
  /**
   * Callback channel identifiers exposed by this wrapper. Native type `8`
   * (define MIP lazy constraints) exists but is intentionally excluded.
   */
  readonly callbackType: Readonly<{
    /** General log-message callback. */
    logging: 0;
    /** Simplex interrupt polling callback. */
    simplexInterrupt: 1;
    /** Interior-point interrupt polling callback. */
    ipmInterrupt: 2;
    /** MIP feasible-solution callback. */
    mipSolution: 3;
    /** MIP incumbent-improvement callback. */
    mipImprovingSolution: 4;
    /** MIP progress/logging callback. */
    mipLogging: 5;
    /** MIP interrupt polling callback. */
    mipInterrupt: 6;
    /** MIP cut-pool callback. */
    mipCutPool: 7;
    /** MIP callback that accepts a user solution. */
    mipUserSolution: 9;
  }>;
  /** Result codes produced by presolve. */
  readonly presolveStatus: Readonly<{
    /** Presolve has not run. */
    notPresolved: -1;
    /** Presolve made no reduction. */
    notReduced: 0;
    /** Presolve proved infeasibility. */
    infeasible: 1;
    /** Presolve proved unboundedness or infeasibility without distinguishing. */
    unboundedOrInfeasible: 2;
    /** Presolve reduced but did not eliminate the model. */
    reduced: 3;
    /** Presolve reduced the model to empty. */
    reducedToEmpty: 4;
    /** Presolve reached its time limit. */
    timeout: 5;
    /** Native presolve received an invalid null object. */
    nullError: 6;
    /** Presolve options were invalid. */
    optionsError: 7;
    /** Presolve allocation failed. */
    outOfMemory: 8;
  }>;
  /** Detailed model state after load, presolve, or solve. */
  readonly modelStatus: Readonly<{
    /** No status has been established. */
    notSet: 0;
    /** Model loading failed. */
    loadError: 1;
    /** Model data is invalid. */
    modelError: 2;
    /** Presolve failed. */
    presolveError: 3;
    /** Solver failed. */
    solveError: 4;
    /** Postsolve failed. */
    postsolveError: 5;
    /** Empty model was handled without optimization. */
    empty: 6;
    /** Optimality was proved. */
    optimal: 7;
    /** Infeasibility was proved. */
    infeasible: 8;
    /** Infeasible or unbounded, not distinguished. */
    unboundedOrInfeasible: 9;
    /** Unboundedness was proved. */
    unbounded: 10;
    /** Objective-bound stopping criterion was reached. */
    objectiveBound: 11;
    /** Objective-target stopping criterion was reached. */
    objectiveTarget: 12;
    /** Time limit was reached. */
    timeLimit: 13;
    /** Iteration limit was reached. */
    iterationLimit: 14;
    /** Final state could not be classified. */
    unknown: 15;
    /** Configured solution-count limit was reached. */
    solutionLimit: 16;
    /** Solve was interrupted, including by a callback. */
    interrupted: 17;
  }>;
  /** IIS strategy, bound classification, and conflict-membership encodings. */
  readonly iis: Readonly<{
    /** Lightweight IIS strategy. */
    strategyLight: 0;
    /** IIS strategy prioritizing row constraints. */
    strategyRowPriority: 6;
    /** IIS strategy prioritizing column bounds. */
    strategyColPriority: 14;
    /** IIS item has no finite active bound. */
    boundFree: 1;
    /** IIS uses the lower bound. */
    boundLower: 2;
    /** IIS uses the upper bound. */
    boundUpper: 3;
    /** IIS uses both lower and upper bounds. */
    boundBoxed: 4;
    /** Item is not part of the conflict. */
    notInConflict: -1;
    /** Item may be part of the conflict. */
    maybeInConflict: 0;
    /** Item is part of the conflict. */
    inConflict: 1;
  }>;
}

/** Dense floating-point input copied into temporary Wasm memory before return. */
export type NumberInput = readonly number[] | Float64Array;
/** Zero-based index input copied into native `HighsInt` storage. */
export type IndexInput = readonly number[] | Int32Array;
/** Selection mask containing exactly one boolean or 0/1 value per axis item. */
export type MaskInput = readonly boolean[] | Uint8Array | Int32Array;
/** Native variable-domain code; use `highs.constants.variableType` for readability. */
export type VariableType = 0 | 1 | 2 | 3 | 4;
/** Private brand preventing accidental reversal of native objective-sense literals. */
declare const __objectiveSenseBrand: unique symbol;
/**
 * Objective sense: `1` (minimize) or `-1` (maximize).
 *
 * The raw numeric literals are intentionally *not* assignable to this type.
 * Use the named constants exposed at `highs.constants.objectiveSense`
 * (`minimize` / `maximize`) so the intent is self-documenting and the
 * minimize/maximize encoding cannot be silently swapped.
 */
export type ObjectiveSense = (1 | -1) & {
  /** Compile-time-only objective-sense brand; absent at runtime. */
  readonly [__objectiveSenseBrand]: true;
};
/** Compressed sparse matrix orientation: column-compressed or row-compressed. */
export type MatrixFormat = "csc" | "csr";
/** Hessian storage: one triangle of a symmetric matrix or the full square matrix. */
export type HessianFormat = "triangular" | "square";
/** Native basis status code: lower, basic, upper, zero, or nonbasic. */
export type BasisStatus = 0 | 1 | 2 | 3 | 4;
/** Numeric model status; compare with `highs.constants.modelStatus`. */
export type ModelStatusCode =
  /** Not set. */
  | 0
  /** Load error. */
  | 1
  /** Invalid model. */
  | 2
  /** Presolve error. */
  | 3
  /** Solve error. */
  | 4
  /** Postsolve error. */
  | 5
  /** Empty model. */
  | 6
  /** Optimal. */
  | 7
  /** Infeasible. */
  | 8
  /** Unbounded or infeasible, not distinguished. */
  | 9
  /** Unbounded. */
  | 10
  /** Objective bound reached. */
  | 11
  /** Objective target reached. */
  | 12
  /** Time limit reached. */
  | 13
  /** Iteration limit reached. */
  | 14
  /** Unknown terminal state. */
  | 15
  /** Solution-count limit reached. */
  | 16
  /** Interrupted. */
  | 17;

/** Compressed sparse matrix input. Indices are zero-based and values are copied. */
export interface SparseMatrixInput {
  /** Determines whether starts delimit columns (`csc`) or rows (`csr`). */
  readonly format: MatrixFormat;
  /** Matrix row count. */
  readonly numRows: number;
  /** Matrix column count. */
  readonly numCols: number;
  /** Conventional compressed-sparse starts; length is major dimension + 1. */
  readonly starts: IndexInput;
  /** Minor-axis index for each nonzero; length equals `values.length`. */
  readonly indices: IndexInput;
  /** Nonzero coefficients; explicit zeros may be dropped by HiGHS. */
  readonly values: NumberInput;
}

/** Detached compressed sparse matrix snapshot owned by JavaScript. */
export interface SparseMatrix {
  /** Snapshot orientation. */
  readonly format: MatrixFormat;
  /** Number of rows in the snapshot. */
  readonly numRows: number;
  /** Number of columns in the snapshot. */
  readonly numCols: number;
  /** Major-axis starts, length `majorDimension + 1`. */
  readonly starts: Int32Array;
  /** Zero-based minor indices, one per nonzero. */
  readonly indices: Int32Array;
  /** Coefficients, one per index. */
  readonly values: Float64Array;
}

/** Sparse Hessian input for a quadratic objective; arrays are copied. */
export interface HessianInput {
  /** Triangular symmetric storage or full square storage. */
  readonly format: HessianFormat;
  /** Hessian row and column dimension, normally equal to model column count. */
  readonly dimension: number;
  /** Length is dimension + 1. */
  readonly starts: IndexInput;
  /** Zero-based row index of each stored Hessian entry. */
  readonly indices: IndexInput;
  /** Stored coefficients in `0.5 * x'Qx`; length equals `indices.length`. */
  readonly values: NumberInput;
}

/** Detached Hessian snapshot owned by JavaScript. */
export interface Hessian {
  /** Storage format used by the returned snapshot. */
  readonly format: HessianFormat;
  /** Square matrix dimension. */
  readonly dimension: number;
  /** Column starts of length `dimension + 1`. */
  readonly starts: Int32Array;
  /** Zero-based row index for each stored entry. */
  readonly indices: Int32Array;
  /** Stored quadratic coefficients. */
  readonly values: Float64Array;
}

/** Complete LP, MIP, or QP model input. Every supplied array/string is copied. */
export interface ModelData {
  /** Number of columns; all column vectors must have this length. */
  readonly numCols: number;
  /** Number of rows; all row vectors must have this length. */
  readonly numRows: number;
  /** Objective direction; defaults to minimize. */
  readonly sense?: ObjectiveSense;
  /** Constant objective term; defaults to zero. */
  readonly offset?: number;
  /** Linear objective coefficients, length `numCols`. */
  readonly colCost: NumberInput;
  /** Column lower bounds, length `numCols`; use `highs.infinity` for infinity. */
  readonly colLower: NumberInput;
  /** Column upper bounds, length `numCols`. */
  readonly colUpper: NumberInput;
  /** Row lower bounds, length `numRows`. */
  readonly rowLower: NumberInput;
  /** Row upper bounds, length `numRows`. */
  readonly rowUpper: NumberInput;
  /** Constraint matrix whose dimensions must match `numRows` and `numCols`. */
  readonly matrix: SparseMatrixInput;
  /** Optional variable types, length `numCols`; omission makes an LP/QP. */
  readonly integrality?: readonly VariableType[] | Int32Array;
  /** Optional quadratic objective; its dimension must equal `numCols`. */
  readonly hessian?: HessianInput;
  /** Optional column names, length `numCols`; duplicate/invalid names may be rejected. */
  readonly colNames?: readonly string[];
  /** Optional row names, length `numRows`. */
  readonly rowNames?: readonly string[];
  /** Optional model name copied into the native instance. */
  readonly modelName?: string;
}

/** Detached model snapshot; mutation never changes the native model. */
export interface DetachedModelData {
  /** Number of columns represented by all column arrays. */
  readonly numCols: number;
  /** Number of rows represented by all row arrays. */
  readonly numRows: number;
  /** Current objective direction. */
  readonly sense: ObjectiveSense;
  /** Current constant objective term. */
  readonly offset: number;
  /** Linear objective coefficients, length `numCols`. */
  readonly colCost: Float64Array;
  /** Column lower bounds, length `numCols`. */
  readonly colLower: Float64Array;
  /** Column upper bounds, length `numCols`. */
  readonly colUpper: Float64Array;
  /** Row lower bounds, length `numRows`. */
  readonly rowLower: Float64Array;
  /** Row upper bounds, length `numRows`. */
  readonly rowUpper: Float64Array;
  /** Detached constraint matrix in the requested orientation. */
  readonly matrix: SparseMatrix;
  /** Variable types, length `numCols`; continuous entries are zero. */
  readonly integrality: Int32Array;
  /** Detached Hessian when the model has a quadratic objective. */
  readonly hessian?: Hessian;
}

/** In-memory LP or MPS serialization; no caller-controlled filesystem path is used. */
export interface EncodedModel {
  /** Parser format, independent of a filename extension. */
  readonly format: "lp" | "mps";
  /** LP text or MPS text/binary bytes copied into private temporary storage. */
  readonly data: string | Uint8Array;
}

/** Zero-based row/column selection used by query, change, and deletion operations. */
export type IndexSelection =
  | {
      /** Select an inclusive contiguous range. */
      readonly kind: "range";
      /** First selected zero-based index. */
      readonly from: number;
      /** Last selected zero-based index, inclusive. */
      readonly to: number;
    }
  /** Indices must increase strictly, matching the stable C set operations. */
  | {
      /** Select an explicit strictly increasing set. */
      readonly kind: "set";
      /** Zero-based selected indices. */
      readonly indices: IndexInput;
    }
  /** Masks contain one boolean/0/1 entry per model row or column. */
  | {
      /** Select positions whose mask value is true/nonzero. */
      readonly kind: "mask";
      /** Full-axis mask copied before the native call. */
      readonly mask: MaskInput;
    };

/** Detached data for selected or newly added columns. */
export interface ColumnData {
  /** Number of represented columns. */
  readonly count: number;
  /** Objective coefficients, length `count`. */
  readonly cost: Float64Array;
  /** Lower bounds, length `count`. */
  readonly lower: Float64Array;
  /** Upper bounds, length `count`. */
  readonly upper: Float64Array;
  /** Coefficients with `numCols === count` and rows matching the model. */
  readonly matrix: SparseMatrix;
}

/** Detached data for selected or newly added rows. */
export interface RowData {
  /** Number of represented rows. */
  readonly count: number;
  /** Lower bounds, length `count`. */
  readonly lower: Float64Array;
  /** Upper bounds, length `count`. */
  readonly upper: Float64Array;
  /** Coefficients with `numRows === count` and columns matching the model. */
  readonly matrix: SparseMatrix;
}

/** Dense solution-start input; each present array must match its model axis. */
export interface SolutionInput {
  /** Primal column values, length `numCols`. */
  readonly colValue?: NumberInput;
  /** Primal row activities, length `numRows`. */
  readonly rowValue?: NumberInput;
  /** Column dual values/reduced costs, length `numCols`. */
  readonly colDual?: NumberInput;
  /** Row dual values, length `numRows`. */
  readonly rowDual?: NumberInput;
}

/** Detached dense solution snapshot; availability depends on solve status. */
export interface Solution {
  /** Primal column values, length `numCols`. */
  readonly colValue: Float64Array;
  /** Primal row activities, length `numRows`. */
  readonly rowValue: Float64Array;
  /** Column dual values, length `numCols`; not meaningful for MIP solutions. */
  readonly colDual: Float64Array;
  /** Row dual values, length `numRows`; not meaningful for MIP solutions. */
  readonly rowDual: Float64Array;
}

/** Sparse zero-based index/value pairs; lengths must match and indices must be valid. */
export interface SparseEntriesInput {
  /** Zero-based row/column indices. */
  readonly indices: IndexInput;
  /** Value corresponding to each index. */
  readonly values: NumberInput;
}

/** Sparse primal column assignment, typically used as a partial MIP start. */
export interface SparseSolutionInput extends SparseEntriesInput {}

/** Complete basis input; both arrays are copied and must match model dimensions. */
export interface BasisInput {
  /** Column basis statuses, length `numCols`. */
  readonly colStatus: readonly BasisStatus[] | Int32Array;
  /** Row basis statuses, length `numRows`. */
  readonly rowStatus: readonly BasisStatus[] | Int32Array;
}

/** Detached basis snapshot. A useful basis requires a solved or explicitly based LP. */
export interface Basis {
  /** Column basis statuses, length `numCols`. */
  readonly colStatus: Int32Array;
  /** Row basis statuses, length `numRows`. */
  readonly rowStatus: Int32Array;
}

/** Output of stateless LP/QP calls; all arrays are JavaScript-owned copies. */
export interface SolveOutput {
  /** Final model status, independent of the enclosing call status. */
  readonly modelStatus: ModelStatusCode;
  /** Dense primal/dual solution buffers. */
  readonly solution: Solution;
  /** Final simplex basis where available. */
  readonly basis: Basis;
}

/** Output of a stateless MIP call; MIP duals and bases are intentionally absent. */
export interface MipSolveOutput {
  /** Final MIP model status. */
  readonly modelStatus: ModelStatusCode;
  /** Detached primal solution. */
  readonly solution: {
    /** Primal column values, length `numCols`. */
    readonly colValue: Float64Array;
    /** Primal row activities, length `numRows`. */
    readonly rowValue: Float64Array;
  };
}

/** Successful persistent solve metadata. A limit status is not itself a call error. */
export interface RunResult extends CallMetadata {
  /** Model termination state established by the blocking solve. */
  readonly modelStatus: ModelStatusCode;
}

/** Presolved-space solution used to recover an original-space solution. */
export interface PostsolveInput {
  /** Primal values for the presolved columns. */
  readonly colValue: NumberInput;
  /** Optional dual values for presolved columns, length `presolvedNumCols`. */
  readonly colDual?: NumberInput;
  /** Optional dual values for presolved rows, length `presolvedNumRows`. */
  readonly rowDual?: NumberInput;
}

/** One lexicographic/blended linear objective; coefficient input is copied. */
export interface LinearObjectiveInput {
  /** Blend weight applied to this objective. */
  readonly weight: number;
  /** Constant term for this objective. */
  readonly offset: number;
  /** Coefficients in column order, length `numCols`. */
  readonly coefficients: NumberInput;
  /** Absolute degradation tolerance used for lower-priority objectives. */
  readonly absoluteTolerance: number;
  /** Relative degradation tolerance used for lower-priority objectives. */
  readonly relativeTolerance: number;
  /** Optimization priority; equal priorities are blended by weight. */
  readonly priority: number;
}

/** JavaScript representation accepted for a HiGHS option value. */
export type OptionValue = boolean | number | string;
/** Stable option storage categories. Integer options still use JavaScript `number`. */
export type OptionType = "boolean" | "integer" | "double" | "string";
/** Stable information categories; `int64` values are returned as `bigint`. */
export type InfoType = "int64" | "integer" | "double";

/** Current/default value and bounds for one exact snake_case option name. */
export interface OptionDescriptor<T extends OptionValue = OptionValue> {
  /** Exact native option name. */
  readonly name: string;
  /** Native option value category. */
  readonly type: OptionType;
  /** Current value on this model instance. */
  readonly current: T;
  /** Compiled default value. */
  readonly default: T;
  /** Inclusive numeric minimum, absent for boolean/string options. */
  readonly minimum?: number;
  /** Inclusive numeric maximum, absent for boolean/string options. */
  readonly maximum?: number;
}

/** Throwing option facade bound to one persistent model. */
export interface OptionStore {
  /**
   * Exact snake_case HiGHS option names. Thread/concurrency and file/path
   * options throw HighsUnsupportedOptionError in this new API.
   * Values are validated and copied synchronously. Native warnings are retained
   * in the returned metadata; native errors throw `HighsError`.
   */
  set(name: string, value: OptionValue): CallMetadata;
  /** Sets several options in property enumeration order; earlier changes remain if a later set fails. */
  set(values: Readonly<Record<string, OptionValue>>): CallMetadata;
  /** Gets the current value of an exact option name; throws if unknown. */
  get(name: string): OptionValue;
  /** Gets current/default value and numeric limits; HiGHS exposes no prose description. */
  describe(name: string): OptionDescriptor;
  /** Returns detached option names in native zero-based enumeration order. */
  names(): readonly string[];
  /** Restores every option to its compiled default. */
  reset(): CallMetadata;
  /** Parses option-file text through private storage; accepted settings mutate this instance. */
  read(text: string): CallMetadata;
  /** Serializes all options, or only deviations, to detached text without exposing a path. */
  export(deviationsOnly?: boolean): string;
}

/** Read-only facade for solve information on one model instance. */
export interface InfoStore {
  /** Gets an exact info item; 64-bit counters use `bigint`, and unavailable names throw. */
  get(name: string): number | bigint;
  /** Returns the storage category for an exact info name; throws if unknown. */
  type(name: string): InfoType;
}

/** Current original-model dimensions. */
export interface ModelDimensions {
  /** Number of columns. */
  readonly numCols: number;
  /** Number of rows. */
  readonly numRows: number;
  /** Number of stored constraint-matrix nonzeros. */
  readonly numNonzeros: number;
  /** Number of stored Hessian entries. */
  readonly hessianNonzeros: number;
}

/** Dimensions of the most recently generated presolved LP. */
export interface PresolvedDimensions {
  /** Number of presolved columns. */
  readonly numCols: number;
  /** Number of presolved rows. */
  readonly numRows: number;
  /** Number of presolved matrix nonzeros. */
  readonly numNonzeros: number;
}

/** Detached sensitivity-ranging arrays for one perturbation direction. */
export interface RangingRecord {
  /** Limiting cost or bound value for each ranged item. */
  readonly value: Float64Array;
  /** Objective value at that limit. */
  readonly objective: Float64Array;
  /**
   * Entering augmented-variable identifier: columns are `0..numCols-1`, row
   * activities/slacks are `numCols..numCols+numRows-1`, and `-1` means none.
   */
  readonly inVariable: Int32Array;
  /** Leaving augmented-variable identifier using the same encoding, or `-1`. */
  readonly outVariable: Int32Array;
}

/** LP ranging result. Requires a valid optimal simplex basis. */
export interface RangingResult {
  /** Allowable upward perturbation of each column cost. */
  readonly colCostUp: RangingRecord;
  /** Allowable downward perturbation of each column cost. */
  readonly colCostDown: RangingRecord;
  /** Allowable upward perturbation of each column bound. */
  readonly colBoundUp: RangingRecord;
  /** Allowable downward perturbation of each column bound. */
  readonly colBoundDown: RangingRecord;
  /** Allowable upward perturbation of each row bound. */
  readonly rowBoundUp: RangingRecord;
  /** Allowable downward perturbation of each row bound. */
  readonly rowBoundDown: RangingRecord;
}

/** Irreducible-infeasible-subsystem membership and bound classifications. */
export interface IisResult {
  /** Zero-based columns retained in the compact IIS result. */
  readonly colIndex: Int32Array;
  /** Zero-based rows retained in the compact IIS result. */
  readonly rowIndex: Int32Array;
  /** Bound-type code for each `colIndex` entry. */
  readonly colBound: Int32Array;
  /** Bound-type code for each `rowIndex` entry. */
  readonly rowBound: Int32Array;
  /** Conflict-membership status for every model column. */
  readonly colStatus: Int32Array;
  /** Conflict-membership status for every model row. */
  readonly rowStatus: Int32Array;
}

/**
 * Feasibility-relaxation penalties. Negative global or local penalties prohibit
 * violation of the corresponding bound or row rather than rewarding it.
 */
export interface FeasibilityRelaxationInput {
  /** Default penalty for violating column lower bounds. */
  readonly globalLowerPenalty: number;
  /** Default penalty for violating column upper bounds. */
  readonly globalUpperPenalty: number;
  /** Default penalty for violating row bounds. */
  readonly globalRowPenalty: number;
  /** Per-column lower penalties, length `numCols`; omission uses the global penalty. */
  readonly localLowerPenalty?: NumberInput;
  /** Per-column upper penalties, length `numCols`; omission uses the global penalty. */
  readonly localUpperPenalty?: NumberInput;
  /** Per-row penalties, length `numRows`; omission uses the global penalty. */
  readonly localRowPenalty?: NumberInput;
}

/** Detached dense vector, optionally accompanied by its nonzero positions. */
export interface NumericVector {
  /** Full dense vector in model order. */
  readonly values: Float64Array;
  /** Zero-based nonzero indices when sparse output was requested. */
  readonly nonzeroIndices?: Int32Array;
}

/** Stable callback channel code; compare with `highs.constants.callbackType`. */
export type CallbackType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 9;

/**
 * Common synchronous callback event. `message`, `data`, and all nested arrays
 * are detached copies and remain usable after return; control methods expire.
 */
export interface CallbackEventBase<T extends CallbackType = CallbackType> {
  /** Callback channel that triggered the event. */
  readonly type: T;
  /** Native log/progress message, possibly empty. */
  readonly message: string;
  /** Detached snapshot of fields available for this callback channel. */
  readonly data: CallbackData;
}

/** Interrupt-capable event emitted while a solver is running. */
export interface InterruptCallbackEvent
  extends CallbackEventBase<1 | 2 | 6> {
  /** Valid only for simplex, IPM, and MIP interrupt callback types. */
  interrupt(): void;
}

/** MIP user-solution event that permits submitting a candidate before return. */
export interface UserSolutionCallbackEvent extends CallbackEventBase<9> {
  /** Valid only while a MIP user-solution callback is active. */
  setSolution(solution: NumberInput | SparseSolutionInput): RawStatus;
  /** Asks HiGHS to repair the candidate currently exposed to this callback. */
  repairSolution(): RawStatus;
}

/** Observation-only logging, MIP solution, progress, or cut-pool event. */
export interface PassiveCallbackEvent
  extends CallbackEventBase<0 | 3 | 4 | 5 | 7> {}

/** Discriminated union of all callback event capabilities. */
export type CallbackEvent =
  | InterruptCallbackEvent
  | UserSolutionCallbackEvent
  | PassiveCallbackEvent;

/** Event type corresponding to a particular callback channel code. */
export type CallbackEventFor<T extends CallbackType> =
  T extends 1 | 2 | 6
    ? InterruptCallbackEvent & {
        /** Exact interrupt callback channel selected by `T`. */
        readonly type: T;
      }
    : T extends 9
      ? UserSolutionCallbackEvent
      : PassiveCallbackEvent & {
          /** Exact passive callback channel selected by `T`. */
          readonly type: T;
        };

/**
 * Detached callback payload; optional fields are channel-dependent. Native MIP
 * node and LP-iteration counts are int64 values and therefore use `bigint`.
 */
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
  /** Current objective value when supplied by the callback channel. */
  readonly objective_function_value?: number;
  /** Explored MIP node count; represented as `bigint` to preserve `HighsInt`. */
  readonly mip_node_count?: bigint;
  /** Total MIP LP iterations, preserving native integer precision. */
  readonly mip_total_lp_iterations?: bigint;
  /** Best known feasible MIP objective bound. */
  readonly mip_primal_bound?: number;
  /** Best known dual MIP bound. */
  readonly mip_dual_bound?: number;
  /** Current relative MIP gap. */
  readonly mip_gap?: number;
  /** Present only for callback types 3 and 4. */
  readonly mip_solution?: Float64Array;
  /** Present only for callback type 7. */
  readonly cut_pool?: {
    /** Number of model columns addressed by cut indices. */
    readonly numCols: number;
    /** Number of cuts; `starts.length === numCuts + 1`. */
    readonly numCuts: number;
    /** CSR starts delimiting each cut. */
    readonly starts: Int32Array;
    /** Zero-based column indices for cut coefficients. */
    readonly indices: Int32Array;
    /** Cut coefficients parallel to `indices`. */
    readonly values: Float64Array;
    /** Cut lower bounds, length `numCuts`. */
    readonly lower: Float64Array;
    /** Cut upper bounds, length `numCuts`. */
    readonly upper: Float64Array;
  };
}

/**
 * Callback execution is synchronous. The runtime ignores ordinary return
 * values, but rejects Promises and other thenables. The `undefined` return type
 * expresses the recommended callback contract.
 */
export type HighsCallback = (event: CallbackEvent) => undefined;

/** Per-channel callback registry; omitted channels are not activated. */
export type HighsCallbackMap = {
  /** Synchronous handler for callback channel `T`; returning a value or Promise is invalid. */
  readonly [T in CallbackType]?: (
    event: CallbackEventFor<T>,
  ) => undefined;
};

/**
 * Persistent model owning one native HiGHS instance. Methods are synchronous,
 * copy inputs, and throw on validation/native errors unless explicitly noted.
 */
export interface Model {
  /** Status-preserving view of the same native instance; disposing either view disposes both. */
  readonly raw: RawModelApi;
  /** Option facade scoped to this instance. */
  readonly options: OptionStore;
  /** Solve-information facade scoped to this instance. */
  readonly info: InfoStore;
  /** Whether `dispose()` has destroyed the owned native instance. */
  readonly disposed: boolean;
  /** Metadata from the most recent successful throwing-wrapper operation. */
  readonly lastCall: CallMetadata;

  /** Resets model, solver state, and options to defaults while retaining native ownership. */
  clear(): CallMetadata;
  /** Resets model and solver state while retaining options. */
  clearModel(): CallMetadata;
  /** Clears solution, basis, and solver state while retaining the model. */
  clearSolver(): CallMetadata;
  /**
   * Clears model and solver state, then releases retained vector capacity. The
   * native instance and its options remain reusable.
   */
  releaseMemory(): CallMetadata;

  /** Replaces current model state by parsing copied LP/MPS content synchronously. */
  readModel(source: EncodedModel): CallMetadata;
  /** Serializes the current model to detached LP text via private temporary storage. */
  exportModel(format: "lp"): string;
  /** Serializes the current model to detached MPS bytes via private temporary storage. */
  exportModel(format: "mps"): Uint8Array;
  /** Serializes the last presolved model to LP text; call `presolve()` first. */
  exportPresolvedModel(format: "lp"): string;
  /** Serializes the presolved model to detached MPS bytes; call `presolve()` first. */
  exportPresolvedModel(format: "mps"): Uint8Array;
  /** Serializes current solution state as machine-readable text. */
  exportSolution(pretty?: false): string;
  /**
   * Serializes human-readable solution text; unavailable primal, dual, or basis
   * fields are represented by the native pretty writer rather than rejected.
   */
  exportSolution(pretty: true): string;

  /** Replaces current state with a copied LP/MIP/QP selected from optional fields. */
  passModel(model: ModelData): CallMetadata;
  /** Replaces the quadratic objective Hessian; dimension must match model columns. */
  passHessian(hessian: HessianInput): CallMetadata;
  /** Replaces all auxiliary linear objectives with copied entries. */
  passLinearObjectives(objectives: readonly LinearObjectiveInput[]): CallMetadata;
  /** Appends one linear objective, changing multi-objective solve behavior. */
  addLinearObjective(objective: LinearObjectiveInput): CallMetadata;
  /** Removes all auxiliary linear objectives and their solve priorities. */
  clearLinearObjectives(): CallMetadata;

  /** Presolves the current model synchronously and stores presolved state. */
  presolve(): CallMetadata;
  /**
   * Runs synchronously to termination or a configured limit. Supplied handlers
   * are registered only for this call and removed in `finally`. During a
   * handler, only callback controls are reentrant; other model/raw calls throw.
   */
  run(callbacks?: HighsCallbackMap): RunResult;
  /** Maps a presolved primal/optional dual solution back to original model space. */
  postsolve(input: PostsolveInput): CallMetadata;
  /** Returns cumulative native elapsed time since creation or `zeroAllClocks()`. */
  getRunTime(): number;
  /** Resets timing accumulators, restoring the full cumulative `time_limit` budget. */
  zeroAllClocks(): CallMetadata;

  /** Returns a detached dense solution; throws if the model has not been solved. */
  getSolution(): Solution;
  /** Returns a detached basis; throws if the model has not established basis state. */
  getBasis(): Basis;
  /** Returns current model status without running the solver. */
  getModelStatus(): ModelStatusCode;
  /** Returns current objective value; meaningful only when a primal solution exists. */
  getObjectiveValue(): number;
  /** Returns the current branded objective direction. */
  getObjectiveSense(): ObjectiveSense;
  /** Returns the constant objective offset. */
  getObjectiveOffset(): number;
  /** Supplies copied dense or sparse values as a solver start; it does not set a basis. */
  setSolution(solution: SolutionInput | SparseSolutionInput): CallMetadata;
  /** Installs a complete basis, or resets to HiGHS' default basis when omitted. */
  setBasis(basis?: BasisInput): CallMetadata;
  /** Constructs the logical basis with columns nonbasic and row slacks basic. */
  setLogicalBasis(): CallMetadata;

  /** Returns a primal-unboundedness certificate, possibly after an additional LP solve. */
  getPrimalRay(): NumericVector | undefined;
  /** Returns a primal-infeasibility dual ray, possibly after an additional LP solve. */
  getDualRay(): NumericVector | undefined;
  /** Returns a dual direction certifying primal infeasibility, possibly after an LP solve. */
  getDualUnboundednessDirection(): NumericVector | undefined;

  /**
   * Returns detached LP/MIP/QP coefficient data in the requested orientation.
   * Names and auxiliary multi-objective linear objectives are not included.
   */
  getModel(format?: MatrixFormat): DetachedModelData;
  /** Returns the current LP portion without names as a detached snapshot. */
  getLp(format?: MatrixFormat): DetachedModelData;
  /** Returns the last presolved LP; call `presolve()` first. */
  getPresolvedLp(format?: MatrixFormat): DetachedModelData;
  /** Returns the LP associated with the most recent IIS computation. */
  getIisLp(format?: MatrixFormat): DetachedModelData;
  /** Returns an LP with discrete variables fixed; requires a MIP and valid primal solution. */
  getFixedLp(format?: MatrixFormat): DetachedModelData;

  /** Returns current model row, column, matrix, and Hessian counts. */
  getDimensions(): ModelDimensions;
  /** Returns dimensions of the most recently generated presolved LP. */
  getPresolvedDimensions(): PresolvedDimensions;
  /** Copies selected columns and their coefficients; output order follows selection order. */
  getCols(selection: IndexSelection): ColumnData;
  /** Copies selected rows and their coefficients; output order follows selection order. */
  getRows(selection: IndexSelection): RowData;
  /** Returns the name of a zero-based column; throws for invalid index/status. */
  getColName(index: number): string;
  /** Returns the name of a zero-based row. */
  getRowName(index: number): string;
  /** Returns a presolved column name by zero-based presolved index. */
  getPresolvedColName(index: number): string;
  /** Returns a presolved row name by zero-based presolved index. */
  getPresolvedRowName(index: number): string;
  /** Resolves an exact column name to a zero-based index. */
  getColByName(name: string): number;
  /** Resolves an exact row name to a zero-based index. */
  getRowByName(name: string): number;
  /** Returns the variable type of a zero-based column. */
  getColIntegrality(index: number): VariableType;

  /** Appends one zero-cost column with no matrix entries. */
  addVar(lower: number, upper: number): CallMetadata;
  /** Appends zero-cost columns; lower/upper arrays must have equal length. */
  addVars(lower: NumberInput, upper: NumberInput): CallMetadata;
  /** Appends one column; entry indices are zero-based existing rows. */
  addCol(cost: number, lower: number, upper: number, entries: SparseEntriesInput): CallMetadata;
  /** Appends columns from CSC-oriented data; arrays and sparse matrix are copied. */
  addCols(data: Omit<ColumnData, "count">): CallMetadata;
  /** Appends one row; entry indices are zero-based existing columns. */
  addRow(lower: number, upper: number, entries: SparseEntriesInput): CallMetadata;
  /** Appends rows from CSR-oriented data; arrays and sparse matrix are copied. */
  addRows(data: Omit<RowData, "count">): CallMetadata;
  /** Converts internal matrix storage to column-wise form; coefficients are unchanged. */
  ensureColwise(): CallMetadata;
  /** Converts internal matrix storage to row-wise form; coefficients are unchanged. */
  ensureRowwise(): CallMetadata;

  /** Changes minimize/maximize direction and invalidates relevant solver state. */
  changeObjectiveSense(sense: ObjectiveSense): CallMetadata;
  /** Changes the constant objective term. */
  changeObjectiveOffset(offset: number): CallMetadata;
  /** Changes one zero-based column's variable domain. */
  changeColIntegrality(index: number, type: VariableType): CallMetadata;
  /** Values follow selected entries; mask values instead span every column. */
  changeColsIntegrality(selection: IndexSelection, types: readonly VariableType[] | Int32Array): CallMetadata;
  /** Makes every column continuous. */
  clearIntegrality(): CallMetadata;
  /** Changes one zero-based column's linear objective coefficient. */
  changeColCost(index: number, cost: number): CallMetadata;
  /** Values follow selected entries; mask values instead span every column. */
  changeColsCost(selection: IndexSelection, costs: NumberInput): CallMetadata;
  /** Changes lower and upper bounds of one zero-based column. */
  changeColBounds(index: number, lower: number, upper: number): CallMetadata;
  /** Arrays follow selected entries; mask arrays instead span every column. */
  changeColsBounds(selection: IndexSelection, lower: NumberInput, upper: NumberInput): CallMetadata;
  /** Changes lower and upper bounds of one zero-based row. */
  changeRowBounds(index: number, lower: number, upper: number): CallMetadata;
  /** Arrays follow selected entries; mask arrays instead span every row. */
  changeRowsBounds(selection: IndexSelection, lower: NumberInput, upper: NumberInput): CallMetadata;
  /** Inserts, changes, or removes (`value === 0`) one matrix coefficient. */
  changeCoefficient(row: number, col: number, value: number): CallMetadata;
  /** Deletes selected columns and renumbers all later columns. */
  deleteCols(selection: IndexSelection): CallMetadata;
  /** Deletes selected rows and renumbers all later rows. */
  deleteRows(selection: IndexSelection): CallMetadata;
  /** Multiplies one column's coefficients, cost, and bounds consistently by a nonzero factor. */
  scaleCol(index: number, factor: number): CallMetadata;
  /** Multiplies one row's coefficients and bounds consistently by a nonzero factor. */
  scaleRow(index: number, factor: number): CallMetadata;
  /** Assigns a copied name to one zero-based column. */
  passColName(index: number, name: string): CallMetadata;
  /** Assigns a copied name to one zero-based row. */
  passRowName(index: number, name: string): CallMetadata;
  /** Assigns a copied model name. */
  passModelName(name: string): CallMetadata;

  /**
   * Returns one identifier per basis row: columns use their zero-based index and
   * a row activity/slack uses exactly `-rowIndex - 1`.
   */
  getBasicVariables(): Int32Array;
  /** Returns row `row` of the basis inverse; requires a valid invertible basis. */
  getBasisInverseRow(row: number, sparse?: boolean): NumericVector;
  /** Returns column `col` of the basis inverse; requires a valid invertible basis. */
  getBasisInverseCol(col: number, sparse?: boolean): NumericVector;
  /** Solves `B x = rhs`; `rhs.length` must equal `numRows`. */
  getBasisSolve(rhs: NumberInput, sparse?: boolean): NumericVector;
  /** Solves `B' x = rhs`; `rhs.length` must equal `numRows`. */
  getBasisTransposeSolve(rhs: NumberInput, sparse?: boolean): NumericVector;
  /** Returns one row of `B^-1 A`; requires a valid basis. */
  getReducedRow(row: number, sparse?: boolean): NumericVector;
  /** Returns one column of `B^-1 A`; requires a valid basis. */
  getReducedColumn(col: number, sparse?: boolean): NumericVector;

  /**
   * Runs crossover for an LP. `colValue` is required; `colDual` and `rowDual`
   * must be supplied together or both omitted. `rowValue` is ignored.
   */
  crossover(input: SolutionInput): CallMetadata;
  /** Computes LP sensitivity ranging synchronously; requires an optimal basic solution. */
  getRanging(): RangingResult;
  /**
   * Solves a feasibility relaxation synchronously, then restores the original
   * model and prior model status. The relaxation solution and objective value
   * remain available; negative penalties prohibit their corresponding violation.
   */
  feasibilityRelaxation(input: FeasibilityRelaxationInput): CallMetadata;
  /** Computes and returns an IIS for an infeasible model; may run additional solves. */
  getIis(): IisResult;

  /** Destroys native ownership; idempotent, after which other methods throw. */
  dispose(): void;
}

/**
 * Raw runtime operations. Structured arguments replace C pointers, but status
 * codes are never converted to exceptions. JavaScript validation, disposal,
 * callback reentrancy, allocation, and callback-thrown errors can still throw.
 */
export interface RawRuntimeApi {
  /** Returns immutable metadata for the loaded native build. */
  version(): HighsVersion;
  /** Solves a copied LP; names, integrality, Hessian, and auxiliary objectives are ignored. */
  lpCall(model: ModelData): RawResult<SolveOutput>;
  /** Solves a copied MIP; integrality is required, while names and Hessian are ignored. */
  mipCall(model: ModelData): RawResult<MipSolveOutput>;
  /** Solves a copied QP; Hessian is required, while names and integrality are ignored. */
  qpCall(model: ModelData): RawResult<SolveOutput>;
  /** Allocates a persistent raw instance; the caller must eventually call `dispose()`. */
  createModel(): RawModelApi;
}

/**
 * Every method is backed by the like-named stable C function. File-oriented C
 * functions are intentionally represented as data operations. Pointer
 * arguments are validated, copied into packed temporary allocations, and freed
 * before return. Returned arrays are detached copies.
 */
export interface RawModelApi {
  /** Whether `dispose()` has destroyed this view's native instance. */
  readonly disposed: boolean;

  /** Resets model, solver state, and options to defaults. */
  clear(): RawStatus;
  /** Clears model and solver state while retaining options. */
  clearModel(): RawStatus;
  /** Clears solution/basis state while retaining model and options. */
  clearSolver(): RawStatus;
  /** Clears model/solver state and capacity; retains the reusable instance and options. */
  releaseMemory(): RawStatus;
  /** Presolves the current model synchronously. */
  presolve(): RawStatus;
  /** Solves the current model synchronously using configured callbacks/options. */
  run(): RawStatus;
  /** Maps supplied presolved-space values back to original space. */
  postsolve(input: PostsolveInput): RawStatus;
  /** Returns cumulative native elapsed time since creation or `zeroAllClocks()`. */
  getRunTime(): number;
  /** Resets timing accumulators, restoring the full cumulative `time_limit` budget. */
  zeroAllClocks(): RawStatus;

  /** Replaces the model by parsing copied LP/MPS content in private storage. */
  readModel(source: EncodedModel): RawStatus;
  /** Serializes the model to detached LP text or MPS bytes. */
  exportModel(format: "lp" | "mps"): RawResult<string | Uint8Array>;
  /** Serializes the last presolved model; presolve state is required. */
  exportPresolvedModel(format: "lp" | "mps"): RawResult<string | Uint8Array>;
  /** Serializes solution state; pretty output represents unavailable fields with placeholders. */
  exportSolution(pretty?: boolean): RawResult<string>;

  /** Replaces state with the LP fields of a copied model; ignores integrality/Hessian. */
  passLp(model: ModelData): RawStatus;
  /** Replaces state with a copied MIP; requires `integrality`. */
  passMip(model: ModelData): RawStatus;
  /** Replaces state with a copied LP, MIP, or QP selected from optional fields. */
  passModel(model: ModelData): RawStatus;
  /** Replaces the quadratic objective Hessian with copied sparse data. */
  passHessian(hessian: HessianInput): RawStatus;
  /** Replaces all linear objectives with copied entries. */
  passLinearObjectives(objectives: readonly LinearObjectiveInput[]): RawStatus;
  /** Appends one copied linear objective. */
  addLinearObjective(objective: LinearObjectiveInput): RawStatus;
  /** Removes all auxiliary linear objectives. */
  clearLinearObjectives(): RawStatus;

  /** Assigns a copied name to a zero-based row. */
  passRowName(row: number, name: string): RawStatus;
  /** Assigns a copied name to a zero-based column. */
  passColName(col: number, name: string): RawStatus;
  /** Assigns a copied model name. */
  passModelName(name: string): RawStatus;

  /** Parses option-file text from private storage; accepted earlier settings may persist on error. */
  readOptions(text: string): RawStatus;
  /** Sets an exact option name, validating its native type and wrapper support policy. */
  setOptionValue(name: string, value: OptionValue): RawStatus;
  /** Reads the current value of an exact option name. */
  getOptionValue(name: string): RawResult<OptionValue>;
  /** Reads an option's storage category. */
  getOptionType(name: string): RawResult<OptionType>;
  /** Restores all options to compiled defaults. */
  resetOptions(): RawStatus;
  /** Serializes all options or only deviations into detached text. */
  exportOptions(deviationsOnly?: boolean): RawResult<string>;
  /** Returns the number of enumerable native options. */
  getNumOptions(): number;
  /** Returns the option name at a zero-based enumeration index. */
  getOptionName(index: number): RawResult<string>;
  /** Returns current/default value and numeric limits for an option. */
  getOptionValues(name: string): RawResult<OptionDescriptor>;

  /** Reads one exact information item; int64 values preserve precision as `bigint`. */
  getInfoValue(name: string): RawResult<number | bigint>;
  /** Reads an information item's storage category. */
  getInfoType(name: string): RawResult<InfoType>;
  /** Copies the current dense solution; throws if the model is not yet solved. */
  getSolution(): RawResult<Solution>;
  /** Copies the current basis; throws if the model is not yet solved. */
  getBasis(): RawResult<Basis>;
  /** Returns current model status directly; this C getter has no call-status output. */
  getModelStatus(): ModelStatusCode;
  /** Copies a primal-infeasibility dual ray, possibly after an additional LP solve. */
  getDualRay(): RawResult<NumericVector | undefined>;
  /** Copies a dual direction certifying primal infeasibility, possibly after an LP solve. */
  getDualUnboundednessDirection(): RawResult<NumericVector | undefined>;
  /** Copies a primal-unboundedness certificate, possibly after an additional LP solve. */
  getPrimalRay(): RawResult<NumericVector | undefined>;
  /** Returns current objective value directly; check solution/model status before use. */
  getObjectiveValue(): number;
  /** Copies basis identifiers: columns are zero-based; row slacks are `-rowIndex - 1`. */
  getBasicVariables(): RawResult<Int32Array>;
  /** Copies a zero-based row of `B^-1`; requires a valid basis. */
  getBasisInverseRow(row: number, sparse?: boolean): RawResult<NumericVector>;
  /** Copies a zero-based column of `B^-1`; requires a valid basis. */
  getBasisInverseCol(col: number, sparse?: boolean): RawResult<NumericVector>;
  /** Solves `B x = rhs`; `rhs.length === numRows`. */
  getBasisSolve(rhs: NumberInput, sparse?: boolean): RawResult<NumericVector>;
  /** Solves `B' x = rhs`; `rhs.length === numRows`. */
  getBasisTransposeSolve(rhs: NumberInput, sparse?: boolean): RawResult<NumericVector>;
  /** Copies a row of `B^-1 A`; requires a valid basis. */
  getReducedRow(row: number, sparse?: boolean): RawResult<NumericVector>;
  /** Copies a column of `B^-1 A`; requires a valid basis. */
  getReducedColumn(col: number, sparse?: boolean): RawResult<NumericVector>;
  /** Installs a complete copied basis. */
  setBasis(basis: BasisInput): RawStatus;
  /** Constructs the logical basis. */
  setLogicalBasis(): RawStatus;
  /** Supplies copied dense components as a solver start; this does not set a basis. */
  setSolution(solution: SolutionInput): RawStatus;
  /** Supplies copied sparse primal column values. */
  setSparseSolution(solution: SparseSolutionInput): RawStatus;

  /**
   * Registers a synchronous callback until replaced, unset, or disposed.
   * Registration activates no channel. Payloads are detached, and only event
   * controls may call HiGHS while the callback is executing.
   */
  setCallback(callback: HighsCallback | undefined): RawStatus;
  /** Activates a channel until stopped or disposed; native type `8` is rejected. */
  startCallback(type: CallbackType): RawStatus;
  /** Deactivates a channel without unregistering the persistent callback function. */
  stopCallback(type: CallbackType): RawStatus;

  /** Appends one column using zero-based row entries. */
  addCol(cost: number, lower: number, upper: number, entries: SparseEntriesInput): RawStatus;
  /** Appends copied CSC column data; dimensions must match existing rows. */
  addCols(data: Omit<ColumnData, "count">): RawStatus;
  /** Appends one zero-cost column with no coefficients. */
  addVar(lower: number, upper: number): RawStatus;
  /** Appends zero-cost columns from equal-length copied bound arrays. */
  addVars(lower: NumberInput, upper: NumberInput): RawStatus;
  /** Appends one row using zero-based column entries. */
  addRow(lower: number, upper: number, entries: SparseEntriesInput): RawStatus;
  /** Appends copied CSR row data; dimensions must match existing columns. */
  addRows(data: Omit<RowData, "count">): RawStatus;
  /** Converts internal matrix storage to column-wise form. */
  ensureColwise(): RawStatus;
  /** Converts internal matrix storage to row-wise form. */
  ensureRowwise(): RawStatus;

  /** Changes objective direction and invalidates relevant solver state. */
  changeObjectiveSense(sense: ObjectiveSense): RawStatus;
  /** Changes the constant objective term. */
  changeObjectiveOffset(offset: number): RawStatus;
  /** Changes one zero-based column's variable domain. */
  changeColIntegrality(col: number, type: VariableType): RawStatus;
  /** Changes selected domains; mask input arrays span every column. */
  changeColsIntegrality(selection: IndexSelection, types: readonly VariableType[] | Int32Array): RawStatus;
  /** Makes all columns continuous. */
  clearIntegrality(): RawStatus;
  /** Changes one zero-based column cost. */
  changeColCost(col: number, cost: number): RawStatus;
  /** Changes selected costs; mask values span every column. */
  changeColsCost(selection: IndexSelection, costs: NumberInput): RawStatus;
  /** Changes one zero-based column's lower and upper bounds. */
  changeColBounds(col: number, lower: number, upper: number): RawStatus;
  /** Changes selected column bounds; mask arrays span every column. */
  changeColsBounds(selection: IndexSelection, lower: NumberInput, upper: NumberInput): RawStatus;
  /** Changes one zero-based row's lower and upper bounds. */
  changeRowBounds(row: number, lower: number, upper: number): RawStatus;
  /** Changes selected row bounds; mask arrays span every row. */
  changeRowsBounds(selection: IndexSelection, lower: NumberInput, upper: NumberInput): RawStatus;
  /** Inserts, changes, or removes (`value === 0`) one matrix coefficient. */
  changeCoeff(row: number, col: number, value: number): RawStatus;

  /** Reads the branded current objective direction. */
  getObjectiveSense(): RawResult<ObjectiveSense>;
  /** Reads the constant objective term. */
  getObjectiveOffset(): RawResult<number>;
  /** Copies selected columns in selection order. */
  getCols(selection: IndexSelection): RawResult<ColumnData>;
  /** Copies selected rows in selection order. */
  getRows(selection: IndexSelection): RawResult<RowData>;
  /** Reads a zero-based row's name. */
  getRowName(row: number): RawResult<string>;
  /** Resolves an exact row name to a zero-based index. */
  getRowByName(name: string): RawResult<number>;
  /** Reads a zero-based column's name. */
  getColName(col: number): RawResult<string>;
  /** Resolves an exact column name to a zero-based index. */
  getColByName(name: string): RawResult<number>;
  /** Reads a zero-based column's variable type. */
  getColIntegrality(col: number): RawResult<VariableType>;

  /** Deletes selected columns and renumbers later columns. */
  deleteCols(selection: IndexSelection): RawStatus;
  /** Deletes selected rows and renumbers later rows. */
  deleteRows(selection: IndexSelection): RawStatus;
  /** Scales one column and corresponding bounds/cost consistently. */
  scaleCol(col: number, factor: number): RawStatus;
  /** Scales one row and corresponding bounds consistently. */
  scaleRow(row: number, factor: number): RawStatus;

  /** Returns IEEE positive infinity. */
  getInfinity(): number;
  /** Returns native `HighsInt` width in bytes. */
  getSizeofHighsInt(): number;
  /** Returns current original-model dimensions directly. */
  getDimensions(): ModelDimensions;
  /** Returns current presolved-model dimensions directly. */
  getPresolvedDimensions(): PresolvedDimensions;
  /** Copies model coefficients; names and auxiliary linear objectives are excluded. */
  getModel(format?: MatrixFormat): RawResult<DetachedModelData>;
  /** Copies the current LP portion in the requested matrix orientation. */
  getLp(format?: MatrixFormat): RawResult<DetachedModelData>;
  /** Copies the last presolved LP; presolve state is required. */
  getPresolvedLp(format?: MatrixFormat): RawResult<DetachedModelData>;
  /** Reads a zero-based presolved column name. */
  getPresolvedColName(col: number): RawResult<string>;
  /** Reads a zero-based presolved row name. */
  getPresolvedRowName(row: number): RawResult<string>;
  /** Copies the LP associated with the most recent IIS computation. */
  getIisLp(format?: MatrixFormat): RawResult<DetachedModelData>;
  /** Copies an LP with discrete variables fixed; requires a MIP and valid primal solution. */
  getFixedLp(format?: MatrixFormat): RawResult<DetachedModelData>;

  /**
   * Runs LP crossover. `colValue` is required; `colDual` and `rowDual` must be
   * supplied together or omitted. `rowValue` is ignored.
   */
  crossover(input: SolutionInput): RawStatus;
  /** Computes LP sensitivity ranging; an optimal basic solution is required. */
  getRanging(): RawResult<RangingResult>;
  /**
   * Solves a relaxation, restores the original model/status, and retains its
   * solution/objective. Negative penalties prohibit corresponding violations.
   */
  feasibilityRelaxation(input: FeasibilityRelaxationInput): RawStatus;
  /** Computes and copies an IIS; may perform additional blocking solves. */
  getIis(): RawResult<IisResult>;

  /** Destroys native ownership. Idempotent; subsequent operations throw disposed errors. */
  dispose(): void;
}
