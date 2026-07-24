import { send } from "./worker-client.js";
import "./navigation.js";
import {
  element,
  enhanceSyntaxEditors,
  renderProgressBars,
  setJson,
  setOutput,
  setStatus,
  setTiming,
} from "./ui.js";
import {
  buildFacilityPayload,
  denseToCSC,
  getExample,
  getFacilityDefinition,
  readNumber,
} from "./model-data.js";
import {
  constraintExplorerConfig,
  createSparseExplorer,
  hessianExplorerConfig,
  parseLpModel,
  renderOptimalityMap,
  renderDietViz,
  renderFacilityViz,
  renderGridDispatch,
  renderIisPlot,
  renderIoViz,
  renderKnapsackViz,
  renderPortfolioViz,
  renderProductionViz,
  renderRangingViz,
  renderTransportViz,
  renderCallbackGraph,
  renderCallbackProgress,
} from "./visualizations.js";

let buildMatrixExplorer;
let qpMatrixExplorer;

/* ══════════════════════════════════════════
   TAB 1: LP Format (Legacy API)
   ══════════════════════════════════════════ */

const lpInput = document.getElementById("lp-input");
const lpOutput = document.getElementById("lp-output");
const lpTiming = document.getElementById("lp-timing");
const lpObjVal = document.getElementById("lp-obj-val");
const lpVisualBars = document.getElementById("lp-visual-bars");
const lpStatus = document.getElementById("lp-status");
const defaultLP = lpInput ? lpInput.value : "";

async function solveLPFormat() {
  setOutput(lpOutput, "Solving…", "");
  setStatus(lpStatus, "solving");
  const data = await send("solveLP", { problem: lpInput.value });
  if (data.error) {
    setOutput(lpOutput, data.error, "error");
    if (lpObjVal) lpObjVal.textContent = "ERROR";
    setStatus(lpStatus, "error");
  } else {
    setTiming(lpTiming, data.elapsed);
    setJson(lpOutput, data.result);

    const objVal = data.result?.ObjectiveValue;
    setStatus(lpStatus, data.result?.Status || "complete");
    if (lpObjVal && objVal !== undefined) {
      lpObjVal.textContent = objVal.toFixed(4);
    }

    renderOptimalityMap(lpVisualBars, data.result, parseLpModel(lpInput.value));
  }
}

document.getElementById("lp-solve")?.addEventListener("click", solveLPFormat);

document.getElementById("lp-reset")?.addEventListener("click", () => {
  if (lpInput) {
    lpInput.value = defaultLP;
    lpInput.dispatchEvent(new Event("input"));
  }
});

lpInput?.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    solveLPFormat();
  }
});

/* ══════════════════════════════════════════
   TAB 2: Build & Solve (Extended API)
   ══════════════════════════════════════════ */

const buildOutput = document.getElementById("build-output");
const buildTiming = document.getElementById("build-timing");
const buildObjVal = document.getElementById("build-obj-val");
const buildVisualBars = document.getElementById("build-visual-bars");
const buildStatus = document.getElementById("build-status");

const liveRevisions = new Map();

function beginLiveSolve(key) {
  const revision = (liveRevisions.get(key) || 0) + 1;
  liveRevisions.set(key, revision);
  const state = document.getElementById(`${key}-state`);
  if (state) {
    state.dataset.revision = String(revision);
    state.dataset.state = "solving";
    state.textContent = "Updating the solution…";
  }
  return revision;
}

function finishLiveSolve(key, revision, message, error = false) {
  if (liveRevisions.get(key) !== revision) return false;
  const state = document.getElementById(`${key}-state`);
  if (state) {
    state.dataset.revision = String(revision);
    state.dataset.state = error ? "error" : "ready";
    state.textContent = message;
  }
  return true;
}

async function solveBuildModel() {
  const revision = beginLiveSolve("production");
  setOutput(buildOutput, "Solving…", "");
  setStatus(buildStatus, "solving");
  const ex = getExample("production");
  const n = ex.costs.length;
  buildMatrixExplorer?.setConfig(constraintExplorerConfig("production", ex));
  const csc = denseToCSC(ex.A, n);

  const data = await send("buildSolve", {
    colCost: ex.costs,
    colLower: ex.lowers,
    colUpper: ex.uppers,
    rowLower: ex.rowLowers,
    rowUpper: ex.rowUppers,
    sense: ex.sense,
    starts: Array.from(csc.starts),
    indices: Array.from(csc.indices),
    values: Array.from(csc.values),
  });

  if (liveRevisions.get("production") !== revision) return;
  if (data.error) {
    finishLiveSolve("production", revision, data.error, true);
    setOutput(buildOutput, data.error, "error");
    if (buildObjVal) buildObjVal.textContent = "ERROR";
    setStatus(buildStatus, "error");
  } else {
    finishLiveSolve("production", revision, `Optimal mix updated in ${data.elapsed} ms.`);
    setTiming(buildTiming, data.elapsed);
    if (buildObjVal) buildObjVal.textContent = data.objective?.toFixed(4);
    setStatus(buildStatus, data.modelStatus);

    renderProgressBars(
      buildVisualBars,
      data.primal.map((v, i) => ({ name: ex.names[i], val: v }))
    );
    renderProductionViz(document.getElementById("production-viz"), ex, data.primal, data.objective);

    setOutput(buildOutput,
      `Status: ${data.modelStatus} (${data.elapsed} ms)\n` +
      `Objective: ${data.objective}\n\n` +
      `Primal values:\n${data.primal.map((v, i) => `  ${ex.names[i]} = ${v.toFixed(6)}`).join("\n")}\n\n` +
      `Reduced costs:\n${data.dual.map((v, i) => `  ${ex.names[i]} = ${v.toFixed(6)}`).join("\n")}`
    );
  }
}

