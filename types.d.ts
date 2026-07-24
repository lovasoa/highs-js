/**
 * Compatibility API for solving one model at a time.
 *
 * The asynchronous loader creates this object, but `solve()` itself is
 * synchronous: JavaScript execution is blocked until HiGHS finishes or reaches
 * a configured limit. Each call creates a fresh native solver, so models,
 * options, solutions, clocks, and basis state are never shared between calls.
 */
export type LegacyHighs = {
  /**
   * Parses `problem` as a CPLEX LP-format model, solves it, and returns detached
   * JavaScript objects containing the available result.
   *
   * `problem` is model text, not a path. `options` are applied to a fresh native
   * instance before solving; omitted options use the defaults compiled into
   * HiGHS. The call blocks the current JavaScript thread. A native read,
   * option-setting, run, or solution-extraction error throws. Unknown options,
   * wrong value types, and integer option values that are non-integral or do
   * not fit a signed 32-bit integer also throw. In contrast, an optimization
   * outcome such as infeasible, unbounded, or time-limited is returned in
   * `HighsSolution.Status` and is not a JavaScript exception.
   *
   * All returned objects and arrays are copies. Mutating them cannot affect
   * HiGHS, and the native instance is destroyed before this method returns.
   */
  solve(problem: string, options?: HighsOptions): HighsSolution;
};

/**
 * Options accepted by the legacy one-shot solver.
 *
 * The `Readonly` modifier is a TypeScript constraint; the runtime does not
 * freeze the object, but it does not intentionally mutate it. Properties are
 * applied in JavaScript enumeration order to a fresh solver. Unknown names,
 * wrong value types, and values outside the native option's range fail the
 * solve. File names refer to Emscripten's private in-memory filesystem, not the
 * host filesystem, and generated files are not returned by this API.
 *
 * This compatibility type reflects the historically published option subset,
 * not every option in every upstream HiGHS release. The persistent API's
 * `model.options` facade accepts current native option names dynamically and
 * can inspect them with `describe()`.
 */
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
     * Enables, disables, or lets HiGHS choose parallel algorithms. This Wasm
     * package is built without native worker threads, so enabling the option
     * does not create host threads.
     * @default "choose"
     */
    parallel: 'off' | 'choose' | 'on';

    /**
     * Controls crossover after an interior-point solve. Crossover converts the
     * interior solution into a basic solution needed for basis queries and
     * simplex sensitivity analysis.
     * @default "on"
     */
    run_crossover: 'off' | 'choose' | 'on';

    /**
     * Maximum solver runtime in seconds. In this one-shot API the fresh native
     * instance performs one run, so no time is carried over from an earlier
     * `solve()` call.
     * @default Number.POSITIVE_INFINITY
     */
    time_limit: number;

    /**
     * Whether to compute LP cost, column-bound, row-bound, and basic-solution
     * sensitivity ranges after an eligible optimal simplex solve.
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
     * Absolute matrix-coefficient threshold at or below which entries are
     * treated as zero and may be removed.
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
     * Maximum accepted primal bound/row violation for LP feasibility tests.
     * @min 1e-10
     * @default 1e-07
     */
    primal_feasibility_tolerance: number;

    /**
     * Maximum accepted dual-feasibility violation, including reduced costs.
     * @min 1e-10
     * @default 1e-07
     */
    dual_feasibility_tolerance: number;

    /**
     * Optimality tolerance used by the interior-point solver.
     * @min 1e-12
     * @default 1e-08
     */
    ipm_optimality_tolerance: number;

    /**
     * Objective cutoff used to stop dual simplex. Reaching it is a stopping
     * condition, not by itself proof of optimality.
     * @default Number.POSITIVE_INFINITY
     */
    objective_bound: number;

    /**
     * Incumbent objective target used to stop a MIP solve early. Reaching the
     * target does not prove that no better feasible solution exists.
     * @default Number.NEGATIVE_INFINITY
     */
    objective_target: number;

    /**
     * Seed for randomized choices in HiGHS. Equal seeds improve reproducibility
     * but do not override differences in solver version or execution order.
     * @min 0
     * @default 0
     */
    random_seed: number;

    /**
     * Requested native thread count; `0` means automatic. This package's Wasm
     * build is single-threaded, so this legacy option cannot add worker threads.
     * @min 0
     * @default 0
     */
    threads: number;

    /**
     * Exponent `k` for user bound scaling by the exact factor `2^k`.
     * @default 0
     */
    user_bound_scale: number;

    /**
     * Historical name for the exponent of power-of-two objective scaling.
     * Current HiGHS versions call this option `user_objective_scale`; this
     * compatibility property may be rejected by a build that no longer exposes
     * the old native name.
     * @default 0
     */
    user_cost_scale: number;

    /**
     * Internal consistency-check level. Higher values add expensive diagnostic
     * checks and are not normal solve-verbosity levels.
     * @default 0
     */
    highs_debug_level: HighsDebugLevel;

    /**
     * Bit mask selecting internal analysis data; combine `HighsAnalysisLevel`
     * flags with bitwise OR.
     * @default 0
     */
    highs_analysis_level: HighsAnalysisLevel;

    /**
     * Simplex algorithm strategy. Prefer the named `SimplexStrategy` members;
     * `0` lets HiGHS choose, `1` is serial dual simplex, `2` and `3` are the
     * parallel dual variants, and `4` is primal simplex.
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
     * Initial-basis crash strategy. `0` disables crashing; values `1..9` select
     * the LTSSF/LTSF, Bixby, basic, or diagnostic variants named by
     * `SimplexCrashStrategy`.
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
     * Maximum simplex basis-update operations before refactorization. `0`
     * requests refactorization without retaining updates.
     * @min 0
     * @default 5000
     */
    simplex_update_limit: number;

    /**
     * Minimum concurrency requested from a parallel simplex variant.
     * @min 1
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
     * Master switch for HiGHS output. When false, logging destinations such as
     * the console and log file receive no solver output.
     * @default true
     */
    output_flag: boolean;

    /**
     * Routes enabled solver output to the console sink. `output_flag` remains
     * the master switch and must also be enabled.
     * @default true
     */
    log_to_console: boolean;

    /**
     * Path in Emscripten's private in-memory filesystem used by native solution
     * writing. It is not a host path and this one-shot API does not return it.
     * @default ""
     */
    solution_file: string;

    /**
     * Path in Emscripten's private in-memory filesystem for solver logs. It is
     * not written directly to the host filesystem.
     * @default ""
     */
    log_file: string;

    /**
     * Whether to write available primal/dual solution data to `solution_file`.
     * The file remains private to the one-shot Wasm filesystem.
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
     * Whether to run iCrash, an interior-point crash procedure that seeks a
     * useful starting basis before simplex.
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
     * Whether iCrash solves its minimization subproblems exactly.
     * @default false
     */
    icrash_exact: boolean;

    /**
     * Whether iCrash uses breakpoint minimization when exact subproblem solving
     * is disabled. The native implementation may not support this mode.
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
     * Whether to detect variable/constraint symmetries that can reduce MIP
     * branch-and-bound search.
     * @default true
     */
    mip_detect_symmetry: boolean;

    /**
     * Whether the MIP solver may restart its search using information learned
     * from the current branch-and-bound tree.
     * @default true
     */
    mip_allow_restart: boolean;

    /**
     * Maximum number of processed MIP branch-and-bound nodes.
     * @min 0
     * @default 2147483647
     */
    mip_max_nodes: number;

    /**
     * Maximum consecutive/stalled branch-and-bound nodes whose estimate does
     * not improve on the incumbent cutoff before stopping.
     * @min 0
     * @default 2147483647
     */
    mip_max_stall_nodes: number;

    /**
     * Node budget used while completing a partial MIP start into a feasible
     * assignment.
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
     * Whether every new MIP incumbent is written to
     * `mip_improving_solution_file`.
     * @default false
     */
    mip_improving_solution_save: boolean;

    /**
     * Whether saved improving MIP incumbents omit zero-valued variables.
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
     * Maximum number of MIP leaf nodes processed.
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
     * Integrality tolerance used to decide whether a MIP variable is close
     * enough to an allowed integer value.
     * @min 1e-10
     * @default 1e-06
     */
    mip_feasibility_tolerance: number;

    /**
     * Fractional effort assigned to MIP primal heuristics. `0` disables this
     * effort and `1` requests the maximum configured effort.
     * @min 0
     * @default 0.05
     * @max 1
     */
    mip_heuristic_effort: number;

    /**
     * Relative difference between the incumbent (primal bound) and best bound
     * at which a MIP may terminate as optimal. Use `0` to require no relative
     * gap beyond numerical tolerances.
     * @min 0
     * @default 1e-04
     */
    mip_rel_gap: number;

    /**
     * Absolute difference between the MIP incumbent and best bound at which the
     * solver may terminate as optimal.
     * @min 0
     * @default 1e-06
     */
    mip_abs_gap: number;

    /**
     * Minimum wall-clock interval in seconds between routine MIP progress logs.
     * @min 0
     * @default 5
     */
    mip_min_logging_interval: number;

    /**
     * Maximum iterations for the interior-point solver.
     * @min 0
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
     * PDLP scaling bit mask: combine `1` (Ruiz), `2` (L2), and `4`
     * (Pock-Chambolle). For example, the default `5` enables Ruiz and
     * Pock-Chambolle scaling.
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
     * Iteration limit for the active-set QP solver.
     * @min 0
     * @default 2147483647
     */
    qp_iteration_limit: number;

    /**
     * Maximum nullspace dimension handled by the active-set QP solver.
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
 * keyed by column name. Always inspect `Status` before reading numerical data.
 * The union fully models only `Infeasible`: at runtime
 * `Not Set`, load/model/presolve/solve/postsolve errors, `Empty`, and `Unknown`
 * also omit primal, dual, and basis fields. Limit and unbounded statuses can
 * carry the best solution available, but do not imply one exists.
 */
