importScripts("../highs.js?api=extended-1");

const runtimePromise = Module({
  locateFile(file) {
    return file === "highs.wasm" ? "../highs.wasm?api=extended-1" : file;
  },
});

/** @typedef {import("../../types.d.ts").Highs} Highs */
/** @typedef {import("../../types.d.ts").HighsConstants} HighsConstants */
/** @typedef {import("../../types.d.ts").Model} Model */
/** @typedef {import("../../types.d.ts").ModelData} ModelData */
/** @typedef {import("../../types.d.ts").RunResult} RunResult */
/** @typedef {import("../../types.d.ts").SolutionInput} SolutionInput */
/** @typedef {import("../../types.d.ts").CallbackData} CallbackData */
/** @typedef {import("../../types.d.ts").HighsCallbackMap} HighsCallbackMap */

/**
 * @typedef {{from: number, to: number, cost: number}} Arc
 * @typedef {{arcs: Arc[], size: number}} TspProblem
 * @typedef {{model: Model, problem: TspProblem, cumulativeElapsed: number, cumulativeNodes: number}} ActiveSession
 * @typedef {{points: number[][], arcs: Arc[], size: number, numArcCols: number, rowCount: number, modelData: ModelData, initial: NonNullable<SolutionInput["colValue"]>, initialDistance: number}} BuiltTspProblem
 * @typedef {{incumbent?: number, bound?: number, gap?: number, iterations?: number, elapsed?: number, nodes?: number}} Metrics
 * @typedef {{startedAt: number, elapsedBase: number, nodeBase: number, runElapsed: number, runNodes: number, lastMetricsAt: number, latestMetrics: Metrics}} MetricState
 * @typedef {{action: "reset", size?: number}|{action: "run", autoStopSeconds?: number, stopBuffer?: SharedArrayBuffer}} WorkerRequest
 * @typedef {{type: "phase", phase: string, message: string, size?: number, points?: number[][]}|{type: "incumbent", route: number[], value: number, source: string, metrics?: Metrics}|{type: "ready"}|{type: "metrics", metrics: Metrics}|{type: "complete", status: string, route: number[], value: number, metrics: Metrics}|{type: "error", error: string}} WorkerEvent
 */

/** @type {Highs|undefined} */
let highs;
/** @type {ActiveSession|undefined} */
let activeSession;
let resetGeneration = 0;

/**
 * Returns a deterministic pseudo-random number source for repeatable examples.
 *
 * @param {number} seed
 * @returns {() => number}
 */
function randomGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * Generates deterministic city coordinates without reading or mutating Worker
 * state.
 *
 * @param {number} size
 * @returns {number[][]}
 */
function buildPoints(size) {
  const random = randomGenerator(20260724 + size);
  return Array.from({ length: size }, () => [0.04 + random() * 0.92, 0.05 + random() * 0.9]);
}

/**
 * Builds every directed non-self arc and a constant-time arc lookup table.
 * Arc order is also the order of binary columns in the model.
 *
 * @param {number[][]} points
 * @returns {{arcs: Arc[], arcIndex: Int32Array[]}}
 */
function buildArcs(points) {
  const size = points.length;
  /** @type {Arc[]} */
  const arcs = [];
  const arcIndex = Array.from({ length: size }, () => new Int32Array(size).fill(-1));
  for (let from = 0; from < size; from++) {
    for (let to = 0; to < size; to++) {
      if (from === to) continue;
      arcIndex[from][to] = arcs.length;
      const dx = points[from][0] - points[to][0];
      const dy = points[from][1] - points[to][1];
      arcs.push({ from, to, cost: Math.round(Math.hypot(dx, dy) * 10000) });
    }
  }
  return { arcs, arcIndex };
}

/**
 * Builds degree equalities followed by Miller-Tucker-Zemlin subtour rows.
 * Entries use model column indices and remain independent of HiGHS.
 *
 * @param {number} size
 * @param {Arc[]} arcs
 * @param {Int32Array[]} arcIndex
 * @returns {{lower: number, upper: number, entries: number[][]}[]}
 */
function buildTspRows(size, arcs, arcIndex) {
  const numArcCols = arcs.length;
  const rows = [];
  for (let city = 0; city < size; city++) {
    rows.push({ lower: 1, upper: 1, entries: [] });
    rows.push({ lower: 1, upper: 1, entries: [] });
  }
  for (const arc of arcs) {
    rows[arc.from * 2].entries.push([arcIndex[arc.from][arc.to], 1]);
    rows[arc.to * 2 + 1].entries.push([arcIndex[arc.from][arc.to], 1]);
  }
  for (let from = 1; from < size; from++) {
    for (let to = 1; to < size; to++) {
      if (from === to) continue;
      rows.push({
        lower: -Infinity,
        upper: size - 1,
        entries: [[numArcCols + from - 1, 1], [numArcCols + to - 1, -1], [arcIndex[from][to], size]],
      });
    }
  }
  return rows;
}

