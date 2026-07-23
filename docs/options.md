---
layout: docs
title: Solver options reference
description: Complete reference of every HiGHS option available in highs-js.
permalink: /docs/options/
---

# Solver options reference

These are all the options exposed by the HiGHS runtime compiled into
highs-js.  You can browse them live (and change them) in the
[Options tab of the web demo]({{ '/' | relative_url }}).

Options use HiGHS `snake_case` names.  Set them on a persistent model via
`model.options.set(name, value)` or `model.options.set({ ... })`.  The
single-threaded WebAssembly build rejects thread, parallel, and file-path
options — those are intentionally excluded from this list.

| Name | Type | Default | Min | Max |
| --- | --- | --- | --- | --- |
| `blend_multi_objectives` | boolean | true |  |  |
| `icrash` | boolean | false |  |  |
| `icrash_breakpoints` | boolean | false |  |  |
| `icrash_dualize` | boolean | false |  |  |
| `icrash_exact` | boolean | false |  |  |
| `log_to_console` | boolean | true |  |  |
| `mip_allow_cut_separation_at_nodes` | boolean | true |  |  |
| `mip_allow_restart` | boolean | true |  |  |
| `mip_detect_symmetry` | boolean | true |  |  |
| `mip_heuristic_run_feasibility_jump` | boolean | true |  |  |
| `mip_heuristic_run_rens` | boolean | true |  |  |
| `mip_heuristic_run_rins` | boolean | true |  |  |
| `mip_heuristic_run_root_reduced_cost` | boolean | true |  |  |
| `mip_heuristic_run_shifting` | boolean | false |  |  |
| `mip_heuristic_run_zi_round` | boolean | false |  |  |
| `mip_improving_solution_report_sparse` | boolean | false |  |  |
| `mip_improving_solution_save` | boolean | false |  |  |
| `mip_root_presolve_only` | boolean | false |  |  |
| `output_flag` | boolean | true |  |  |
| `qp_allow_hot_start` | boolean | false |  |  |
| `timeless_log` | boolean | false |  |  |
| `glpsol_cost_row_location` | integer | 0 | -2 | 2147483647 |
| `highs_analysis_level` | integer | 0 | 0 | 511 |
| `highs_debug_level` | integer | 0 | 0 | 3 |
| `hipo_block_size` | integer | 128 | 0 | 2147483647 |
| `icrash_approx_iter` | integer | 50 | 0 | 100 |
| `icrash_iterations` | integer | 30 | 0 | 200 |
| `iis_strategy` | integer | 0 | 0 | 31 |
| `ipm_iteration_limit` | integer | 2147483647 | 0 | 2147483647 |
| `mip_lifting_for_probing` | integer | -1 | -1 | 2147483647 |
| `mip_lp_age_limit` | integer | 10 | 0 | 32767 |
| `mip_max_improving_sols` | integer | 2147483647 | 1 | 2147483647 |
| `mip_max_leaves` | integer | 2147483647 | 0 | 2147483647 |
| `mip_max_nodes` | integer | 2147483647 | 0 | 2147483647 |
| `mip_max_stall_nodes` | integer | 2147483647 | 0 | 2147483647 |
| `mip_max_start_nodes` | integer | 500 | 0 | 2147483647 |
| `mip_pool_age_limit` | integer | 30 | 0 | 1000 |
| `mip_pool_soft_limit` | integer | 10000 | 1 | 2147483647 |
| `mip_pscost_minreliable` | integer | 8 | 0 | 2147483647 |
| `mip_report_level` | integer | 1 | 0 | 2 |
| `pdlp_cupdlpc_restart_method` | integer | 1 | 0 | 2 |
| `pdlp_iteration_limit` | integer | 2147483647 | 0 | 2147483647 |
| `pdlp_restart_strategy` | integer | 2 | 0 | 3 |
| `pdlp_ruiz_iterations` | integer | 10 | 0 | 2147483647 |
| `pdlp_scaling_mode` | integer | 5 | 0 | 7 |
| `pdlp_step_size_strategy` | integer | 1 | 0 | 3 |
| `qp_iteration_limit` | integer | 2147483647 | 0 | 2147483647 |
| `qp_nullspace_limit` | integer | 4000 | 0 | 2147483647 |
| `random_seed` | integer | 0 | 0 | 2147483647 |
| `simplex_crash_strategy` | integer | 0 | 0 | 9 |
| `simplex_dual_edge_weight_strategy` | integer | -1 | -1 | 2 |
| `simplex_iteration_limit` | integer | 2147483647 | 0 | 2147483647 |
| `simplex_primal_edge_weight_strategy` | integer | -1 | -1 | 2 |
| `simplex_scale_strategy` | integer | 2 | 0 | 4 |
| `simplex_strategy` | integer | 1 | 0 | 4 |
| `simplex_update_limit` | integer | 5000 | 0 | 2147483647 |
| `user_bound_scale` | integer | 0 | -2147483647 | 2147483647 |
| `user_objective_scale` | integer | 0 | -2147483647 | 2147483647 |
| `write_solution_style` | integer | 0 | -1 | 4 |
| `dual_feasibility_tolerance` | double | 1e-7 | 1e-10 | null |
| `dual_residual_tolerance` | double | 1e-7 | 1e-10 | null |
| `icrash_starting_weight` | double | 0.001 | 1e-10 | 1e+50 |
| `iis_time_limit` | double | null | 0 | null |
| `infinite_bound` | double | 100000000000000000000 | 1000000000000000 | null |
| `infinite_cost` | double | 100000000000000000000 | 1000000000000000 | null |
| `ipm_optimality_tolerance` | double | 1e-8 | 1e-12 | null |
| `kkt_tolerance` | double | 1e-7 | 1e-10 | null |
| `large_matrix_value` | double | 1000000000000000 | 1 | null |
| `mip_abs_gap` | double | 0.000001 | 0 | null |
| `mip_feasibility_tolerance` | double | 0.000001 | 1e-10 | null |
| `mip_heuristic_effort` | double | 0.05 | 0 | 1 |
| `mip_min_logging_interval` | double | 5 | 0 | null |
| `mip_rel_gap` | double | 0.0001 | 0 | null |
| `objective_bound` | double | null | null | null |
| `objective_target` | double | null | null | null |
| `optimality_tolerance` | double | 1e-7 | 1e-10 | null |
| `pdlp_optimality_tolerance` | double | 1e-7 | 1e-10 | null |
| `primal_feasibility_tolerance` | double | 1e-7 | 1e-10 | null |
| `primal_residual_tolerance` | double | 1e-7 | 1e-10 | null |
| `qp_regularization_value` | double | 1e-7 | 0 | null |
| `small_matrix_value` | double | 1e-9 | 1e-12 | null |
| `time_limit` | double | null | 0 | null |
| `hipo_ordering` | string | "choose" |  |  |
| `hipo_system` | string | "choose" |  |  |
| `icrash_strategy` | string | "ICA" |  |  |
| `mip_ipm_solver` | string | "choose" |  |  |
| `mip_lp_solver` | string | "choose" |  |  |
| `presolve` | string | "choose" |  |  |
| `ranging` | string | "off" |  |  |
| `run_crossover` | string | "on" |  |  |
| `solver` | string | "choose" |  |  |

_Generated from 91 options._