type HighsSolution =
  | GenericHighsSolution<true, HighsLinearSolutionColumn, HighsLinearSolutionRow>
  | GenericHighsSolution<false, HighsMixedIntegerLinearSolutionColumn, HighsMixedIntegerLinearSolutionRow>
  | GenericHighsSolution<boolean, HighsInfeasibleSolutionColumn, HighsInfeasibleSolutionRow, 'Infeasible'>;

/**
 * Common detached legacy result shape. `IsLinear` selects continuous-model
 * fields (including a continuous QP) versus MIP fields; it is a type parameter
 * only and is not present in the runtime object.
 */
type GenericHighsSolution<IsLinear extends boolean, ColType, RowType, Status extends HighsModelStatus = HighsModelStatus> = {
  /** Human-readable HiGHS model status. */
  Status: Status;
  /** Objective including the constant offset; do not use it unless `Status` establishes a solution. */
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
  /**
   * Lossy legacy classification: only native type code `1` is reported as
   * `Integer`; semi-continuous, semi-integer, and implicit-integer codes are not
   * distinguished by this compatibility result.
   */
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
  /** Lossy compatibility classification; see `HighsInfeasibleSolutionColumn.Type`. */
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

/**
 * Compact one-shot basis labels: fixed (`FX`), at lower bound (`LB`), basic
 * (`BS`), at upper bound (`UB`), free (`FR`), or generic nonbasic (`NB`).
 */
type HighsBasisStatus =
  /** Fixed variable/row whose lower and upper bounds coincide. */
  | 'FX'
  /** Nonbasic at the lower bound. */
  | 'LB'
  /** Basic variable or row slack. */
  | 'BS'
  /** Nonbasic at the upper bound. */
  | 'UB'
  /** Free item with no finite active bound. */
  | 'FR'
  /** Generic nonbasic item not represented by a bound-specific label. */
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
 * WebAssembly, and return detached JavaScript-owned snapshots. No returned
 * typed array aliases WebAssembly memory.
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
  /** Receives normal native output synchronously; output is suppressed when omitted. */
  print?: (message: string) => void;
  /** Receives native diagnostics synchronously; diagnostics are suppressed when omitted. */
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

  /**
   * Creates a persistent native instance and optionally loads copied structured
   * data or parses in-memory LP/MPS content. The caller must eventually call
   * `dispose()`; garbage collection does not release the native instance.
   */
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

/**
 * Status-only raw result. Native status errors are returned as `status: -1`
 * rather than converted to exceptions. JavaScript validation, disposed use,
 * callback reentrancy, allocation failure, and callback-thrown errors can still
 * throw before or around the native call.
 */
export interface RawStatus {
  /** Native status code. */
  readonly status: HighsStatus;
}

/**
 * Raw value result. A value exists only for native success or warning. As with
 * `RawStatus`, wrapper-level validation/lifecycle errors can still throw.
 */
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
    /** Real-valued variable subject to its configured lower and upper bounds. */
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
  /** Native numeric matrix codes; high-level matrix inputs instead use `"csc"`/`"csr"`. */
  readonly matrixFormat: Readonly<{
    /** Compressed columns. */
    columnWise: 1;
    /** Compressed rows. */
    rowWise: 2;
  }>;
  /** Native numeric Hessian codes; high-level inputs use `"triangular"`/`"square"`. */
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
    /** Observe native log records through `event.message` and `data.log_type`; no solver controls are available. */
    logging: 0;
    /** Inspect simplex iteration progress and optionally call `event.interrupt()`. */
    simplexInterrupt: 1;
    /** Inspect interior-point iteration progress and optionally call `event.interrupt()`. */
    ipmInterrupt: 2;
    /** Observe a feasible MIP solution and its detached full column vector. */
    mipSolution: 3;
    /** Observe each new best feasible MIP solution and its detached full column vector. */
    mipImprovingSolution: 4;
    /** Observe MIP runtime, incumbent, bound, gap, node count, and LP iterations without a solution vector. */
    mipLogging: 5;
    /** Inspect MIP progress and optionally call `event.interrupt()` from a synchronous stopping policy. */
    mipInterrupt: 6;
    /** Inspect a detached CSR snapshot of cuts currently offered by the MIP cut pool. */
    mipCutPool: 7;
    /** Submit or repair a heuristic MIP candidate with `event.setSolution()` / `event.repairSolution()`. */
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

/**
 * Numeric vector copied synchronously into temporary Wasm memory.
 *
 * The input never aliases native storage and may be reused or mutated as soon
 * as the call returns. `NaN` is rejected. Infinity is meaningful only for
 * properties that explicitly permit an unbounded value; matrix, objective, and
 * Hessian coefficients should be finite.
 */
export type NumberInput = readonly number[] | Float64Array;
/**
 * Non-negative integer vector copied into 32-bit native `HighsInt` storage.
 * Values used as model indices are zero-based; values used in sparse `starts`
 * arrays are offsets. Every value must be a safe integer in signed 32-bit range.
 */
export type IndexInput = readonly number[] | Int32Array;
/**
 * Full-axis selection mask. It contains exactly one entry per current row or
 * column, and every entry must be exactly `true`, `false`, `1`, or `0`.
 */
export type MaskInput = readonly boolean[] | Uint8Array | Int32Array;
/**
 * Variable domain: `0` continuous, `1` integer, `2` semi-continuous, `3`
 * semi-integer, or `4` implicit integer. Prefer the named values in
 * `highs.constants.variableType` to unexplained numeric literals.
 */
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
/**
 * Sparse orientation: `"csc"` is compressed sparse column and `"csr"` is
 * compressed sparse row. The wrapper translates these strings to native matrix
 * format codes; do not pass the numeric native codes here.
 */
export type MatrixFormat = "csc" | "csr";
/**
 * Hessian storage: lower-triangular compressed columns, or a complete symmetric
 * square matrix in compressed-column form.
 */
export type HessianFormat = "triangular" | "square";
/**
 * Native basis status: `0` lower, `1` basic, `2` upper, `3` nonbasic at zero,
 * or `4` generically nonbasic. Prefer `highs.constants.basisStatus`.
 */
export type BasisStatus = 0 | 1 | 2 | 3 | 4;
/**
 * Stable C API model-state code. This describes the optimization outcome, not
 * whether the JavaScript/native call itself succeeded. Compare it with
 * `highs.constants.modelStatus`; it is distinct from the legacy string-valued
 * `HighsSolution.Status`.
 */
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

/**
 * Constraint matrix in compressed sparse column (CSC) or compressed sparse row
 * (CSR) form.
 *
 * `format` chooses the major axis. With `"csc"`, each packed segment is one
 * column and `indices` contains row indices. With `"csr"`, each segment is one
 * row and `indices` contains column indices. Define
 * `majorDimension = format === "csc" ? numCols : numRows`. The arrays must obey:
 *
 * - `starts.length === majorDimension + 1`
 * - `starts[0] === 0`
 * - `starts` is nondecreasing
 * - `starts[majorDimension] === indices.length === values.length`
 * - every minor index is in the opposite matrix dimension
 * - a packed row or column contains no duplicate minor index
 *
 * For example, the matrix `[[1, 0], [2, 3]]` is CSC-encoded as
 * `starts: [0, 2, 3]`, `indices: [0, 1, 1]`, `values: [1, 2, 3]`.
 * Explicit zeros and coefficients at or below HiGHS' small-matrix threshold may
 * be removed. All arrays are copied before the call returns.
 */
export interface SparseMatrixInput {
  /**
   * Chooses how the one-dimensional arrays encode the two-dimensional matrix.
   *
   * - `"csc"` (compressed sparse column): coefficients are grouped by column.
   *   `starts[j]..starts[j + 1]` locates column `j`, and each corresponding
   *   `indices[k]` is a row index.
   * - `"csr"` (compressed sparse row): coefficients are grouped by row.
   *   `starts[i]..starts[i + 1]` locates row `i`, and each corresponding
   *   `indices[k]` is a column index.
   *
   * This changes the meanings and required length of both `starts` and
   * `indices`; it does not transpose the mathematical matrix. Use `"csc"` when
   * constructing columns naturally and `"csr"` when constructing rows
   * naturally.
   */
  readonly format: MatrixFormat;
  /**
   * Number of rows in the mathematical matrix. It must be a non-negative
   * signed 32-bit integer.
   *
   * In CSC format, every entry of `indices` is a row index and must satisfy
   * `0 <= indices[k] < numRows`. In CSR format, this is the number of packed
   * row segments, so `starts.length` must equal `numRows + 1`.
   */
  readonly numRows: number;
  /**
   * Number of columns in the mathematical matrix. It must be a non-negative
   * signed 32-bit integer.
   *
   * In CSR format, every entry of `indices` is a column index and must satisfy
   * `0 <= indices[k] < numCols`. In CSC format, this is the number of packed
   * column segments, so `starts.length` must equal `numCols + 1`.
   */
  readonly numCols: number;
  /**
   * Boundaries of the packed rows or columns inside `indices` and `values`.
   * These are offsets, not model row/column indices.
   *
   * In CSC, column `j` occupies positions `k` from `starts[j]` inclusive to
   * `starts[j + 1]` exclusive. In CSR, the same formula describes row `j`.
   * Therefore an empty row/column has equal adjacent offsets.
   *
   * The array must have `numCols + 1` entries for CSC or `numRows + 1` entries
   * for CSR. It must start with `0`, be nondecreasing, and end with the exact
   * number of stored entries:
   * `starts[starts.length - 1] === indices.length === values.length`.
   *
   * Example: `starts: [0, 2, 2, 3]` describes three major-axis items. The first
   * has two entries at packed positions 0 and 1, the second is empty, and the
   * third has one entry at position 2.
   */
  readonly starts: IndexInput;
  /**
   * Minor-axis coordinate for every packed coefficient in `values`.
   * `indices[k]` and `values[k]` always describe the same matrix entry.
   *
   * In CSC, packed position `k` belongs to the column determined by `starts`,
   * and `indices[k]` is its zero-based row. In CSR, position `k` belongs to the
   * row determined by `starts`, and `indices[k]` is its zero-based column.
   * Consequently CSC indices must be below `numRows`, while CSR indices must be
   * below `numCols`.
   *
   * `indices.length` must equal `values.length` and the final `starts` entry.
   * A single packed row/column must not repeat a minor index, because that would
   * specify the same matrix coordinate twice. Indices in different packed
   * rows/columns may naturally repeat.
   *
   * For CSC `starts: [0, 2, 3]`, `indices: [0, 1, 1]` means column 0 has entries
   * in rows 0 and 1, while column 1 has one entry in row 1.
   */
  readonly indices: IndexInput;
  /**
   * Numerical matrix coefficient at every packed position. `values[k]` is at
   * the minor coordinate `indices[k]` within the row/column selected by
   * `starts`; all three arrays must therefore be interpreted together.
   *
   * `values.length` must equal `indices.length` and the final `starts` entry.
   * Values must be numbers other than `NaN`; matrix coefficients should be
   * finite rather than using infinity to represent a bound. Explicit zero and
   * coefficients whose magnitude is at or below `small_matrix_value` may be
   * removed by HiGHS, so the later extracted matrix can contain fewer entries.
   *
   * For the CSC encoding `starts: [0, 2, 3]`, `indices: [0, 1, 1]`, and
   * `values: [1, 2, 3]`, the stored coordinates are `(row 0, col 0) = 1`,
   * `(row 1, col 0) = 2`, and `(row 1, col 1) = 3`.
   */
  readonly values: NumberInput;
}

/**
 * Detached compressed-sparse snapshot owned by JavaScript. Its arrays obey the
 * `SparseMatrixInput` layout, and the last `starts` value is the stored nonzero
 * count. The properties are readonly references, but typed-array elements are
 * mutable; changing them never changes the native model.
 */
export interface SparseMatrix {
  /**
   * Orientation of this snapshot. In `"csc"`, `starts` groups coefficients by
   * column and `indices` contains row indices. In `"csr"`, `starts` groups by
   * row and `indices` contains column indices.
   */
  readonly format: MatrixFormat;
  /**
   * Number of matrix rows. It bounds CSC `indices` values and determines the
   * number of packed segments (`numRows`) when `format === "csr"`.
   */
  readonly numRows: number;
  /**
   * Number of matrix columns. It bounds CSR `indices` values and determines the
   * number of packed segments (`numCols`) when `format === "csc"`.
   */
  readonly numCols: number;
  /**
   * Packed-segment boundaries. Segment `j` occupies positions from `starts[j]`
   * inclusive to `starts[j + 1]` exclusive in both `indices` and `values`.
   * Segments are columns for CSC and rows for CSR. The array begins with zero,
   * is nondecreasing, and its final entry equals the two data-array lengths.
   */
  readonly starts: Int32Array;
  /**
   * Zero-based minor coordinate at each packed position: a row number for CSC
   * or a column number for CSR. `indices[k]` identifies the coordinate of
   * `values[k]`; the enclosing row/column is determined from `starts`.
   */
  readonly indices: Int32Array;
  /**
   * Stored coefficients parallel to `indices`. `values[k]` and `indices[k]`
   * describe one coordinate in the packed segment containing position `k`.
   * This typed array is detached from Wasm; mutating it changes only the
   * snapshot and never the native model.
   */
  readonly values: Float64Array;
}

/**
 * Sparse symmetric Hessian `Q` for the quadratic objective
 * `sense * (offset + c'x + 0.5 * x'Qx)`.
 *
 * Storage is compressed by column. `starts` follows the same offset invariants
 * as a CSC matrix and must have `dimension + 1` entries; `indices` contains
 * zero-based row indices, and `starts[dimension] === indices.length ===
 * values.length`. Duplicate row indices within a column are invalid.
 *
 * For `"triangular"`, provide the lower triangle only: an entry in column `j`
 * has row `i >= j`. For `"square"`, provide the complete symmetric matrix,
 * including both off-diagonal `(i, j)` and `(j, i)` entries. Values are entries
 * of `Q`; do not pre-multiply them by `0.5`.
 *
 * Example: `Q = [[2, 1], [1, 4]]` is triangularly encoded by
 * `starts: [0, 2, 3]`, `indices: [0, 1, 1]`, `values: [2, 1, 4]`. It contributes
 * `x0^2 + x0*x1 + 2*x1^2` to the objective. Inputs are copied synchronously.
 */
export interface HessianInput {
  /**
   * Selects which entries of symmetric matrix `Q` are supplied.
   *
   * `"triangular"` stores only the lower triangle in compressed-column form, so
   * every entry in column `j` must have row index `i >= j`. HiGHS infers the
   * mirrored upper triangle. `"square"` stores every matrix entry, so each
   * off-diagonal value must be supplied in both symmetric coordinates and the
   * resulting matrix must be symmetric.
   */
  readonly format: HessianFormat;
  /**
   * Number of rows and columns in square matrix `Q`. When the Hessian is passed
   * to a model, this must equal that model's `numCols`, because there is one
   * Hessian coordinate per decision variable. It must be a non-negative signed
   * 32-bit integer.
   */
  readonly dimension: number;
  /**
   * Compressed-column boundaries into `indices` and `values`. Hessian column `j`
   * occupies positions from `starts[j]` inclusive to `starts[j + 1]` exclusive.
   * Equal adjacent values represent an empty column.
   *
   * The array must have exactly `dimension + 1` entries, begin with `0`, be
   * nondecreasing, and end with
   * `indices.length === values.length === starts[dimension]`.
   * For example, `[0, 2, 3]` means column 0 has two stored entries and column 1
   * has one.
   */
  readonly starts: IndexInput;
  /**
   * Zero-based row coordinate of each packed Hessian value. Position `k`
   * represents matrix coordinate `(indices[k], j)`, where column `j` is the
   * unique column whose interval `starts[j] <= k < starts[j + 1]` contains it.
   *
   * Every index must satisfy `0 <= indices[k] < dimension`. In triangular mode
   * it must additionally satisfy `indices[k] >= j`. A column must not contain a
   * duplicate row index. The array length must equal `values.length` and the
   * final `starts` entry.
   */
  readonly indices: IndexInput;
  /**
   * Entries of symmetric matrix `Q`, parallel to `indices`. `values[k]` is the
   * value at the row given by `indices[k]` and the column determined by
   * `starts`. These are entries of `Q` itself in objective
   * `0.5 * x'Qx`; do not halve diagonal values or double off-diagonal values.
   *
   * Values must be finite numbers and the length must equal `indices.length`
   * and the final `starts` entry. For triangular encoding of
   * `Q = [[2, 1], [1, 4]]`, use `starts: [0, 2, 3]`,
   * `indices: [0, 1, 1]`, and `values: [2, 1, 4]`.
   */
  readonly values: NumberInput;
}

/**
 * Detached Hessian snapshot owned by JavaScript. Returned model snapshots are
 * normalized to lower-triangular compressed-column storage. Mutating these
 * typed arrays does not affect the native model.
 */
export interface Hessian {
  /**
   * Storage convention for this snapshot. Model extraction currently
   * normalizes `Q` to `"triangular"`: lower-triangle compressed columns with
   * the symmetric upper triangle implied.
   */
  readonly format: HessianFormat;
  /** Number of rows and columns in `Q`, normally equal to model `numCols`. */
  readonly dimension: number;
  /**
   * Compressed-column boundaries. Column `j` uses packed positions
   * `[starts[j], starts[j + 1])`. The array starts at zero, is nondecreasing,
   * has `dimension + 1` entries, and ends at the stored-entry count.
   */
  readonly starts: Int32Array;
  /**
   * Zero-based row for each packed value. The corresponding column is found
   * from `starts`; in a triangular snapshot each row is at least its column.
   */
  readonly indices: Int32Array;
  /**
   * Entries of `Q` parallel to `indices`, not pre-scaled by the objective's
   * `0.5` factor. This detached array may be mutated without changing HiGHS.
   */
  readonly values: Float64Array;
}

/**
 * Complete linear, mixed-integer, quadratic, or mixed-integer quadratic model.
 *
 * Columns are decision variables `x[j]`. The bounds mean
 * `colLower[j] <= x[j] <= colUpper[j]`; rows mean
 * `rowLower[i] <= A[i]x <= rowUpper[i]`. Use `-highs.infinity` for a missing
 * lower bound and `highs.infinity` for a missing upper bound. All axis vectors
 * must have exactly the documented length, dimensions must be non-negative
 * signed 32-bit integers, and matrix dimensions must equal `numRows` by
 * `numCols`.
 *
 * Omitting `integrality` makes every column continuous. Supplying it selects
 * variable domains independently of whether `hessian` supplies a quadratic
 * objective. Every supplied array and string is validated and copied; caller
 * mutation after the call cannot change the native model.
 */
export interface ModelData {
  /**
   * Number of decision variables, also called columns. It must be a
   * non-negative signed 32-bit integer. `colCost`, `colLower`, `colUpper`, and
   * supplied `integrality`/`colNames` vectors must have exactly this length;
   * `matrix.numCols` and a supplied `hessian.dimension` must equal it.
   */
  readonly numCols: number;
  /**
   * Number of linear constraints, also called rows. It must be a non-negative
   * signed 32-bit integer. `rowLower`, `rowUpper`, and supplied `rowNames`
   * vectors must have exactly this length, and `matrix.numRows` must equal it.
   */
  readonly numRows: number;
  /**
   * Whether HiGHS minimizes or maximizes the complete objective. Omission means
   * minimize. Use `highs.constants.objectiveSense.minimize` or `.maximize`;
   * plain numeric `1`/`-1` literals are deliberately not accepted by the type.
   * The sense applies to the offset, linear term, and quadratic term together.
   */
  readonly sense?: ObjectiveSense;
  /**
   * Constant added to the objective independently of all variable values. It
   * changes the reported objective and objective-based stopping criteria but
   * not which `x` is feasible. Omission means `0`.
   */
  readonly offset?: number;
  /**
   * Linear objective coefficient for each variable, in column order. The
   * linear term is `sum(colCost[j] * x[j])`, or `c'x`. The array must contain
   * exactly `numCols` finite numbers. Use `0` when a variable has no linear
   * objective contribution; infinity is not a substitute for a bound.
   */
  readonly colCost: NumberInput;
  /**
   * Lower bound for each variable: `colLower[j] <= x[j]`. The array must have
   * exactly `numCols` entries. Use `-highs.infinity` for no lower bound. A
   * finite lower bound equal to `colUpper[j]` fixes the variable; normally each
   * lower bound must not exceed its corresponding upper bound.
   */
  readonly colLower: NumberInput;
  /**
   * Upper bound for each variable: `x[j] <= colUpper[j]`. The array must have
   * exactly `numCols` entries. Use `highs.infinity` for no upper bound. A finite
   * upper bound equal to `colLower[j]` fixes the variable; normally each upper
   * bound must not be below its corresponding lower bound.
   */
  readonly colUpper: NumberInput;
  /**
   * Lower bound for each row activity: `rowLower[i] <= sum(A[i,j] * x[j])`.
   * This is a bound on the computed left-hand side `Ax`, not a variable value
   * or slack. The array must have exactly `numRows` entries. Use
   * `-highs.infinity` when a row has no lower bound.
   */
  readonly rowLower: NumberInput;
  /**
   * Upper bound for each row activity: `sum(A[i,j] * x[j]) <= rowUpper[i]`.
   * The array must have exactly `numRows` entries. Use `highs.infinity` when a
   * row has no upper bound. Equal finite lower/upper values represent an
   * equality constraint.
   */
  readonly rowUpper: NumberInput;
  /**
   * Sparse coefficient matrix `A` used by every row activity `Ax`. Its
   * `numRows` and `numCols` must exactly match this model. See
   * `SparseMatrixInput` for the complete CSC/CSR encoding, offset, index,
   * duplicate, and coefficient rules.
   */
  readonly matrix: SparseMatrixInput;
  /**
   * Domain code for each variable in column order. It must have exactly
   * `numCols` entries, each one of `0` continuous, `1` integer, `2`
   * semi-continuous, `3` semi-integer, or `4` implicit integer. Prefer named
   * `highs.constants.variableType` values. Omission makes every variable
   * continuous; it does not remove a supplied quadratic Hessian.
   */
  readonly integrality?: readonly VariableType[] | Int32Array;
  /**
   * Optional symmetric matrix `Q` adding `0.5 * x'Qx` to the objective. Its
   * `dimension` must equal `numCols`. Omission makes the objective linear;
   * supplying it is independent of `integrality`, so both may be present.
   * See `HessianInput` for triangular and square storage rules.
   */
  readonly hessian?: HessianInput;
  /**
   * Optional variable names in exact column order, with exactly `numCols`
   * strings. Names are copied and later used by name lookup and serialization.
   * Empty, duplicate, or format-invalid names may be rejected by HiGHS.
   */
  readonly colNames?: readonly string[];
  /**
   * Optional constraint names in exact row order, with exactly `numRows`
   * strings. Names are copied and later used by name lookup and serialization;
   * empty, duplicate, or format-invalid names may be rejected.
   */
  readonly rowNames?: readonly string[];
  /**
   * Optional name for the model as a whole. It is metadata used by supported
   * serializers and does not affect optimization. The string is copied.
   */
  readonly modelName?: string;
}

/**
 * Detached numerical model snapshot. It includes bounds, objective, matrix,
 * integrality, and an optional Hessian, but not model/row/column names or
 * auxiliary multi-objective definitions. Typed-array elements remain mutable;
 * changing them never changes the native model.
 */
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
  /** Lower-triangular Hessian when the model has a stored quadratic objective. */
  readonly hessian?: Hessian;
}