/**
 * Converts row entry lists into a compressed sparse column matrix.
 *
 * @param {{entries: number[][]}[]} rows
 * @param {number} numCols
 * @returns {ModelData["matrix"]}
 */
function rowsToCsc(rows, numCols) {
  const byColumn = Array.from({ length: numCols }, () => []);
  rows.forEach((row, rowIndex) => row.entries.forEach(([column, value]) => byColumn[column].push([rowIndex, value])));
  const starts = [0];
  const indices = [];
  const values = [];
  for (const column of byColumn) {
    for (const [row, value] of column) {
      indices.push(row);
      values.push(value);
    }
    starts.push(indices.length);
  }
  return { format: "csc", numRows: rows.length, numCols, starts, indices, values };
}

/**
 * Creates the deterministic TSP data, sparse model, and feasible seed tour.
 * This function is pure: it owns no native resources and emits no events.
 *
 * @param {number} size
 * @param {HighsConstants} constants
 * @returns {BuiltTspProblem}
 */
function buildTspProblem(size, constants) {
  const points = buildPoints(size);
  const { arcs, arcIndex } = buildArcs(points);
  const rows = buildTspRows(size, arcs, arcIndex);
  const numArcCols = arcs.length;
  const numCols = numArcCols + size - 1;
  const initial = new Array(numCols).fill(0);
  for (let city = 0; city < size; city++) initial[arcIndex[city][(city + 1) % size]] = 1;
  for (let city = 1; city < size; city++) initial[numArcCols + city - 1] = city;

  return {
    points,
    arcs,
    size,
    numArcCols,
    rowCount: rows.length,
    initial,
    initialDistance: arcs.reduce((sum, arc, index) => sum + arc.cost * initial[index], 0),
    modelData: {
      numCols,
      numRows: rows.length,
      sense: constants.objectiveSense.minimize,
      colCost: [...arcs.map((arc) => arc.cost), ...new Array(size - 1).fill(0)],
      colLower: new Array(numCols).fill(0),
      colUpper: [...new Array(numArcCols).fill(1), ...new Array(size - 1).fill(size - 1)],
      rowLower: rows.map((row) => row.lower),
      rowUpper: rows.map((row) => row.upper),
      matrix: rowsToCsc(rows, numCols),
      integrality: [...new Array(numArcCols).fill(constants.variableType.integer), ...new Array(size - 1).fill(constants.variableType.continuous)],
    },
  };
}

/**
 * Creates and configures a native TSP model. A setup failure disposes the local
 * model before ownership can be transferred into the active session.
 *
 * @param {Highs} runtime
 * @param {BuiltTspProblem} built
 * @returns {Model}
 */
function createTspModel(runtime, built) {
  const nextModel = runtime.createModel();
  let configured = false;
  try {
    nextModel.passModel(built.modelData);
    nextModel.options.set({ output_flag: false, time_limit: 600, mip_rel_gap: 0, mip_min_logging_interval: 0.5 });
    nextModel.setSolution({ colValue: built.initial });
    configured = true;
    return nextModel;
  } finally {
    if (!configured) nextModel.dispose();
  }
}

/** @param {ActiveSession|undefined} session */
function disposeSession(session) {
  session?.model.dispose();
}

/**
 * Copies the callback fields used by the UI and converts native int64 values to
 * numbers before they cross the Worker boundary.
 *
 * @param {CallbackData} data
 * @returns {Metrics}
 */
function callbackMetrics(data) {
  return {
    incumbent: data.mip_primal_bound,
    bound: data.mip_dual_bound,
    gap: data.mip_gap,
    iterations: data.mip_total_lp_iterations === undefined ? undefined : Number(data.mip_total_lp_iterations),
  };
}

/**
 * Reconstructs the tour prefix represented by selected arc columns.
 *
 * @param {ArrayLike<number>} solution
 * @param {Arc[]} arcs
 * @param {number} size
 * @returns {number[]}
 */