async function solveStaticBuildExample(key) {
  const revision = beginLiveSolve(key);
  const example = getExample(key);
  const csc = denseToCSC(example.A, example.costs.length);
  const data = await send("buildSolve", {
    colCost: example.costs,
    colLower: example.lowers,
    colUpper: example.uppers,
    rowLower: example.rowLowers,
    rowUpper: example.rowUppers,
    sense: example.sense,
    starts: Array.from(csc.starts),
    indices: Array.from(csc.indices),
    values: Array.from(csc.values),
  });
  if (liveRevisions.get(key) !== revision) return;
  if (data.error) {
    const container = document.getElementById(`${key}-viz`);
    if (container) container.replaceChildren(element("div", { class: "viz-loading", text: data.error }));
    finishLiveSolve(key, revision, data.error, true);
    return;
  }
  finishLiveSolve(key, revision, `Optimal solution updated in ${data.elapsed} ms.`);
  if (key === "diet") renderDietViz(document.getElementById("diet-viz"), example, data.primal, data.objective);
  if (key === "transport") renderTransportViz(document.getElementById("transport-viz"), example, data.primal, data.objective);
}

/* ══════════════════════════════════════════
   TAB 3: MILP (Mixed-Integer Linear Programming)
   ══════════════════════════════════════════ */

const mipOutput = document.getElementById("mip-output");
const mipCapacity = document.getElementById("mip-capacity");
const mipTiming = document.getElementById("mip-timing");
const mipValStat = document.getElementById("mip-val-stat");
const mipWeightStat = document.getElementById("mip-weight-stat");
const mipPackingTrack = document.getElementById("mip-packing-track");
const mipVisualGrid = document.getElementById("mip-visual-grid");
const mipStatus = document.getElementById("mip-status");
const mipGapStat = document.getElementById("mip-gap-stat");
async function solveMipModel() {
  const revision = beginLiveSolve("knapsack");
  setOutput(mipOutput, "Solving MILP…", "");
  setStatus(mipStatus, "solving");
  const cap = Number(mipCapacity?.value);
  const values = Float64Array.from([...document.querySelectorAll(".mip-value")].map((input) => Number(input.value)));
  const weights = Float64Array.from([...document.querySelectorAll(".mip-weight")].map((input) => Number(input.value)));
  if (!Number.isFinite(cap) || cap <= 0 || !values.length || values.some((value) => !Number.isFinite(value) || value < 0) || weights.some((weight) => !Number.isFinite(weight) || weight <= 0)) {
    const message = "Capacity and item weights must be positive; values cannot be negative.";
    finishLiveSolve("knapsack", revision, message, true);
    setOutput(mipOutput, message, "error");
    setStatus(mipStatus, "invalid input");
    return;
  }
  const n = values.length;

  const csc = {
    starts: [0],
    indices: [],
    values: [],
  };
  for (let i = 0; i < n; i++) {
    csc.indices.push(0);
    csc.values.push(weights[i]);
    csc.starts.push(csc.indices.length);
  }

  const data = await send("mipSolve", {
    colCost: Array.from(values),
    colLower: new Array(n).fill(0),
    colUpper: new Array(n).fill(1),
    rowLower: [-Infinity],
    rowUpper: [cap],
    sense: "maximize",
    starts: Array.from(csc.starts),
    indices: Array.from(csc.indices),
    values: Array.from(csc.values),
    integrality: new Array(n).fill("integer"),
  });

  if (liveRevisions.get("knapsack") !== revision) return;
  if (data.error) {
    finishLiveSolve("knapsack", revision, data.error, true);
    setOutput(mipOutput, data.error, "error");
    setStatus(mipStatus, "error");
  } else {
    finishLiveSolve("knapsack", revision, `Best packing updated in ${data.elapsed} ms.`);
    setTiming(mipTiming, data.elapsed);
    if (mipValStat) mipValStat.textContent = `$${data.objective}`;
    setStatus(mipStatus, data.modelStatus);
    if (mipGapStat) mipGapStat.textContent = data.mipGap === undefined ? "--" : `${(data.mipGap * 100).toFixed(2)}%`;

    const selected = [];
    const packBlocks = [];
    let totalWeight = 0;

    for (let i = 0; i < n; i++) {
      const isChosen = data.primal[i] > 0.5;
      if (isChosen) {
        selected.push(`item ${i + 1} (v=${values[i]}, w=${weights[i]})`);
        totalWeight += weights[i];

        const pct = ((weights[i] / cap) * 100).toFixed(1);
        packBlocks.push(element("div", {
          class: "pack-block",
          style: { width: `${pct}%` },
          title: `Item ${i + 1}: ${weights[i]}kg`,
          text: `Item ${i + 1} (${weights[i]}kg)`,
        }));
      }
    }

    const remainingWeight = Math.max(0, cap - totalWeight);
    if (remainingWeight > 0) {
      const remPct = ((remainingWeight / cap) * 100).toFixed(1);
      packBlocks.push(element("div", { class: "pack-block empty", style: { width: `${remPct}%` }, text: `Empty (${remainingWeight}kg)` }));
    }

    if (mipWeightStat) mipWeightStat.textContent = `${totalWeight} / ${cap} kg`;
    if (mipPackingTrack) mipPackingTrack.replaceChildren(...packBlocks);
    if (mipVisualGrid) renderKnapsackViz(mipVisualGrid, Array.from(values), Array.from(weights), data.primal, cap);

    setOutput(mipOutput,
      `Status: ${data.modelStatus} (${data.elapsed} ms)\n` +
      `Objective: ${data.objective}\n` +
      `MIP gap: ${data.mipGap !== undefined ? data.mipGap.toFixed(6) : "N/A"}\n` +
      `Total weight: ${totalWeight} / ${cap}\n\n` +
      `Selected items:\n` +
      (selected.length ? selected.join("\n") : "None")
    );
  }
}