/**
 * In-memory LP or MPS file. `format`, not a filename extension, selects the
 * parser. A string is encoded as file text; a `Uint8Array` supplies raw file
 * bytes. Data is copied through a private temporary Emscripten file that is
 * removed before return, so no caller-controlled filesystem path is exposed.
 */
export interface EncodedModel {
  /** Parser format, independent of a filename extension. */
  readonly format: "lp" | "mps";
  /** LP/MPS text or raw encoded file bytes copied into private temporary storage. */
  readonly data: string | Uint8Array;
}

/**
 * Selection of current zero-based rows or columns.
 *
 * A range is inclusive and requires `0 <= from <= to < axisLength`. A set must
 * contain valid indices in strictly increasing order. A mask has exactly
 * `axisLength` entries and selects true/`1` positions. Results are ordered by
 * ascending current model index for every selection kind.
 *
 * For bulk changes, range/set value arrays are packed with one value per
 * selected item. Mask value arrays instead span the complete axis; only values
 * at selected positions are consumed. For example, selecting columns 1 and 2
 * with mask `[0, 1, 1, 0]` requires a four-element value array such as
 * `[0, 20, 30, 0]`, not `[20, 30]`.
 */
export type IndexSelection =
  | {
      /**
       * Selects every current axis position from `from` through `to`, including
       * both endpoints. Use this when the desired rows/columns are contiguous.
       */
      readonly kind: "range";
      /**
       * First selected current row/column index. It is zero-based and must
       * satisfy `0 <= from <= to`; deletion or insertion can change which model
       * item occupies this index in a later call.
       */
      readonly from: number;
      /**
       * Last selected current row/column index, included in the selection. It
       * must satisfy `from <= to < currentAxisLength`. Empty ranges are not
       * represented; use an empty set if the operation supports one.
       */
      readonly to: number;
    }
  /** Indices must increase strictly, matching the stable C set operations. */
  | {
      /**
       * Selects explicitly listed current rows/columns. Use this for a sparse,
       * non-contiguous selection where a full-axis mask would be inconvenient.
       */
      readonly kind: "set";
      /**
       * Zero-based current model indices in strictly increasing order, with no
       * duplicates. Every value must be below the current axis length. This
       * order is also the packed order expected by parallel values in bulk
       * range/set mutation methods.
       */
      readonly indices: IndexInput;
    }
  /** Masks contain one boolean/0/1 entry per model row or column. */
  | {
      /**
       * Selects current axis positions whose corresponding mask entry is
       * `true`/`1`; `false`/`0` entries are not selected.
       */
      readonly kind: "mask";
      /**
       * Full-axis bitmap with exactly one entry per current model row or column.
       * Each entry must be exactly boolean or 0/1. Unlike range/set mutations,
       * parallel mutation vectors also span the full axis rather than containing
       * only selected values. For mask `[0, 1, 1, 0]`, costs might therefore be
       * `[0, 20, 30, 0]`; only positions 1 and 2 are consumed.
       */
      readonly mask: MaskInput;
    };

