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
     * default: "choose"
     */
    run_crossover: "off" | "choose" | "on";

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
     * Style of solution file (raw = computer-readable, pretty = human-readable): -1 => HiGHS old raw (deprecated); 0 => HiGHS raw; 1 => HiGHS pretty; 2 => Glpsol raw; 3 => Glpsol pretty; 4 => HiGHS sparse raw
     * default: 0
     */
    write_solution_style: -1 | 0 | 1 | 2 | 3 | 4;

    /**
     * Location of cost row for Glpsol file: -2 => Last; -1 => None; 0 => None if empty, otherwise data file location; 1 <= n <= num_row => Location n; n > num_row => Last
     * default: 0
     */
    glpsol_cost_row_location: number;

    /**
     * Write model file
     * default: ""
     */
    write_model_file: string;

    /**
     * Write the model to a file
     * default: false
     */
    write_model_to_file: boolean;

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
     * Whether improving MIP solutions should be saved
     * default: false
     */
    mip_improving_solution_save: boolean;

    /**
     * Whether improving MIP solutions should be reported in sparse format
     * default: false
     */
    mip_improving_solution_report_sparse: boolean;

    /**
     * File for reporting improving MIP solutions: not reported if ""
     * default: ""
     */
    mip_improving_solution_file: string;

    /**
     * MIP solver max number of leave nodes
     * default: 2147483647
     */
    mip_max_leaves: number;

    /**
     * Limit on the number of improving solutions found to stop the MIP solver prematurely.
     */
    mip_max_improving_sols: number;

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
     * Minimal number of entries in the MIP solver cliquetable before neighbourhood queries of the conflict graph use parallel processing
     * default: 100000
     */
    mip_min_cliquetable_entries_for_parallelism: number;

    /**
     * MIP feasibility tolerance
     * default: 1e-06
     */
    mip_feasibility_tolerance: number;

    /**
     * Effort spent for MIP heuristics
     * default 0.05
     */
    mip_heuristic_effort: number;

    /**
     * Tolerance on relative gap, |ub-lb|/|ub|, to determine whether optimality has been reached for a MIP instance
     * default: 0.0001
     */
    mip_rel_gap: number;

    /**
     * Tolerance on absolute gap of MIP, |ub-lb|, to determine whether optimality has been reached for a MIP instance
     * default: 1e-06
     */
    mip_abs_gap: number;
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

type GenericHighsSolution<
  IsLinear extends boolean,
  ColType,
  RowType,
  Status extends HighsModelStatus = HighsModelStatus
> = {
  IsLinear: IsLinear;
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

interface HighsInfeasibleSolutionRow extends HighsInfeasibleSolutionBase {}
interface HighsInfeasibleSolutionColumn extends HighsInfeasibleSolutionBase {
  Type: "Integer" | "Continuous";
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

interface HighsMixedIntegerLinearSolutionRow extends HighsSolutionBase {}

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