async function solveFacilityModel() {
  const revision = beginLiveSolve("facility");
  const definition = getFacilityDefinition();
  const data = await send("mipSolve", buildFacilityPayload());
  const container = document.getElementById("facility-viz");
  if (liveRevisions.get("facility") !== revision) return;
  if (data.error) {
    if (container) container.replaceChildren(element("div", { class: "viz-loading", text: data.error }));
    finishLiveSolve("facility", revision, data.error, true);
    return;
  }
  finishLiveSolve("facility", revision, `Opening plan updated in ${data.elapsed} ms.`);
  renderFacilityViz(container, definition, data.primal, data.objective);
}

/* ══════════════════════════════════════════
   TAB 4: QP (Quadratic Programming)
   ══════════════════════════════════════════ */

const qpOutput = document.getElementById("qp-output");
const qpTargetReturn = document.getElementById("qp-target-return");
const qpTiming = document.getElementById("qp-timing");
const qpRiskStat = document.getElementById("qp-risk-stat");
const qpAllocationTrack = document.getElementById("qp-allocation-track");
const qpAllocationText = document.getElementById("qp-allocation-text");
const qpStatus = document.getElementById("qp-status");

qpTargetReturn?.addEventListener("input", () => {
  const target = parseFloat(qpTargetReturn.value);
  const returns = ["tech", "energy", "bonds"].map((asset, index) => readNumber(`qp-return-${asset}`, [12, 8, 4][index]) / 100);
  if (Number.isFinite(target)) qpMatrixExplorer?.setConfig(hessianExplorerConfig(target / 100, returns));
});

async function solveQpModel() {
  const revision = beginLiveSolve("qp");
  setOutput(qpOutput, "Solving QP…", "");
  setStatus(qpStatus, "solving");

  const targetPct = parseFloat(qpTargetReturn?.value || "8.0") / 100.0;
  const expectedReturns = ["tech", "energy", "bonds"].map((asset, index) => readNumber(`qp-return-${asset}`, [12, 8, 4][index]) / 100);
  if (!Number.isFinite(targetPct) || expectedReturns.some((value) => !Number.isFinite(value))) {
    finishLiveSolve("qp", revision, "Enter valid target and expected returns.", true);
    return;
  }
  qpMatrixExplorer?.setConfig(hessianExplorerConfig(targetPct, expectedReturns));

  // Decision variables x0 (Tech), x1 (Energy), x2 (Bonds)
  // Linear costs: 0 (pure variance minimization)
  const colCost = [0, 0, 0];
  const colLower = [0, 0, 0];
  const colUpper = [1, 1, 1];

  // Row r0: Budget sum x0 + x1 + x2 = 1
  // Row r1: Target return 0.12 x0 + 0.08 x1 + 0.04 x2 >= targetPct
  const A_dense = [
    [1.0, 1.0, 1.0],
    expectedReturns,
  ];
  const rowLower = [1.0, targetPct];
  const rowUpper = [1.0, Infinity];

  const csc = denseToCSC(A_dense, 3);

  // HiGHS evaluates 1/2 x'Qx, so Q is twice the covariance matrix.
  const hessian = {
    format: "triangular",
    dimension: 3,
    starts: [0, 2, 3, 4],
    indices: [0, 1, 1, 2],
    values: [0.08, 0.02, 0.04, 0.01],
  };

  const data = await send("qpSolve", {
    colCost,
    colLower,
    colUpper,
    rowLower,
    rowUpper,
    sense: "minimize",
    starts: Array.from(csc.starts),
    indices: Array.from(csc.indices),
    values: Array.from(csc.values),
    hessian,
  });

  if (liveRevisions.get("qp") !== revision) return;
  if (data.error) {
    finishLiveSolve("qp", revision, data.error, true);
    setOutput(qpOutput, data.error, "error");
    setStatus(qpStatus, "error");
  } else {
    finishLiveSolve("qp", revision, `Minimum-risk portfolio updated in ${data.elapsed} ms.`);
    setTiming(qpTiming, data.elapsed);
    if (qpRiskStat) qpRiskStat.textContent = data.objective.toFixed(6);
    setStatus(qpStatus, data.modelStatus);

    const w1 = (data.primal[0] * 100).toFixed(1);
    const w2 = (data.primal[1] * 100).toFixed(1);
    const w3 = (data.primal[2] * 100).toFixed(1);

    if (qpAllocationText) {
      qpAllocationText.textContent = `Tech: ${w1}% | Energy: ${w2}% | Bonds: ${w3}%`;
    }

    if (qpAllocationTrack) {
      renderPortfolioViz(qpAllocationTrack, data.primal, data.objective, targetPct);
    }

    setOutput(qpOutput,
      `Status: ${data.modelStatus} (${data.elapsed} ms)\n` +
      `Minimized Variance (Risk): ${data.objective.toFixed(6)}\n\n` +
      `Optimal Asset Weights:\n` +
      `  Tech Growth (x0): ${(data.primal[0] * 100).toFixed(2)}%\n` +
      `  Energy Stock (x1): ${(data.primal[1] * 100).toFixed(2)}%\n` +
      `  Govt Bonds   (x2): ${(data.primal[2] * 100).toFixed(2)}%`
    );
  }
}