/**
 * Detached selected-column data in ascending model-index order. The matrix is
 * CSC with `numCols === count` and one row per current model row.
 */
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

/**
 * Detached selected-row data in ascending model-index order. The matrix is CSR
 * with `numRows === count` and one column per current model column.
 */
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

/**
 * Dense solver-start components. `colValue` and `rowValue` are primal variable
 * values and row activities `Ax`; `colDual` and `rowDual` are reduced costs and
 * row duals. Each supplied vector is complete for its axis and is copied.
 * Supplying a start does not assert feasibility or optimality and does not set
 * a basis. For entry-wise partial primal column values, use
 * `SparseSolutionInput` instead.
 *
 * Native dense-start acceptance requires at least a full `colValue` or a full
 * `rowDual`; row activities and reduced costs are supplementary components and
 * may be recomputed by HiGHS.
 */
export interface SolutionInput {
  /**
   * Candidate primal value `x[j]` for every model column. If supplied, this
   * must be a complete `numCols`-entry vector; omitted entries cannot be
   * represented inside this dense field. HiGHS derives row activities from
   * these values and checks rather than assumes feasibility.
   */
  readonly colValue?: NumberInput;
  /**
   * Candidate activity `sum(A[i,j] * x[j])` for every row, not the row slack.
   * It must have `numRows` entries. It supplements a dense start and is not
   * independently sufficient for native `setSolution`; HiGHS may recompute it
   * from `colValue`.
   */
  readonly rowValue?: NumberInput;
  /**
   * Candidate reduced cost for every column, with exactly `numCols` entries.
   * It is an LP/QP dual component, not a primal objective coefficient, and has
   * no useful MIP-incumbent meaning. It supplements dual row values and may be
   * recomputed by HiGHS.
   */
  readonly colDual?: NumberInput;
  /**
   * Candidate dual multiplier for every row, with exactly `numRows` entries.
   * Supplying a complete `rowDual` can establish a dense dual start; HiGHS may
   * derive reduced costs from it. Sign interpretation follows objective sense
   * and row-bound activity.
   */
  readonly rowDual?: NumberInput;
}

