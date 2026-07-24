importScripts("highs.js?api=extended-1");

const runtimePromise = Module({
  locateFile(file) {
    return file === "highs.wasm" ? "highs.wasm?api=extended-1" : file;
  },
});

let highs;
let model;
let problem;
let cumulativeElapsed = 0;
let cumulativeNodes = 0;

function randomGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function callbackMetrics(data) {
  return {
    incumbent: data.mip_primal_bound,
    bound: data.mip_dual_bound,
    gap: data.mip_gap,
    iterations: data.mip_total_lp_iterations === undefined ? undefined : Number(data.mip_total_lp_iterations),
  };
}

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

async function resetModel(data) {
  model?.dispose();
  model = undefined;
  problem = undefined;
  cumulativeElapsed = 0;
  cumulativeNodes = 0;

  self.postMessage({ type: "phase", phase: "loading", message: "Loading the WebAssembly solver…" });
  highs ||= await runtimePromise;
  if (typeof highs.createModel !== "function") {
    throw new Error("The callback demo loaded a compatibility-only runtime. Rebuild the demo with `npm run build:demo`, then reload the page.");
  }
  const size = Math.max(30, Math.min(75, Number(data.size) || 60));
  const random = randomGenerator(20260724 + size);
  const points = Array.from({ length: size }, () => [0.04 + random() * 0.92, 0.05 + random() * 0.9]);
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

  // Two degree rows per city, plus Miller-Tucker-Zemlin rows that eliminate subtours.
  const numArcCols = arcs.length;
  const numCols = numArcCols + size - 1;
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

  self.postMessage({
    type: "phase",
    phase: "building",
    message: `Building ${numArcCols.toLocaleString()} route choices and ${rows.length.toLocaleString()} constraints…`,
    size,
    points,
  });
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

  model = highs.createModel();
  model.passModel({
    numCols,
    numRows: rows.length,
    sense: highs.constants.objectiveSense.minimize,
    colCost: [...arcs.map((arc) => arc.cost), ...new Array(size - 1).fill(0)],
    colLower: new Array(numCols).fill(0),
    colUpper: [...new Array(numArcCols).fill(1), ...new Array(size - 1).fill(size - 1)],
    rowLower: rows.map((row) => row.lower),
    rowUpper: rows.map((row) => row.upper),
    matrix: { format: "csc", numRows: rows.length, numCols, starts, indices, values },
    integrality: [...new Array(numArcCols).fill(highs.constants.variableType.integer), ...new Array(size - 1).fill(highs.constants.variableType.continuous)],
  });
  model.options.set({
    output_flag: false,
    time_limit: 600,
    mip_rel_gap: 0,
    mip_min_logging_interval: 0.5,
  });

  const initial = new Array(numCols).fill(0);
  for (let city = 0; city < size; city++) initial[arcIndex[city][(city + 1) % size]] = 1;
  for (let city = 1; city < size; city++) initial[numArcCols + city - 1] = city;
  model.setSolution({ colValue: initial });
  const initialDistance = arcs.reduce((sum, arc, index) => sum + arc.cost * initial[index], 0);
  problem = { arcs, size };
  self.postMessage({ type: "incumbent", route: Array.from({ length: size }, (_, index) => index), value: initialDistance, source: "initial tour" });
  self.postMessage({ type: "ready" });
}

function runModel(data) {
  if (!model || !problem) throw new Error("Build the callback model before running it");
  const { arcs, size } = problem;
  self.postMessage({ type: "phase", phase: "solving", message: "Branch-and-cut is shortening the tour. New routes arrive through HighsCallbackMap." });
  let lastMetricsAt = -Infinity;
  const runStartedAt = performance.now();
  const elapsedBase = cumulativeElapsed;
  const nodeBase = cumulativeNodes;
  let runElapsed = 0;
  let runNodes = 0;
  const autoStopSeconds = Number(data.autoStopSeconds) || 0;
  const stopFlag = data.stopBuffer ? new Int32Array(data.stopBuffer) : null;
  const callbackType = highs.constants.callbackType;
  let latestMetrics = {};
  const cumulativeMetrics = (callbackData) => {
    runElapsed = Math.max(runElapsed, (performance.now() - runStartedAt) / 1000);
    if (callbackData.mip_node_count !== undefined) {
      runNodes = Math.max(runNodes, Number(callbackData.mip_node_count));
    }
    return {
      ...callbackMetrics(callbackData),
      elapsed: elapsedBase + runElapsed,
      nodes: nodeBase + runNodes,
    };
  };
  const run = model.run({
    [callbackType.mipImprovingSolution](event) {
      latestMetrics = cumulativeMetrics(event.data);
      self.postMessage({
        type: "incumbent",
        route: routeFromSolution(event.data.mip_solution, arcs, size),
        value: event.data.objective_function_value,
        metrics: latestMetrics,
        source: "mipImprovingSolution",
      });
    },
    [callbackType.mipLogging](event) {
      const metrics = cumulativeMetrics(event.data);
      latestMetrics = metrics;
      if ((metrics.elapsed || 0) - lastMetricsAt >= 0.2) {
        lastMetricsAt = metrics.elapsed || 0;
        self.postMessage({ type: "metrics", metrics });
      }
    },
    [callbackType.mipInterrupt](event) {
      const metrics = cumulativeMetrics(event.data);
      latestMetrics = metrics;
      if ((metrics.elapsed || 0) - lastMetricsAt >= 0.2) {
        lastMetricsAt = metrics.elapsed || 0;
        self.postMessage({ type: "metrics", metrics });
      }
      if (
        (stopFlag && Atomics.load(stopFlag, 0) !== 0) ||
        (autoStopSeconds > 0 && (performance.now() - runStartedAt) / 1000 >= autoStopSeconds)
      ) event.interrupt();
    },
  });
  const solution = model.getSolution().colValue;
  const status = Object.entries(highs.constants.modelStatus).find(([, code]) => code === run.modelStatus)?.[0] || String(run.modelStatus);
  const objective = arcs.reduce((sum, arc, index) => sum + arc.cost * solution[index], 0);
  runElapsed = Math.max(runElapsed, (performance.now() - runStartedAt) / 1000);
  runNodes = Math.max(runNodes, Number(model.info.get("mip_node_count")));
  cumulativeElapsed = elapsedBase + runElapsed;
  cumulativeNodes = nodeBase + runNodes;
  const finalMetrics = {
    ...latestMetrics,
    elapsed: cumulativeElapsed,
    incumbent: objective,
    gap: Number(model.info.get("mip_gap")),
    nodes: cumulativeNodes,
  };
  if (status === "optimal") {
    finalMetrics.bound = objective;
    finalMetrics.gap = 0;
  }
  self.postMessage({
    type: "complete",
    status,
    route: routeFromSolution(solution, arcs, size),
    value: objective,
    metrics: finalMetrics,
  });
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