function routeFromSolution(solution, arcs, size) {
  const next = new Int32Array(size).fill(-1);
  for (let index = 0; index < arcs.length; index++) {
    if (solution[index] > 0.5) next[arcs[index].from] = arcs[index].to;
  }
  const route = [0];
  const seen = new Set(route);
  while (route.length < size && next[route.at(-1)] >= 0 && !seen.has(next[route.at(-1)])) {
    route.push(next[route.at(-1)]);
    seen.add(route.at(-1));
  }
  return route;
}

/**
 * Ignores a completed runtime wait when a newer reset already owns the demo.
 *
 * @param {number} generation
 * @returns {Promise<Highs|undefined>}
 */
async function runtimeForReset(generation) {
  let runtime;
  try {
    runtime = highs || await runtimePromise;
  } catch (error) {
    if (generation !== resetGeneration) return undefined;
    throw error;
  }
  if (generation !== resetGeneration) return undefined;
  highs = runtime;
  if (typeof highs.createModel !== "function") {
    throw new Error("The callback demo loaded a compatibility-only runtime. Rebuild the demo with `npm run build:demo`, then reload the page.");
  }
  return highs;
}

/**
 * Replaces the active model only after deterministic data and native setup both
 * succeed. A generation check prevents an older runtime wait from publishing a
 * stale model after a newer reset request.
 *
 * @param {Extract<WorkerRequest, {action: "reset"}>} data
 */
async function resetModel(data) {
  const generation = ++resetGeneration;
  const previousSession = activeSession;
  activeSession = undefined;
  disposeSession(previousSession);

  self.postMessage({ type: "phase", phase: "loading", message: "Loading the WebAssembly solver…" });
  const runtime = await runtimeForReset(generation);
  if (!runtime) return;

  const size = Math.max(20, Math.min(75, Number(data.size) || 60));
  const built = buildTspProblem(size, runtime.constants);
  self.postMessage({
    type: "phase",
    phase: "building",
    message: `Building ${built.numArcCols.toLocaleString()} route choices and ${built.rowCount.toLocaleString()} constraints…`,
    size,
    points: built.points,
  });

  const nextModel = createTspModel(runtime, built);
  if (generation !== resetGeneration) {
    nextModel.dispose();
    return;
  }
  activeSession = {
    model: nextModel,
    problem: { arcs: built.arcs, size },
    cumulativeElapsed: 0,
    cumulativeNodes: 0,
  };
  self.postMessage({ type: "incumbent", route: Array.from({ length: size }, (_, index) => index), value: built.initialDistance, source: "initial tour" });
  self.postMessage({ type: "ready" });
}

/**
 * @param {ActiveSession} session
 * @returns {MetricState}
 */
function createMetricState(session) {
  return {
    startedAt: performance.now(),
    elapsedBase: session.cumulativeElapsed,
    nodeBase: session.cumulativeNodes,
    runElapsed: 0,
    runNodes: 0,
    lastMetricsAt: -Infinity,
    latestMetrics: {},
  };
}

/**
 * Updates run-local counters from one callback and returns cumulative UI data.
 *
 * @param {MetricState} state
 * @param {CallbackData} callbackData
 * @returns {Metrics}
 */
function updateMetricState(state, callbackData) {
  state.runElapsed = Math.max(state.runElapsed, (performance.now() - state.startedAt) / 1000);
  if (callbackData.mip_node_count !== undefined) {
    state.runNodes = Math.max(state.runNodes, Number(callbackData.mip_node_count));
  }
  const metrics = {
    ...callbackMetrics(callbackData),
    elapsed: state.elapsedBase + state.runElapsed,
    nodes: state.nodeBase + state.runNodes,
  };
  state.latestMetrics = metrics;
  return metrics;
}

/**
 * Publishes cumulative metrics no more than five times per second.
 *
 * @param {MetricState} state
 * @param {CallbackData} callbackData
 * @returns {Metrics}
 */
function publishMetrics(state, callbackData) {
  const metrics = updateMetricState(state, callbackData);
  if ((metrics.elapsed || 0) - state.lastMetricsAt >= 0.2) {
    state.lastMetricsAt = metrics.elapsed || 0;
    self.postMessage({ type: "metrics", metrics });
  }
  return metrics;
}

/**
 * Keeps the callback channels together so the demo mirrors a typical
 * `HighsCallbackMap` while the surrounding run lifecycle stays separate.
 *
 * @param {MetricState} metricsState
 * @param {TspProblem} problem
 * @param {number} autoStopSeconds
 * @param {Int32Array|null} stopFlag
 * @returns {HighsCallbackMap}
 */