/**
 * Detached dense solution buffers. Their presence does not prove that they are
 * valid: primal and dual availability are independent and depend on model and
 * solve status. Inspect `primal_solution_status` and `dual_solution_status`
 * through `model.info`, as well as `model.getModelStatus()`, before using them.
 * MIP dual vectors are not meaningful. The arrays are JavaScript-owned copies.
 */
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

/**
 * Sparse zero-based index/value pairs. The arrays have equal length and are
 * copied. For row/column addition, indices address the existing opposite axis;
 * duplicate indices for one new row/column are invalid.
 */
export interface SparseEntriesInput {
  /**
   * Existing opposite-axis coordinate for each sparse value. When adding a
   * column, these are current row indices; when adding a row, these are current
   * column indices. For `SparseSolutionInput`, they are current column indices.
   * Every index must be in range and `indices.length` must equal
   * `values.length`. A new row/column must not list the same coordinate twice.
   */
  readonly indices: IndexInput;
  /**
   * Value paired position-for-position with `indices`. For a newly added row or
   * column, `values[k]` is its matrix coefficient at `indices[k]`. For a sparse
   * solution start, it is the proposed primal value of column `indices[k]`.
   * The array is copied and must have exactly `indices.length` entries.
   */
  readonly values: NumberInput;
}

/**
 * Partial primal assignment, typically a MIP start. Each index addresses a
 * current model column and its parallel value supplies that column's candidate
 * value; unspecified columns remain unspecified rather than being set to zero.
 */
export interface SparseSolutionInput extends SparseEntriesInput {}

