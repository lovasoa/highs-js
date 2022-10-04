type Highs = {
  solve(problem: string, options?: HighsOptions): HighsSolution;
};

type HighsOptions = Readonly<
  Partial<{
    /**
     * default: "choose"
     */
    presolve: "off" | "choose" | "on";

    /**
     * default: "choose"
     */
    solver: "simplex" | "choose" | "ipm";

    /**
     * default: "choose"
     */
    parallel: "off" | "choose" | "on";

    /**
     * Time limit
     * default: inf
     */
    time_limit: number;

    /**
     * Compute cost, bound, RHS and basic solution ranging.
     * default: "off"
     */
    ranging: "off" | "on";

    /**
     * Limit on cost coefficient: values larger than this will be treated as infinite
     * default: 1e+20
     */
    infinite_cost: number;

    /**
     * Limit on |constraint bound|: values larger than this will be treated as infinite
     * default: 1e+20
     */
    infinite_bound: number;

    /**
     * Lower limit on |matrix entries|: values smaller than this will be treated as zero
     * default: 1e-09
     */
    small_matrix_value: number;

    /**
     * Upper limit on |matrix entries|: values larger than this will be treated as infinite
     * default: 1e+15
     */
    large_matrix_value: number;

    /**
     * Primal feasibility tolerance
     * default: 1e-07
     */
    primal_feasibility_tolerance: number;

    /**
     * Dual feasibility tolerance
     * default: 1e-07
     */
    dual_feasibility_tolerance: number;

    /**
     * IPM optimality tolerance
     * default: 1e-08
     */
    ipm_optimality_tolerance: number;

    /**
     * Objective bound for termination
     * default: inf
     */
    objective_bound: number;

    /**
     * Objective target for termination
     * default: -inf
     */
    objective_target: number;

    /**
     * random seed used in HiGHS
     * default: 0
     */
    random_seed: number;

    /**
     * number of threads used by HiGHS (0: automatic)
     * default: 0
     */
    threads: number;

    /**
     * Debugging level in HiGHS
     * default: 0
     */
    highs_debug_level: number;

    /**
     * Analysis level in HiGHS
     * default: 0
     */
    highs_analysis_level: number;

    /**
     * Strategy for simplex solver
     * default: 1
     */
    simplex_strategy: number;

    /**
     * Simplex scaling strategy: off / choose / equilibration / forced equilibration / max value 0 / max value 1 (0/1/2/3/4/5)
     * default: 1
     */
    simplex_scale_strategy: number;

    /**
     * Strategy for simplex crash: off / LTSSF / Bixby (0/1/2)
     * default: 0
     */
    simplex_crash_strategy: number;

    /**
     * Strategy for simplex dual edge weights: Choose / Dantzig / Devex / Steepest Edge (-1/0/1/2)
     * default: -1
     */
    simplex_dual_edge_weight_strategy: number;

    /**
     * Strategy for simplex primal edge weights: Choose / Dantzig / Devex (-1/0/1)
     * default: -1
     */
    simplex_primal_edge_weight_strategy: number;

    /**
     * Iteration limit for simplex solver
     * default: 2147483647
     */
    simplex_iteration_limit: number;

    /**
     * Limit on the number of simplex UPDATE operations
     * default: 5000
     */
    simplex_update_limit: number;

    /**
     * Iteration limit for IPM solver
     * default: 2147483647
     */
    ipm_iteration_limit: number;

    /**
     * Minimum level of concurrency in parallel simplex
     * default: 1
     */
    simplex_min_concurrency: number;

    /**
     * Maximum level of concurrency in parallel simplex
     * default: 8
     */
    simplex_max_concurrency: number;

    /**
     * Enables or disables solver output
     * default: true
     */
    output_flag: boolean;

    /**
     * Enables or disables console logging
     * default: true
     */
    log_to_console: boolean;

    /**
     * Solution file
     * default: ""
     */
    solution_file: string;

    /**
     * Log file
     * default: "Highs.log"
     */
    log_file: string;

    /**
     * Write the primal and dual solution to a file
     * default: false
     */
    write_solution_to_file: boolean;

    /**
     * Write the solution in style: 0=>Raw (computer-readable); 1=>Pretty (human-readable)
     * default: 0
     */
    write_solution_style: number;

    /**
     * Whether symmetry should be detected
     * default: true
     */
    mip_detect_symmetry: boolean;

    /**
     * MIP solver max number of nodes
     * default: 2147483647
     */
    mip_max_nodes: number;

    /**
     * MIP solver max number of nodes where estimate is above cutoff bound
     * default: 2147483647
     */
    mip_max_stall_nodes: number;

    /**
     * MIP solver max number of leave nodes
     * default: 2147483647
     */
    mip_max_leaves: number;

    /**
     * maximal age of dynamic LP rows before they are removed from the LP relaxation
     * default: 10
     */
    mip_lp_age_limit: number;

    /**
     * maximal age of rows in the cutpool before they are deleted
     * default: 30
     */
    mip_pool_age_limit: number;

    /**
     * soft limit on the number of rows in the cutpool for dynamic age adjustment
     * default: 10000
     */
    mip_pool_soft_limit: number;

    /**
     * minimal number of observations before pseudo costs are considered reliable
     * default: 8
     */
    mip_pscost_minreliable: number;

    /**
     * MIP solver reporting level
     * default: 1
     */
    mip_report_level: number;

    /**
     * MIP feasibility tolerance
     * default: 1e-06
     */
    mip_feasibility_tolerance: number;

    /**
     * effort spent for MIP heuristics
     * default: 0.05
     */
    mip_heuristic_effort: number;
  }>