/* ══════════════════════════════════════════
   TAB 5: Multiple Linear Objectives
   ══════════════════════════════════════════ */

async function solveGridModel() {
  const revision = beginLiveSolve("grid");
  const mode = document.getElementById("grid-mode")?.value || "lexicographic";
  const payload = {
    mode,
    gasCapacity: readNumber("grid-gas-capacity", 45),
    carbonTolerance: readNumber("grid-carbon-tolerance", 3),
    reliabilityWeight: readNumber("grid-reliability-weight", 50),
    carbonWeight: readNumber("grid-carbon-weight", 20),
  };
  if (Object.values(payload).some((value) => typeof value === "number" && (!Number.isFinite(value) || value < 0))) {
    finishLiveSolve("grid", revision, "Grid policy values must be non-negative numbers.", true);
    return;
  }
  const data = await send("multiObjectiveGrid", payload);
  if (liveRevisions.get("grid") !== revision) return;
  if (data.error) {
    finishLiveSolve("grid", revision, data.error, true);
    return;
  }
  finishLiveSolve("grid", revision, `${mode === "lexicographic" ? "Priority" : "Blended"} dispatch updated in ${data.elapsed} ms.`);
  document.getElementById("grid-unserved").textContent = `${data.objectives.unserved.toFixed(1)} MWh`;
  document.getElementById("grid-emissions").textContent = `${data.objectives.emissions.toFixed(1)} t`;
  document.getElementById("grid-cost").textContent = `$${Math.round(data.objectives.cost).toLocaleString()}`;
  const explanation = document.getElementById("grid-explanation");
  if (explanation) explanation.textContent = mode === "lexicographic"
    ? `Reliability is optimized first. Carbon may degrade by at most ${payload.carbonTolerance} t while cost is reduced.`
    : `All units are mixed into one score. At reliability weight ${payload.reliabilityWeight}, the optimizer may prefer an outage over expensive generation.`;
  renderGridDispatch(document.getElementById("grid-viz"), data);
}

/* ══════════════════════════════════════════
   TAB 6: Streaming MIP Callbacks
   ══════════════════════════════════════════ */

let callbackWorker;
let callbackStopFlag;
let callbackGraph = { size: 0, points: [], route: [] };
let callbackHistory = [];
let callbackModelReady = false;
let callbackRunning = false;
let callbackStartAfterReset = false;
let callbackRestartPending = false;

const callbackInterruptNote = document.getElementById("callback-interrupt-note");
const sharedCallbackStop = window.crossOriginIsolated && typeof SharedArrayBuffer === "function";
if (callbackInterruptNote) {
  callbackInterruptNote.innerHTML = sharedCallbackStop
    ? `“Stop now” writes to a <code>SharedArrayBuffer</code>. The blocked solver Worker reads that atomic flag inside <code>mipInterrupt</code> and calls <code>event.interrupt()</code>. Resume runs the same native model with its incumbent; only “Restart from scratch” disposes and rebuilds it.`
    : `Cross-origin isolation is unavailable, so “Stop now” falls back to terminating the dedicated Worker. On HTTPS, <code>coi-serviceworker</code> normally enables shared-memory callback interruption after its first automatic reload.`;
}

function setCallbackControls(state) {
  const start = document.getElementById("callback-start");
  const stop = document.getElementById("callback-stop");
  const restart = document.getElementById("callback-restart");
  const labels = {
    initial: ["Start search", "Stop now", "Restart from scratch"],
    building: ["Building model…", "Stop now", "Restart from scratch"],
    running: ["Search running…", "Stop now", "Restart from scratch"],
    stopping: ["Search running…", "Stopping…", "Restart from scratch"],
    restarting: ["Search running…", "Stop now", "Restarting…"],
    paused: ["Resume search", "Stop now", "Restart from scratch"],
    finished: ["Optimal found", "Stop now", "Restart from scratch"],
  };
  const [startLabel, stopLabel, restartLabel] = labels[state];
  start.textContent = startLabel;
  stop.textContent = stopLabel;
  restart.textContent = restartLabel;
  start.disabled = !["initial", "paused"].includes(state);
  stop.disabled = state !== "running";
  restart.disabled = !["running", "paused", "finished"].includes(state);
}