/**
 * Complete simplex-basis status assignment. Arrays must exactly match model
 * dimensions and every entry must be a `BasisStatus`. Valid codes and lengths
 * do not guarantee a mathematically valid basis; HiGHS may reject an
 * inconsistent or singular assignment. Both arrays are copied.
 */
export interface BasisInput {
  /**
   * Basis status for every model column, in current column order. The array must
   * have exactly `numCols` entries and each must be one of `0` lower, `1` basic,
   * `2` upper, `3` zero, or `4` nonbasic. Use
   * `highs.constants.basisStatus` for named values.
   */
  readonly colStatus: readonly BasisStatus[] | Int32Array;
  /**
   * Basis status for every row slack/activity, in current row order. The array
   * must have exactly `numRows` entries and uses the same status codes as
   * `colStatus`. Across both arrays, a valid LP basis normally has exactly
   * `numRows` basic entries; HiGHS performs the final consistency check.
   */
  readonly rowStatus: readonly BasisStatus[] | Int32Array;
}

/**
 * Detached basis-status snapshot. Array presence does not establish validity;
 * inspect the `basis_validity` info item. A usable basis normally comes from a
 * simplex solve, crossover, or explicit basis installation.
 */
export interface Basis {
  /** Column basis statuses, length `numCols`. */
  readonly colStatus: Int32Array;
  /** Row basis statuses, length `numRows`. */
  readonly rowStatus: Int32Array;
}

/**
 * Output of a successful-status stateless LP/QP call. Always inspect
 * `modelStatus`: array presence alone does not guarantee a feasible primal,
 * valid dual, or valid basis. All arrays are JavaScript-owned copies.
 */
export interface SolveOutput {
  /** Final model status, independent of the enclosing call status. */
  readonly modelStatus: ModelStatusCode;
  /** Dense primal/dual solution buffers. */
  readonly solution: Solution;
  /** Final simplex basis where available. */
  readonly basis: Basis;
}

/**
 * Output of a successful-status stateless MIP call. Inspect `modelStatus`
 * before using the primal arrays; a limit or infeasible result may have no
 * incumbent. MIP duals and bases are intentionally absent.
 */
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

/**
 * One auxiliary linear objective used in multi-objective optimization.
 *
 * With the default lexicographic mode, larger `priority` values are optimized
 * first and priorities must be distinct. The sign of `weight` chooses direction
 * (positive minimizes, negative maximizes); its magnitude scales the objective.
 * After optimizing this objective, its absolute/relative tolerances limit how
 * much it may degrade while lower-priority objectives are optimized.
 *
 * If native option `blend_multi_objectives` is enabled, priorities are ignored
 * and all objectives are combined into one minimization objective using their
 * weights. Coefficients are copied and must have one entry per model column.
 */
export interface LinearObjectiveInput {
  /** Signed scale; positive minimizes and negative maximizes this objective. */
  readonly weight: number;
  /** Constant term for this objective. */
  readonly offset: number;
  /** Coefficients in column order, length `numCols`. */
  readonly coefficients: NumberInput;
  /** Absolute degradation tolerance used for lower-priority objectives. */
  readonly absoluteTolerance: number;
  /** Relative degradation tolerance used for lower-priority objectives. */
  readonly relativeTolerance: number;
  /** Lexicographic priority; larger values run first and equal priorities are invalid. */
  readonly priority: number;
}

/**
 * JavaScript representation accepted for a HiGHS option. The named option's
 * native type determines which member is valid; integer options require signed
 * 32-bit integral numbers and numeric option values must not be `NaN`.
 */
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

/**
 * Option facade bound to one persistent native instance. Exact snake_case names
 * are discoverable with `names()` and `describe()`. Changes affect subsequent
 * operations on this model only; bulk and text-based changes are not
 * transactional, so earlier accepted settings remain if a later one fails.
 */
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
  /** Parses option-file text privately; settings processed before an error may remain applied. */
  read(text: string): CallMetadata;
  /** Serializes all options, or only deviations, to detached text without exposing a path. */
  export(deviationsOnly?: boolean): string;
}

/**
 * Read-only solve-information facade. Values describe current or most recent
 * solver state; some names are unavailable before a solve or for a particular
 * algorithm/model. Native int64 counters are always returned as `bigint`.
 */
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

/**
 * Sensitivity endpoint data for one perturbation direction. `value` contains
 * the limiting coefficient/bound itself, not a delta. For example, `5` means
 * the item may move to `5`, not increase by `5`. `objective` gives the objective
 * at that endpoint; infinities are legitimate. All four arrays have one entry
 * per ranged row or column and are detached copies.
 */
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
  /** Upper endpoint for each column's objective coefficient. */
  readonly colCostUp: RangingRecord;
  /** Lower endpoint for each column's objective coefficient. */
  readonly colCostDown: RangingRecord;
  /** Upper endpoint for each column's active/relevant bound. */
  readonly colBoundUp: RangingRecord;
  /** Lower endpoint for each column's active/relevant bound. */
  readonly colBoundDown: RangingRecord;
  /** Upper endpoint for each row's active/relevant bound. */
  readonly rowBoundUp: RangingRecord;
  /** Lower endpoint for each row's active/relevant bound. */
  readonly rowBoundDown: RangingRecord;
}

/**
 * Infeasible-subsystem candidate and conflict classifications. Compact index
 * arrays identify retained rows/columns and have matching parallel bound-code
 * arrays. Full status arrays have `numCols`/`numRows` entries. Empty compact
 * arrays mean no subsystem was found, not necessarily that feasibility was
 * proved. A limited computation can mark entries `maybeInConflict` and need not
 * have proved irreducibility; compare codes with `highs.constants.iis`.
 */
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
 * Feasibility-relaxation penalties, used as objective costs for bound/row
 * violations. A positive value charges per unit of violation, zero allows a
 * free violation, and a negative value prohibits that violation. Each supplied
 * local vector spans its complete axis and replaces, rather than adds to, the
 * corresponding global penalty entry by entry.
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

/**
 * Detached full-length dense vector. When sparse output is requested, `values`
 * is still dense and model-ordered; `nonzeroIndices` merely lists positions that
 * HiGHS reports as nonzero.
 */
export interface NumericVector {
  /** Full dense vector in model order. */
  readonly values: Float64Array;
  /** Zero-based nonzero indices when sparse output was requested. */
  readonly nonzeroIndices?: Int32Array;
}

/**
 * Callback channel accepted by `Model.run()` and the raw callback methods.
 * Prefer `highs.constants.callbackType.<name>` to numeric literals:
 *
 * - `logging` (`0`): native log messages
 * - `simplexInterrupt` (`1`), `ipmInterrupt` (`2`), `mipInterrupt` (`6`):
 *   periodic solver checkpoints that expose `event.interrupt()`
 * - `mipSolution` (`3`): feasible MIP solutions
 * - `mipImprovingSolution` (`4`): new MIP incumbents, including a detached
 *   `mip_solution` vector suitable for live visualization or persistence
 * - `mipLogging` (`5`): MIP bounds, gap, nodes, iterations, and runtime
 * - `mipCutPool` (`7`): the current detached MIP cut pool
 * - `mipUserSolution` (`9`): a checkpoint that accepts `setSolution()` and
 *   `repairSolution()`
 *
 * A channel is not guaranteed to fire for every model or solver run. For
 * example, a small MIP may solve before progress or improving-solution events
 * are needed. Native callback type `8` (lazy constraints) is not exposed.
 */
export type CallbackType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 9;

/**
 * Values common to every synchronous callback event.
 *
 * `message`, `data`, and nested typed arrays are JavaScript-owned snapshots:
 * they remain valid after the handler returns and may be posted from a Web
 * Worker. In contrast, control methods such as `interrupt()` and
 * `setSolution()` modify the active native callback and expire immediately when
 * the handler returns.
 */
export interface CallbackEventBase<T extends CallbackType = CallbackType> {
  /** Callback channel that triggered the event. */
  readonly type: T;
  /** Native log/progress text. Do not assume it is non-empty or machine-parseable. */
  readonly message: string;
  /** Detached snapshot of fields available for this callback channel. */
  readonly data: CallbackData;
}

