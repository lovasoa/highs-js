type Highs = {
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

enum HighsAnalysisLevel {
  kHighsAnalysisLevelNone = 0,
  kHighsAnalysisLevelModelData = 1,
  kHighsAnalysisLevelSolverSummaryData = 2,
  kHighsAnalysisLevelSolverRuntimeData = 4,
  kHighsAnalysisLevelSolverTime = 8,
  kHighsAnalysisLevelNlaData = 16,
  kHighsAnalysisLevelNlaTime = 32,
  kHighsAnalysisLevelMin = kHighsAnalysisLevelNone,
  kHighsAnalysisLevelMax = kHighsAnalysisLevelModelData +
    kHighsAnalysisLevelSolverSummaryData +
    kHighsAnalysisLevelSolverRuntimeData +
    kHighsAnalysisLevelSolverTime +
    kHighsAnalysisLevelNlaData +
    kHighsAnalysisLevelNlaTime
}

enum HighsDebugLevel {
  kHighsDebugLevelNone = 0,
  kHighsDebugLevelCheap,
  kHighsDebugLevelCostly,
  kHighsDebugLevelExpensive,
  kHighsDebugLevelMin = kHighsDebugLevelNone,
  kHighsDebugLevelMax = kHighsDebugLevelExpensive
}

enum SimplexScaleStrategy {
  kSimplexScaleStrategyMin = 0,
  kSimplexScaleStrategyOff = kSimplexScaleStrategyMin, // 0
  kSimplexScaleStrategyChoose, // 1
  kSimplexScaleStrategyEquilibration, // 2
  kSimplexScaleStrategyForcedEquilibration, // 3
  kSimplexScaleStrategyMaxValue015, // 4
  kSimplexScaleStrategyMaxValue0157, // 5
  kSimplexScaleStrategyMax = kSimplexScaleStrategyMaxValue0157
}

enum SimplexStrategy {
  kSimplexStrategyMin = 0,
  kSimplexStrategyChoose = kSimplexStrategyMin, // 0
  kSimplexStrategyDual, // 1
  kSimplexStrategyDualPlain = kSimplexStrategyDual, // 1
  kSimplexStrategyDualTasks, // 2
  kSimplexStrategyDualMulti, // 3
  kSimplexStrategyPrimal, // 4
  kSimplexStrategyMax = kSimplexStrategyPrimal,
  kSimplexStrategyNum
}

enum SimplexCrashStrategy {
  kSimplexCrashStrategyMin = 0,
  kSimplexCrashStrategyOff = kSimplexCrashStrategyMin,
  kSimplexCrashStrategyLtssfK,
  kSimplexCrashStrategyLtssf = kSimplexCrashStrategyLtssfK,
  kSimplexCrashStrategyBixby,
  kSimplexCrashStrategyLtssfPri,
  kSimplexCrashStrategyLtsfK,
  kSimplexCrashStrategyLtsfPri,
  kSimplexCrashStrategyLtsf,
  kSimplexCrashStrategyBixbyNoNonzeroColCosts,
  kSimplexCrashStrategyBasic,
  kSimplexCrashStrategyTestSing,
  kSimplexCrashStrategyMax = kSimplexCrashStrategyTestSing
}

enum SimplexEdgeWeightStrategy {
  kSimplexEdgeWeightStrategyMin = -1,
  kSimplexEdgeWeightStrategyChoose = kSimplexEdgeWeightStrategyMin,
  kSimplexEdgeWeightStrategyDantzig,
  kSimplexEdgeWeightStrategyDevex,
  kSimplexEdgeWeightStrategySteepestEdge,
  kSimplexEdgeWeightStrategyMax = kSimplexEdgeWeightStrategySteepestEdge
}

enum SolutionStyle {
  kSolutionStyleOldRaw = -1,
  kSolutionStyleRaw = 0,
  kSolutionStylePretty, // 1;
  kSolutionStyleGlpsolRaw, // 2;
  kSolutionStyleGlpsolPretty, // 3;
  kSolutionStyleSparse, // 4;
  kSolutionStyleMin = kSolutionStyleOldRaw,
  kSolutionStyleMax = kSolutionStyleSparse
}

enum GlpsolCostRowLocation {
  kGlpsolCostRowLocationLast = -2,
  kGlpsolCostRowLocationNone, // -1
  kGlpsolCostRowLocationNoneIfEmpty, // 0
  kGlpsolCostRowLocationMin = kGlpsolCostRowLocationLast
}

enum IisStrategy {
  kIisStrategyMin = 0,
  kIisStrategyFromLpRowPriority = kIisStrategyMin,  // 0
  kIisStrategyFromLpColPriority,                    // 1
  //  kIisStrategyFromRayRowPriority,                     // 2
  //  kIisStrategyFromRayColPriority,                     // 3
  kIisStrategyMax = kIisStrategyFromLpColPriority
};

/** Loads HiGHS */
export default function highsLoader(options?: HighsLoaderOptions): Promise<Highs>;

// export const Model: unknown