function setCallbackVerdict(kind, title, detail) {
  const verdict = document.getElementById("callback-verdict");
  verdict.hidden = false;
  verdict.className = `callback-verdict ${kind}`;
  document.getElementById("callback-verdict-title").textContent = title;
  document.getElementById("callback-verdict-detail").textContent = detail;
}

function updateCallbackMetrics(metrics = {}) {
  const values = {
    "callback-incumbent": Number.isFinite(metrics.incumbent) ? Math.round(metrics.incumbent).toLocaleString() : null,
    "callback-bound": Number.isFinite(metrics.bound) ? Math.round(metrics.bound).toLocaleString() : null,
    "callback-gap": Number.isFinite(metrics.gap) ? `${(metrics.gap * 100).toFixed(2)}%` : null,
    "callback-nodes": Number.isFinite(metrics.nodes) ? Math.round(metrics.nodes).toLocaleString() : null,
    "callback-elapsed": Number.isFinite(metrics.elapsed) ? `${metrics.elapsed.toFixed(1)} s` : null,
  };
  for (const [id, text] of Object.entries(values)) if (text !== null) document.getElementById(id).textContent = text;
  if (Number.isFinite(metrics.incumbent) || Number.isFinite(metrics.bound)) {
    callbackHistory.push(metrics);
    if (callbackHistory.length > 180) callbackHistory.shift();
    renderCallbackProgress(document.getElementById("callback-progress-viz"), callbackHistory);
  }
}

function resetCallbackDisplay() {
  callbackHistory = [];
  callbackGraph = { size: 0, points: [], route: [] };
  for (const id of ["callback-incumbent", "callback-bound", "callback-gap", "callback-nodes", "callback-elapsed"]) {
    document.getElementById(id).textContent = "--";
  }
  document.getElementById("callback-progress-viz").replaceChildren(element("span", { text: "Waiting for callback events…" }));
  document.getElementById("callback-verdict").hidden = true;
  document.getElementById("callback-incumbent-label").textContent = "SHORTEST TOUR";
  document.getElementById("callback-bound-label").textContent = "LOWER BOUND";
  document.getElementById("callback-incumbent-box").classList.remove("proven");
  document.getElementById("callback-bound-box").classList.remove("proven");
  document.getElementById("callback-tour-title").textContent = "Current shortest tour";
  document.getElementById("callback-progress-title").textContent = "Tour length and lower bound";
}

function ensureCallbackWorker() {
  if (callbackWorker) return;
  callbackWorker = new Worker(`callback-worker.js?api=extended-1&fresh=${Date.now()}`);
  const state = document.getElementById("callback-state");
  callbackWorker.addEventListener("message", ({ data }) => {
    if (data.type === "phase") {
      state.textContent = data.message;
      if (data.size) {
        callbackGraph = { size: data.size, points: data.points || [], route: [] };
        renderCallbackGraph(document.getElementById("callback-graph-viz"), callbackGraph.size, callbackGraph.points);
      }
      return;
    }
    if (data.type === "ready") {
      callbackModelReady = true;
      if (callbackStartAfterReset) {
        callbackStartAfterReset = false;
        runCallbackSearch();
      } else {
        state.dataset.state = "ready";
        state.textContent = "Model rebuilt and ready to search.";
        setCallbackControls("paused");
      }
      return;
    }
    if (data.type === "metrics") {
      updateCallbackMetrics(data.metrics);
      return;
    }
    if (data.type === "incumbent") {
      callbackGraph.route = data.route || [];
      renderCallbackGraph(document.getElementById("callback-graph-viz"), callbackGraph.size, callbackGraph.points, callbackGraph.route);
      if (Number.isFinite(data.value)) document.getElementById("callback-incumbent").textContent = Math.round(data.value).toLocaleString();
      updateCallbackMetrics(data.metrics);
      state.textContent = `${data.source === "initial tour" ? "Seeded" : "Improved"} tour: ${Math.round(data.value).toLocaleString()} distance units.`;
      return;
    }
    if (data.type === "complete") {
      callbackRunning = false;
      callbackGraph.route = data.route || callbackGraph.route;
      renderCallbackGraph(document.getElementById("callback-graph-viz"), callbackGraph.size, callbackGraph.points, callbackGraph.route);
      document.getElementById("callback-incumbent").textContent = Math.round(data.value).toLocaleString();
      updateCallbackMetrics(data.metrics);
      if (callbackRestartPending) {
        callbackRestartPending = false;
        resetCallbackSearch(true, true);
        return;
      }
      state.dataset.state = "ready";
      if (data.status === "optimal") {
        const objective = Math.round(data.value).toLocaleString();
        state.textContent = `Optimality proved: tour and lower bound both equal ${objective}.`;
        setCallbackVerdict("optimal", "Optimal tour proven", `HiGHS closed the MIP gap. No shorter feasible tour exists below the proven bound of ${objective}.`);
        document.getElementById("callback-incumbent-label").textContent = "OPTIMAL TOUR";
        document.getElementById("callback-bound-label").textContent = "PROVEN BOUND";
        document.getElementById("callback-incumbent-box").classList.add("proven");
        document.getElementById("callback-bound-box").classList.add("proven");
        document.getElementById("callback-tour-title").textContent = "Proven optimal tour";
        document.getElementById("callback-progress-title").textContent = "Optimality gap closed";
        setCallbackControls("finished");
      } else {
        state.textContent = data.status === "interrupted"
          ? "Search paused with status interrupted. Resume keeps this model and incumbent."
          : `Search ended with status ${data.status}.`;
        setCallbackVerdict("paused", data.status === "interrupted" ? "Search paused" : `Search ended: ${data.status}`, "The displayed tour is feasible, but optimality has not been proved. Resume to continue from this retained model.");
        setCallbackControls("paused");
      }
      return;
    }
    if (data.type === "error") {
      state.dataset.state = "error";
      state.textContent = data.error;
      callbackRunning = false;
      setCallbackControls(callbackModelReady ? "paused" : "initial");
    }
  });
  callbackWorker.addEventListener("error", () => {
    state.dataset.state = "error";
    state.textContent = "The callback Worker failed to load.";
    callbackWorker = undefined;
    callbackModelReady = false;
    callbackRunning = false;
    setCallbackControls("initial");
  });
}