/**
 * Solver checkpoint at which JavaScript may request early termination.
 *
 * Calling `interrupt()` asks HiGHS to stop and normally produces model status
 * `highs.constants.modelStatus.interrupted`. Decide from data already available
 * in the handler, such as elapsed time or MIP gap. A separate `postMessage()`
 * cannot update the decision while synchronous `run()` is blocking that Worker.
 */
export interface InterruptCallbackEvent
  extends CallbackEventBase<1 | 2 | 6> {
  /** Requests interruption of the currently executing native solve. Valid only before the handler returns. */
  interrupt(): void;
}

/**
 * MIP checkpoint at which an application may submit a heuristic candidate.
 * Dense candidates contain one value per current column; sparse candidates may
 * specify only selected columns. HiGHS validates feasibility and may reject the
 * candidate. This channel may not fire during every MIP solve.
 */
export interface UserSolutionCallbackEvent extends CallbackEventBase<9> {
  /** Copies a dense or sparse candidate into the active callback and returns its native acceptance status. */
  setSolution(solution: NumberInput | SparseSolutionInput): RawStatus;
  /**
   * Asks HiGHS to repair the current type-9 candidate, normally after
   * `setSolution()`. The repaired vector is retained natively, not returned.
   */
  repairSolution(): RawStatus;
}

/**
 * Observation-only event. It intentionally has no solver control methods; copy,
 * retain, visualize, or post its detached data without reentering the model.
 */
export interface PassiveCallbackEvent
  extends CallbackEventBase<0 | 3 | 4 | 5 | 7> {}

/**
 * Discriminated union received by a handler that is not tied to one channel.
 * Narrow on `event.type` before using channel-specific controls. A callback in
 * `HighsCallbackMap` is usually preferable because its numeric key selects the
 * narrower `CallbackEventFor<T>` automatically.
 */
export type CallbackEvent =
  | InterruptCallbackEvent
  | UserSolutionCallbackEvent
  | PassiveCallbackEvent;

/**
 * Event capabilities for one `CallbackType`. Interrupt channels expose only
 * `interrupt()`, type `9` exposes solution submission, and passive channels
 * expose no controls. This conditional type is what makes handlers in
 * `HighsCallbackMap` channel-safe.
 */
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
 * Detached callback payload. Fields are optional because one interface serves
 * all channels; read only the fields documented for the active `event.type`.
 *
 * Channel field guide:
 *
 * - `logging`: `log_type`; use `event.message` for the text
 * - simplex/IPM interrupt: the corresponding iteration count
 * - MIP channels `3`-`7` and `9`: runtime and available objective/bound metrics
 * - `mipSolution` and `mipImprovingSolution`: `mip_solution`
 * - `mipCutPool`: `cut_pool`
 *
 * MIP node and LP-iteration counts are native int64 values represented as
 * `bigint`. Convert them before `JSON.stringify`; structured cloning and
 * `postMessage()` support them directly in modern runtimes.
 */