function createRunCallbacks(metricsState, problem, autoStopSeconds, stopFlag) {
  const { arcs, size } = problem;
  const callbackType = highs.constants.callbackType;

  /** @type {HighsCallbackMap} */
  const callbacks = {
    [callbackType.mipImprovingSolution](event) {
      const metrics = updateMetricState(metricsState, event.data);
      self.postMessage({
        type: "incumbent",
        route: routeFromSolution(event.data.mip_solution, arcs, size),
        value: event.data.objective_function_value,
        metrics,
        source: "mipImprovingSolution",
      });
    },
    [callbackType.mipLogging](event) {
      publishMetrics(metricsState, event.data);
    },
    [callbackType.mipInterrupt](event) {
      publishMetrics(metricsState, event.data);
      const reachedAutoStop = autoStopSeconds > 0 &&
        (performance.now() - metricsState.startedAt) / 1000 >= autoStopSeconds;
      if ((stopFlag && Atomics.load(stopFlag, 0) !== 0) || reachedAutoStop) event.interrupt();
    },
  };
  return callbacks;
}

/**
 * @param {Model} model
 * @param {HighsCallbackMap} callbacks
 * @returns {string}
 */
function executeModel(model, callbacks) {
  /** @type {RunResult} */
  const run = model.run(callbacks);
  return Object.entries(highs.constants.modelStatus).find(([, code]) => code === run.modelStatus)?.[0] || String(run.modelStatus);
}

/**
 * @param {Model} model
 * @param {string} status
 * @returns {Float64Array}
 */
function getFeasibleSolution(model, status) {
  const primalStatus = model.info.get("primal_solution_status");
  if (primalStatus !== highs.constants.solutionStatus.feasible) {
    throw new Error(`HiGHS ended with model status ${status} and no feasible primal solution`);
  }
  return model.getSolution().colValue;
}

/**
 * Carries elapsed time and node counts across interrupted/resumed demo runs.
 *
 * @param {ActiveSession} session
 * @param {MetricState} metricsState
 * @param {Float64Array} solution
 * @param {string} status
 * @returns {{objective: number, metrics: Metrics}}
 */
function finalizeRun(session, metricsState, solution, status) {
  const { model, problem } = session;
  const objective = problem.arcs.reduce((sum, arc, index) => sum + arc.cost * solution[index], 0);
  metricsState.runElapsed = Math.max(metricsState.runElapsed, (performance.now() - metricsState.startedAt) / 1000);
  metricsState.runNodes = Math.max(metricsState.runNodes, Number(model.info.get("mip_node_count")));
  session.cumulativeElapsed = metricsState.elapsedBase + metricsState.runElapsed;
  session.cumulativeNodes = metricsState.nodeBase + metricsState.runNodes;
  const metrics = {
    ...metricsState.latestMetrics,
    elapsed: session.cumulativeElapsed,
    incumbent: objective,
    gap: Number(model.info.get("mip_gap")),
    nodes: session.cumulativeNodes,
  };
  if (status === "optimal") {
    metrics.bound = objective;
    metrics.gap = 0;
  }
  return { objective, metrics };
}

/**
 * @param {TspProblem} problem
 * @param {Float64Array} solution
 * @param {string} status
 * @param {number} objective
 * @param {Metrics} metrics
 */
function publishCompletedRun(problem, solution, status, objective, metrics) {
  self.postMessage({
    type: "complete",
    status,
    route: routeFromSolution(solution, problem.arcs, problem.size),
    value: objective,
    metrics,
  });
}

/** @param {Extract<WorkerRequest, {action: "run"}>} data */
function runModel(data) {
  const session = activeSession;
  if (!session) throw new Error("Build the callback model before running it");
  self.postMessage({ type: "phase", phase: "solving", message: "Branch-and-cut is shortening the tour. New routes arrive through HighsCallbackMap." });

  const metricsState = createMetricState(session);
  const autoStopSeconds = Number(data.autoStopSeconds) || 0;
  const stopFlag = data.stopBuffer ? new Int32Array(data.stopBuffer) : null;
  const callbacks = createRunCallbacks(metricsState, session.problem, autoStopSeconds, stopFlag);
  const status = executeModel(session.model, callbacks);
  const solution = getFeasibleSolution(session.model, status);
  const { objective, metrics } = finalizeRun(session, metricsState, solution, status);
  publishCompletedRun(session.problem, solution, status, objective, metrics);
}

self.addEventListener("message", async ({ data }) => {
  try {
    if (data.action === "reset") await resetModel(data);
    else if (data.action === "run") runModel(data);
    else throw new Error(`Unknown callback Worker action: ${data.action}`);
  } catch (error) {
    self.postMessage({ type: "error", error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) });
  }
});