>;
type HighsSolution =
  | GenericHighsSolution<
    true,
    HighsLinearSolutionColumn,
    HighsLinearSolutionRow
  >
  | GenericHighsSolution<
    false,
    HighsMixedIntegerLinearSolutionColumn,
    HighsMixedIntegerLinearSolutionRow
  >
  | GenericHighsSolution<
    boolean,
    HighsInfeasibleSolutionColumn,
    HighsInfeasibleSolutionRow,
    "Infeasible"
  >;

type GenericHighsSolution<IsLinear extends boolean, ColType, RowType, Status extends HighsModelStatus = HighsModelStatus> = {
  IsLinear: IsLinear,
  Status: Status;
  ObjectiveValue: number;
  Columns: Record<string, ColType>;
  Rows: RowType[];
};

type HighsModelStatus =
  | "Not Set"
  | "Load error"
  | "Model error"
  | "Presolve error"
  | "Solve error"
  | "Postsolve error"
  | "Empty"
  | "Optimal"
  | "Infeasible"
  | "Primal infeasible or unbounded"
  | "Unbounded"
  | "Bound on objective reached"
  | "Target for objective reached"
  | "Time limit reached"
  | "Iteration limit reached"
  | "Unknown";

interface HighsInfeasibleSolutionBase {
  Index: number;
  Lower: number | null;
  Upper: number | null;
}

interface HighsInfeasibleSolutionRow extends HighsInfeasibleSolutionBase { }
interface HighsInfeasibleSolutionColumn extends HighsInfeasibleSolutionBase {
  Type: "Integer" | "Continuous"
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
  Type: "Integer" | "Continuous";
  Name: string;
}

interface HighsLinearSolutionRow extends HighsSolutionBase {
  Dual: number;
  Status: HighsBasisStatus;
  Name: string;
}

interface HighsMixedIntegerLinearSolutionRow extends HighsSolutionBase { }

type HighsBasisStatus =
  /** Fixed */
  | "FX"
  /** Lower Bound */
  | "LB"
  /** Basis */
  | "BS"
  /** Upper Bound */
  | "UB"
  /** Free */
  | "FR"
  /** Non-Bounded */
  | "NB";

type HighsLoaderOptions = Readonly<
  Partial<{
    /** Should return the URL of an asset given its name. Useful for locating the wasm file */
    locateFile(file: string): string;
  }>
>;

/** Loads HiGHS */
export default function highsLoader(
  options?: HighsLoaderOptions
): Promise<Highs>;

// export const Model: unknown