function runCallbackSearch() {
  ensureCallbackWorker();
  callbackStopFlag = sharedCallbackStop ? new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT)) : undefined;
  callbackRunning = true;
  const state = document.getElementById("callback-state");
  state.dataset.state = "solving";
  state.textContent = "Starting the retained model…";
  setCallbackVerdict("running", "Search in progress", "The shortest tour is only an incumbent until it meets the proven lower bound.");
  setCallbackControls("running");
  callbackWorker.postMessage({
    action: "run",
    autoStopSeconds: Number(document.getElementById("callback-auto-stop")?.value),
    stopBuffer: callbackStopFlag?.buffer,
  });
}

function resetCallbackSearch(startAfterReset, restarting = false) {
  ensureCallbackWorker();
  resetCallbackDisplay();
  callbackModelReady = false;
  callbackStartAfterReset = startAfterReset;
  const state = document.getElementById("callback-state");
  state.dataset.state = "solving";
  state.textContent = "Building a fresh model…";
  setCallbackControls(restarting ? "restarting" : "building");
  callbackWorker.postMessage({
    action: "reset",
    size: Number(document.getElementById("callback-size")?.value),
  });
}

function requestCallbackInterrupt(restart) {
  const state = document.getElementById("callback-state");
  if (callbackWorker && callbackStopFlag) {
    callbackRestartPending = restart;
    Atomics.store(callbackStopFlag, 0, 1);
    Atomics.notify(callbackStopFlag, 0);
    setCallbackControls(restart ? "restarting" : "stopping");
    state.textContent = restart
      ? "Stopping the current run before rebuilding from scratch…"
      : "Interruption requested; waiting for the next MIP callback checkpoint…";
    setCallbackVerdict("paused", restart ? "Restart pending" : "Stopping search", "Waiting for HiGHS to reach a MIP interruption checkpoint.");
    return;
  }
  callbackWorker?.terminate();
  callbackWorker = undefined;
  callbackModelReady = false;
  callbackRunning = false;
  if (restart) resetCallbackSearch(true, true);
  else {
    setCallbackControls("initial");
    state.dataset.state = "ready";
    state.textContent = "Stopped by terminating the Worker because shared-memory interruption is unavailable. Model state was lost.";
  }
}

document.getElementById("callback-start")?.addEventListener("click", () => {
  if (callbackModelReady) runCallbackSearch();
  else resetCallbackSearch(true);
});
document.getElementById("callback-stop")?.addEventListener("click", () => {
  if (callbackRunning) requestCallbackInterrupt(false);
});
document.getElementById("callback-restart")?.addEventListener("click", () => {
  if (callbackRunning) requestCallbackInterrupt(true);
  else resetCallbackSearch(true, true);
});

/* ══════════════════════════════════════════
   TAB 5: Ranging
   ══════════════════════════════════════════ */

const rangingOutput = document.getElementById("ranging-output");
const rangingLP = document.getElementById("ranging-lp");
const rangingTiming = document.getElementById("ranging-timing");
const rangingVisualBars = document.getElementById("ranging-visual-bars");
const rangingStatus = document.getElementById("ranging-status");
const rangingStability = document.getElementById("ranging-stability");

async function solveRangingModel() {
  const revision = beginLiveSolve("ranging");
  setOutput(rangingOutput, "Solving…", "");
  setStatus(rangingStatus, "solving");
  const source = rangingLP?.value || "";
  const parsed = parseLpModel(source);
  const data = await send("doRanging", { problem: source });
  if (liveRevisions.get("ranging") !== revision) return;
  if (data.error) {
    finishLiveSolve("ranging", revision, data.error, true);
    setOutput(rangingOutput, data.error, "error");
    setStatus(rangingStatus, "error");
  } else if (data.note) {
    finishLiveSolve("ranging", revision, data.note, true);
    setOutput(rangingOutput, `Model status: ${data.modelStatus}\n${data.note}`);
    setStatus(rangingStatus, data.modelStatus);
    setStatus(rangingStability, "unavailable");
  } else {
    finishLiveSolve("ranging", revision, `Sensitivity ranges updated in ${data.elapsed} ms.`);
    setTiming(rangingTiming, data.elapsed);
    setStatus(rangingStatus, data.modelStatus);
    setStatus(rangingStability, "ranges available");

    renderRangingViz(rangingVisualBars, data, parsed);
    setJson(rangingOutput, data);
  }
}

