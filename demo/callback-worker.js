importScripts("highs.js");

const runtimePromise = Module();

function randomGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function callbackMetrics(data) {
  return {
    elapsed: data.running_time,
    incumbent: data.mip_primal_bound,
    bound: data.mip_dual_bound,
    gap: data.mip_gap,
    nodes: data.mip_node_count === undefined ? undefined : Number(data.mip_node_count),
    iterations: data.mip_total_lp_iterations === undefined ? undefined : Number(data.mip_total_lp_iterations),
  };
}

self.addEventListener("message", async ({ data }) => {
  if (data.action !== "start") return;
  let model;
  try {
    self.postMessage({ type: "phase", phase: "loading", message: "Loading the WebAssembly solver…" });
    const highs = await runtimePromise;
    const size = Math.max(80, Math.min(420, Number(data.size) || 260));
    const density = Math.max(0.02, Math.min(0.3, Number(data.density) || 0.09));
    const random = randomGenerator(20260724 + size);
    const weights = Array.from({ length: size }, () => 10 + Math.floor(random() * 90));
    const edges = [];
    const adjacency = Array.from({ length: size }, () => []);
    for (let left = 0; left < size; left++) {
      for (let right = left + 1; right < size; right++) {
        if (random() < density) {
          const row = edges.length;
          edges.push([left, right]);
          adjacency[left].push({ row, other: right });
          adjacency[right].push({ row, other: left });
        }
      }
    }

    self.postMessage({ type: "phase", phase: "building", message: `Building ${size} binary columns and ${edges.length.toLocaleString()} conflicts…`, size, edges: edges.length, weights });
    const starts = [0];
    const indices = [];
    const values = [];
    for (const neighbors of adjacency) {
      for (const { row } of neighbors) {
        indices.push(row);
        values.push(1);
      }
      starts.push(indices.length);
    }

    model = highs.createModel();
    model.passModel({
      numCols: size,
      numRows: edges.length,
      sense: highs.constants.objectiveSense.maximize,
      colCost: weights,
      colLower: new Array(size).fill(0),
      colUpper: new Array(size).fill(1),
      rowLower: new Array(edges.length).fill(-Infinity),
      rowUpper: new Array(edges.length).fill(1),
      matrix: { format: "csc", numRows: edges.length, numCols: size, starts, indices, values },
      integrality: new Array(size).fill(highs.constants.variableType.integer),
    });
    model.options.set({ output_flag: false, time_limit: 600, mip_rel_gap: 0 });

    // A deterministic greedy MIP start gives the UI a useful incumbent immediately.
    const order = Array.from({ length: size }, (_, index) => index).sort((a, b) => weights[b] / (adjacency[b].length + 1) - weights[a] / (adjacency[a].length + 1));
    const chosen = new Uint8Array(size);
    for (const candidate of order) {
      if (adjacency[candidate].every(({ other }) => !chosen[other])) chosen[candidate] = 1;
    }
    model.setSolution({ colValue: Array.from(chosen) });
    self.postMessage({ type: "incumbent", selected: Array.from(chosen, (value, index) => value ? index : -1).filter((index) => index >= 0), value: weights.reduce((sum, weight, index) => sum + weight * chosen[index], 0), source: "greedy start" });
    self.postMessage({ type: "phase", phase: "solving", message: "Branch-and-cut is running. Progress arrives through HighsCallbackMap." });

    let lastMetricsAt = -Infinity;
    const autoStopSeconds = Number(data.autoStopSeconds) || 0;
    const callbackType = highs.constants.callbackType;
    const run = model.run({
      [callbackType.mipImprovingSolution](event) {
        const solution = event.data.mip_solution;
        self.postMessage({
          type: "incumbent",
          selected: Array.from(solution, (value, index) => value > 0.5 ? index : -1).filter((index) => index >= 0),
          value: event.data.objective_function_value,
          metrics: callbackMetrics(event.data),
          source: "mipImprovingSolution",
        });
      },
      [callbackType.mipLogging](event) {
        const metrics = callbackMetrics(event.data);
        if ((metrics.elapsed || 0) - lastMetricsAt >= 0.15) {
          lastMetricsAt = metrics.elapsed || 0;
          self.postMessage({ type: "metrics", metrics });
        }
      },
      [callbackType.mipInterrupt](event) {
        const metrics = callbackMetrics(event.data);
        if ((metrics.elapsed || 0) - lastMetricsAt >= 0.15) {
          lastMetricsAt = metrics.elapsed || 0;
          self.postMessage({ type: "metrics", metrics });
        }
        if (autoStopSeconds > 0 && (metrics.elapsed || 0) >= autoStopSeconds) {
          event.interrupt();
        }
      },
    });
    const solution = model.getSolution().colValue;
    self.postMessage({
      type: "complete",
      status: Object.entries(highs.constants.modelStatus).find(([, code]) => code === run.modelStatus)?.[0] || String(run.modelStatus),
      selected: Array.from(solution, (value, index) => value > 0.5 ? index : -1).filter((index) => index >= 0),
      value: model.getObjectiveValue(),
      gap: Number(model.info.get("mip_gap")),
    });
  } catch (error) {
    self.postMessage({ type: "error", error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) });
  } finally {
    model?.dispose();
  }
});