export interface CallbackData
  extends Readonly<Record<string, unknown>> {
  /** Present only for callback type 0. */
  readonly log_type?: number;
  /** Solver runtime in seconds, available on MIP callback channels. */
  readonly running_time?: number;
  /** Present only for callback type 1. */
  readonly simplex_iteration_count?: number;
  /** Present only for callback type 2. */
  readonly ipm_iteration_count?: number;
  /** Objective of the solution associated with this event when the channel supplies one. */
  readonly objective_function_value?: number;
  /** Explored MIP node count; represented as `bigint` to preserve `HighsInt`. */
  readonly mip_node_count?: bigint;
  /** Total MIP LP iterations, preserving native integer precision. */
  readonly mip_total_lp_iterations?: bigint;
  /** Best feasible incumbent objective. It is an upper bound for minimization and lower bound for maximization. */
  readonly mip_primal_bound?: number;
  /** Best proven objective bound. It is a lower bound for minimization and upper bound for maximization. */
  readonly mip_dual_bound?: number;
  /** Relative distance between incumbent and proven bound; use it for progress displays or stopping policies. */
  readonly mip_gap?: number;
  /** Complete detached column vector, present only for MIP solution channels `3` and `4`. */
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
 * General callback function for raw registration. Prefer `HighsCallbackMap`
 * with `Model.run()` when possible because map handlers receive channel-specific
 * event types.
 *
 * Execution is synchronous. Promises and thenables are rejected, and no model
 * or raw API may be called reentrantly from the handler. Use only controls on
 * the current event. For browser applications, run HiGHS in a Worker and post
 * detached snapshots to the UI thread.
 */
export type HighsCallback = (event: CallbackEvent) => undefined;

/**
 * Per-channel hooks installed for one `Model.run()` call.
 *
 * Use computed keys from `highs.constants.callbackType`; each key narrows its
 * handler to the correct event capabilities. Omitted channels remain inactive.
 * Registration is temporary: `run()` starts the selected channels, executes
 * synchronously, then stops and unregisters them even if solving or a handler
 * throws.
 *
 * Handlers must be synchronous and must not call model or raw methods. They may
 * retain typed-array snapshots, update closure state, or call `postMessage()`.
 * Only event controls are reentrant, and they expire when the handler returns.
 *
 * @example Stream MIP progress and stop when the gap is good enough
 * ```ts
 * const callbacks: HighsCallbackMap = {
 *   [highs.constants.callbackType.mipImprovingSolution](event) {
 *     worker.postMessage({ solution: event.data.mip_solution });
 *   },
 *   [highs.constants.callbackType.mipLogging](event) {
 *     worker.postMessage({ gap: event.data.mip_gap });
 *   },
 *   [highs.constants.callbackType.mipInterrupt](event) {
 *     if ((event.data.mip_gap ?? Infinity) <= 0.01) event.interrupt();
 *   },
 * };
 * model.run(callbacks);
 * ```
 */
export type HighsCallbackMap = {
  /** Synchronous handler for channel `T`; Promise-returning handlers are rejected. */
  readonly [T in CallbackType]?: (
    event: CallbackEventFor<T>,
  ) => undefined;
};

/**
 * Persistent model owning one native HiGHS instance. Methods are synchronous,
 * copy inputs, and throw on validation/native errors unless explicitly noted.
 * The caller must eventually call `dispose()`; garbage collection does not free
 * the native instance. Returned strings and typed arrays are detached and remain
 * usable after disposal. Value-returning methods record a native warning in
 * `lastCall` when they do not return metadata directly.
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
   * Clears model and solver state, releases retained vector capacity, and resets
   * native clocks. The native instance and its options remain reusable.
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

  /** Replaces current numerical state; integrality and Hessian independently select MIP/QP features. */
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
   * Runs synchronously to termination, callback interruption, or a configured
   * limit. Put long browser solves in a Web Worker so this blocking call does
   * not freeze the UI. Supplied handlers are active only for this call and are
   * removed in `finally`.
   *
   * During a handler, only controls on that event are reentrant. Every model/raw
   * method, including queries and callback registration, throws. Event data is
   * detached and can be retained or posted to another thread after the handler.
   */
  run(callbacks?: HighsCallbackMap): RunResult;
  /**
   * Maps values in the current presolved model's ordering back to original model
   * space. Vector lengths must match `getPresolvedDimensions()` and model
   * mutation may invalidate presolve state. Read the recovered values with
   * `getSolution()`.
   */
  postsolve(input: PostsolveInput): CallMetadata;
  /** Returns cumulative wall-clock seconds spent in solver runs since the last clock reset. */
  getRunTime(): number;
  /** Resets timing accumulators, restoring the full cumulative `time_limit` budget. */
  zeroAllClocks(): CallMetadata;

  /**
   * Copies current solution buffers when model state permits the native query.
   * This is not an availability guarantee: inspect model status plus the
   * `primal_solution_status` and `dual_solution_status` info values.
   */
  getSolution(): Solution;
  /**
   * Copies current basis-status buffers. Inspect `basis_validity`; a solved MIP
   * or an interior-point solve without crossover need not have a valid basis.
   */
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
  /** Installs a complete basis; omission is exactly equivalent to `setLogicalBasis()`. */
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
  /** Returns current linear-model data without Hessian, names, or auxiliary objectives. */
  getLp(format?: MatrixFormat): DetachedModelData;
  /** Returns the last presolved LP; call `presolve()` first. */
  getPresolvedLp(format?: MatrixFormat): DetachedModelData;
  /** Returns IIS working-model data; meaningful after a non-error `getIis()` found a subsystem. */
  getIisLp(format?: MatrixFormat): DetachedModelData;
  /** Returns an LP with discrete variables fixed; requires a MIP and valid primal solution. */
  getFixedLp(format?: MatrixFormat): DetachedModelData;

  /** Returns current model row, column, matrix, and Hessian counts. */
  getDimensions(): ModelDimensions;
  /** Returns dimensions of the most recently generated presolved LP. */
  getPresolvedDimensions(): PresolvedDimensions;
  /** Copies selected columns in ascending current index order with a CSC matrix. */
  getCols(selection: IndexSelection): ColumnData;
  /** Copies selected rows in ascending current index order with a CSR matrix. */
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
  /**
   * Appends copied CSC columns. Cost/lower/upper lengths are equal, matrix
   * `numCols` equals that length, and matrix `numRows` equals current model rows.
   */
  addCols(data: Omit<ColumnData, "count">): CallMetadata;
  /** Appends one row; entry indices are zero-based existing columns. */
  addRow(lower: number, upper: number, entries: SparseEntriesInput): CallMetadata;
  /**
   * Appends copied CSR rows. Lower/upper lengths are equal, matrix `numRows`
   * equals that length, and matrix `numCols` equals current model columns.
   */
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
  /**
   * Applies variable substitution `x[index] = factor * xNew[index]`: matrix
   * coefficients and cost are multiplied by `factor`, while variable bounds are
   * divided by it and reordered when it is negative. `factor` must be nonzero.
   */
  scaleCol(index: number, factor: number): CallMetadata;
  /** Multiplies one row's coefficients and bounds by a nonzero factor, reordering bounds if negative. */
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
  /** Returns one of `numRows` rows of square `B^-1`; output length is `numRows`. */
  getBasisInverseRow(row: number, sparse?: boolean): NumericVector;
  /** Returns one of `numRows` columns of square `B^-1`; `col` is a basis-matrix index. */
  getBasisInverseCol(col: number, sparse?: boolean): NumericVector;
  /** Solves `B x = rhs`; `rhs.length` must equal `numRows`. */
  getBasisSolve(rhs: NumberInput, sparse?: boolean): NumericVector;
  /** Solves `B^-T x = rhs`; input and output lengths equal `numRows`. */
  getBasisTransposeSolve(rhs: NumberInput, sparse?: boolean): NumericVector;
  /** Returns one row of `B^-1 A`; output length is `numCols`. */
  getReducedRow(row: number, sparse?: boolean): NumericVector;
  /** Returns one original model column of `B^-1 A`; output length is `numRows`. */
  getReducedColumn(col: number, sparse?: boolean): NumericVector;

  /**
   * Runs crossover for an LP. `colValue` is required; `colDual` and `rowDual`
   * must be supplied together or both omitted. `rowValue` is ignored.
   */
  crossover(input: SolutionInput): CallMetadata;
  /** Requires an optimal LP simplex solution with initialized valid basis state; IPM alone is insufficient. */
  getRanging(): RangingResult;
  /**
   * Solves a feasibility relaxation synchronously, then restores the original
   * model and prior model status. The relaxation solution and objective value
   * remain available; negative penalties prohibit their corresponding violation,
   * local vectors override globals, and the retained basis is invalidated.
   */
  feasibilityRelaxation(input: FeasibilityRelaxationInput): CallMetadata;
  /**
   * Attempts to compute an infeasible subsystem for an LP/QP or MIP relaxation.
   * It may run multiple blocking solves. Empty indices mean none was found;
   * limited/warning results may be candidates rather than proved irreducible IISs.
   */
  getIis(): IisResult;

  /** Destroys shared native ownership; idempotent and invalidates `raw`, `options`, and `info`. */
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
 * Methods correspond closely to stable C operations; some combine several C
 * calls or use a small safety bridge. File-oriented C functions are represented
 * as data operations. Pointer
 * arguments are validated, copied into packed temporary allocations, and freed
 * before return. Returned arrays are detached copies.
 */
export interface RawModelApi {
  /** Whether `dispose()` on either model view destroyed the shared native instance. */
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
  /**
   * Solves synchronously with configured callbacks/options. `status` reports
   * whether the native call completed, not the optimization outcome; call
   * `getModelStatus()` for optimal, infeasible, limited, or interrupted state.
   * A limit can therefore accompany `status: 0` or `1`.
   */
  run(): RawStatus;
  /**
   * Maps current-presolve-order values back to original space; dimensions must
   * match `getPresolvedDimensions()` and mutation may invalidate presolve state.
   */
  postsolve(input: PostsolveInput): RawStatus;
  /** Returns cumulative wall-clock seconds spent in solver runs since the last clock reset. */
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
  /** Replaces state; optional integrality and Hessian independently select MIP/QP features. */
  passModel(model: ModelData): RawStatus;
  /** Replaces the quadratic objective Hessian with copied sparse data. */
  passHessian(hessian: HessianInput): RawStatus;
  /** Replaces all auxiliary linear objectives; the primary `colCost` objective remains. */
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
  /** Copies current buffers; inspect solution-status info because presence does not imply validity. */
  getSolution(): RawResult<Solution>;
  /** Copies current basis statuses; inspect `basis_validity` before using basis operations. */
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
  /** Solves `B^-T x = rhs`; input and output lengths equal `numRows`. */
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
   * controls may call HiGHS while the callback is executing. Callback/channel
   * registration persists across runs until explicitly changed.
   */
  setCallback(callback: HighsCallback | undefined): RawStatus;
  /**
   * Activates a channel until stopped or disposed. Register a callback first;
   * otherwise native status is an error. Native callback type `8` is rejected
   * by JavaScript validation and is not a `CallbackType`.
   */
  startCallback(type: CallbackType): RawStatus;
  /** Deactivates a channel without unregistering the persistent callback function. */
  stopCallback(type: CallbackType): RawStatus;

  /** Appends one column using zero-based row entries. */
  addCol(cost: number, lower: number, upper: number, entries: SparseEntriesInput): RawStatus;
  /**
   * Appends copied CSC columns. `cost`, `lower`, and `upper` have equal length;
   * the matrix has that many columns and one row per existing model row.
   */
  addCols(data: Omit<ColumnData, "count">): RawStatus;
  /** Appends one zero-cost column with no coefficients. */
  addVar(lower: number, upper: number): RawStatus;
  /** Appends zero-cost columns from equal-length copied bound arrays. */
  addVars(lower: NumberInput, upper: NumberInput): RawStatus;
  /** Appends one row using zero-based column entries. */
  addRow(lower: number, upper: number, entries: SparseEntriesInput): RawStatus;
  /**
   * Appends copied CSR rows. `lower` and `upper` have equal length; the matrix
   * has that many rows and one column per existing model column.
   */
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
  /** Copies selected columns in ascending current index order with a CSC matrix. */
  getCols(selection: IndexSelection): RawResult<ColumnData>;
  /** Copies selected rows in ascending current index order with a CSR matrix. */
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
  /** Multiplies column coefficients/cost by a nonzero factor and divides/reorders its bounds. */
  scaleCol(col: number, factor: number): RawStatus;
  /** Multiplies row coefficients/bounds by a nonzero factor and reorders bounds if negative. */
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
  /** Requires an optimal LP simplex solution with initialized valid basis state. */
  getRanging(): RawResult<RangingResult>;
  /**
   * Solves a relaxation, restores the original model/status, and retains its
   * solution/objective. Negative penalties prohibit corresponding violations;
   * local vectors override global penalties. The retained basis is invalidated.
   */
  feasibilityRelaxation(input: FeasibilityRelaxationInput): RawStatus;
  /** Attempts an IIS computation; empty or `maybeInConflict` output may not prove irreducibility. */
  getIis(): RawResult<IisResult>;

  /** Destroys native ownership. Idempotent; subsequent operations throw disposed errors. */
  dispose(): void;
}