/* ══════════════════════════════════════════
   TAB 6: Options & Hooks
   ══════════════════════════════════════════ */

const optsBody = document.getElementById("opts-body");
const optsSearch = document.getElementById("opts-search");
const optsCount = document.getElementById("opts-count");
const optDetail = document.getElementById("opt-detail");
let allOptions = [];
let optionCache = new Map();

async function loadOptions() {
  setOutput(optDetail, "Loading options…", "placeholder");
  const data = await send("optionsList");
  if (data.error) {
    setOutput(optDetail, data.error, "error");
    return;
  }
  allOptions = data.rows || [];
  optionCache.clear();
  for (const r of allOptions) optionCache.set(r.name, r);
  renderOptionsTable(allOptions);
}

function renderOptionsTable(rows) {
  if (!optsBody) return;
  optsBody.replaceChildren(...rows.map((row) => element("tr", { style: { cursor: "pointer" } },
    element("td", {}, element("code", { text: row.name, style: { fontSize: "0.8rem" } })),
    element("td", { text: row.type }),
    element("td", { text: JSON.stringify(row.current) }),
    element("td", { text: JSON.stringify(row.default) }),
  )));
  if (optsCount) optsCount.textContent = `${rows.length} options`;
}

optsSearch?.addEventListener("input", () => {
  const q = optsSearch.value.toLowerCase();
  const filtered = q ? allOptions.filter((r) => r.name.toLowerCase().includes(q)) : allOptions;
  renderOptionsTable(filtered);
});

optsBody?.addEventListener("click", (e) => {
  const row = e.target.closest("tr");
  if (!row) return;
  const name = row.querySelector("code")?.textContent;
  if (name) {
    const nameInput = document.getElementById("opt-name");
    if (nameInput) nameInput.value = name;
    document.getElementById("opt-get")?.click();
  }
});

document.getElementById("opt-get")?.addEventListener("click", async () => {
  const name = document.getElementById("opt-name")?.value.trim();
  if (!name) return;
  const cached = optionCache.get(name);
  if (cached) {
    setJson(optDetail, cached);
    return;
  }
  setOutput(optDetail, "Fetching…", "");
  const data = await send("optionsDescribe", { name });
  if (data.error) {
    setOutput(optDetail, data.error, "error");
  } else {
    setJson(optDetail, data);
  }
});

document.getElementById("opt-set")?.addEventListener("click", async () => {
  const name = document.getElementById("opt-name")?.value.trim();
  const rawVal = document.getElementById("opt-value")?.value.trim();
  if (!name || rawVal === undefined || rawVal === "") return;

  let value;
  if (rawVal === "true") value = true;
  else if (rawVal === "false") value = false;
  else if (rawVal === "inf" || rawVal === "infinity") value = Infinity;
  else if (rawVal === "-inf" || rawVal === "-infinity") value = -Infinity;
  else if (!isNaN(Number(rawVal))) value = Number(rawVal);
  else value = rawVal;

  setOutput(optDetail, "Setting…", "");
  const data = await send("optionsSet", { name, value });
  if (data.error) {
    setOutput(optDetail, data.error, "error");
  } else {
    optionCache.set(name, data);
    const idx = allOptions.findIndex((r) => r.name === name);
    if (idx >= 0) allOptions[idx].current = data.current;
    setJson(optDetail, data);
    optsSearch?.dispatchEvent(new Event("input"));
  }
});

document.getElementById("opt-reset-all")?.addEventListener("click", async () => {
  await send("optionsReset");
  optionCache.clear();
  loadOptions();
});

/* ══════════════════════════════════════════
   TAB 7: IIS
   ══════════════════════════════════════════ */

const iisOutput = document.getElementById("iis-output");
const iisLP = document.getElementById("iis-lp");
const iisTiming = document.getElementById("iis-timing");
const iisVisualTags = document.getElementById("iis-visual-tags");
const iisStatus = document.getElementById("iis-status");

async function solveIisModel() {
  const revision = beginLiveSolve("iis");
  setOutput(iisOutput, "Computing IIS…", "");
  setStatus(iisStatus, "analyzing");
  const source = iisLP?.value || "";
  const parsed = parseLpModel(source);
  const data = await send("doIis", { problem: source });
  if (liveRevisions.get("iis") !== revision) return;
  if (data.error) {
    finishLiveSolve("iis", revision, data.error, true);
    setOutput(iisOutput, data.error, "error");
    setStatus(iisStatus, "error");
  } else if (data.iis) {
    finishLiveSolve("iis", revision, `Conflict analysis updated in ${data.elapsed} ms.`);
    setTiming(iisTiming, data.elapsed);
    setStatus(iisStatus, data.modelStatus);
    const rendered = renderIisPlot(iisVisualTags, parsed, data.iis);
    if (!rendered && iisVisualTags) iisVisualTags.replaceChildren(element("div", { class: "iis-clear" },
      element("strong", { text: "No definite conflict set was returned." }),
      element("span", { text: "HiGHS proved infeasibility, but did not return enough members to construct an explanation." })));
    setJson(iisOutput, data);
  } else {
    finishLiveSolve("iis", revision, "The edited model is feasible; there is no IIS to display.");
    setStatus(iisStatus, data.modelStatus);
    if (iisVisualTags) iisVisualTags.replaceChildren(element("div", {
      class: "iis-clear",
      text: "The model is feasible, so there is no irreducible infeasible subsystem to show.",
    }));
    setJson(iisOutput, data);
  }
}


/* ══════════════════════════════════════════
   TAB 8: Model I/O
   ══════════════════════════════════════════ */

const ioOutput = document.getElementById("io-output");
const ioInput = document.getElementById("io-input");
const ioTiming = document.getElementById("io-timing");
const ioStatusVal = document.getElementById("io-status-val");
const ioViz = document.getElementById("io-viz");

ioInput?.addEventListener("input", () => renderIoViz(ioViz, ioInput.value));

document.getElementById("io-load")?.addEventListener("click", async () => {
  setOutput(ioOutput, "Loading…", "");
  const data = await send("ioLoad", { problem: ioInput?.value || "" });
  if (data.error) {
    setOutput(ioOutput, data.error, "error");
    if (ioStatusVal) ioStatusVal.textContent = "ERROR";
  } else {
    setOutput(ioOutput, data.message);
    if (ioStatusVal) ioStatusVal.textContent = "LOADED";
  }
});

document.getElementById("io-export")?.addEventListener("click", async () => {
  const data = await send("ioExport");
  if (data.error) {
    setOutput(ioOutput, data.error, "error");
  } else {
    setOutput(ioOutput, data.lp);
    if (ioStatusVal) ioStatusVal.textContent = "EXPORTED";
  }
});

document.getElementById("io-solve")?.addEventListener("click", async () => {
  setOutput(ioOutput, "Solving…", "");
  const loaded = await send("ioLoad", { problem: ioInput?.value || "" });
  if (loaded.error) {
    setOutput(ioOutput, loaded.error, "error");
    if (ioStatusVal) ioStatusVal.textContent = "ERROR";
    return;
  }
  const data = await send("ioSolve");
  if (data.error) {
    setOutput(ioOutput, data.error, "error");
    if (ioStatusVal) ioStatusVal.textContent = "ERROR";
  } else {
    setTiming(ioTiming, data.elapsed);
    if (ioStatusVal) ioStatusVal.textContent = (data.modelStatus || "OPTIMAL").toUpperCase();
    const names = parseLpModel(ioInput?.value || "").variables;
    setOutput(ioOutput,
      `Status: ${data.modelStatus}\nObjective: ${data.objective}\n\n` +
      `Primal:\n${data.primal.map((v, i) => `  ${names[i] || `x${i}`} = ${v.toFixed(6)}`).join("\n")}`
    );
  }
});

/* ── Initial Kickoff ── */

enhanceSyntaxEditors();
buildMatrixExplorer = createSparseExplorer(
  document.getElementById("build-matrix-explorer"),
  constraintExplorerConfig("production", getExample("production")),
);
qpMatrixExplorer = createSparseExplorer(
  document.getElementById("qp-matrix-explorer"),
  hessianExplorerConfig(),
);
if (ioInput) renderIoViz(ioViz, ioInput.value);

const liveSolvers = {
  production: solveBuildModel,
  diet: () => solveStaticBuildExample("diet"),
  transport: () => solveStaticBuildExample("transport"),
  knapsack: solveMipModel,
  facility: solveFacilityModel,
  qp: solveQpModel,
  grid: solveGridModel,
  ranging: solveRangingModel,
  iis: solveIisModel,
};
const liveTimers = new Map();

function scheduleLiveSolve(key) {
  clearTimeout(liveTimers.get(key));
  liveTimers.set(key, setTimeout(() => runLiveSolve(key), 5));
}

async function runLiveSolve(key) {
  try {
    const solve = liveSolvers[key];
    if (!solve) throw new Error(`Unknown live example: ${key}`);
    await solve();
  } catch (error) {
    const revision = liveRevisions.get(key);
    finishLiveSolve(key, revision, error instanceof Error ? error.message : String(error), true);
    console.error(`Failed to update ${key}:`, error);
  }
}

for (const story of document.querySelectorAll("[data-live-example]")) {
  const key = story.dataset.liveExample;
  if (!liveSolvers[key]) throw new Error(`No solver registered for data-live-example="${key}"`);
  story.addEventListener("input", () => scheduleLiveSolve(key));
}
rangingLP?.addEventListener("input", () => scheduleLiveSolve("ranging"));
iisLP?.addEventListener("input", () => scheduleLiveSolve("iis"));

(async function initializeDemo() {
  if (defaultLP) await solveLPFormat();
  for (const key of ["production", "diet", "transport", "knapsack", "facility", "qp", "grid", "ranging", "iis"]) {
    await runLiveSolve(key);
  }
  await loadOptions();
})();
