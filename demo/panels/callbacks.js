import { element } from "../ui.js";
import { renderCallbackGraph, renderCallbackProgress } from "../visualizations.js";

let callbackWorker;
let callbackStopFlag;
let callbackGraph = { size: 0, points: [], route: [] };
let callbackHistory = [];
let callbackModelReady = false;
let callbackRunning = false;
let callbackStartAfterReset = false;
let callbackRestartPending = false;
let callbackChartFrame;
let callbackChartClock;
let callbackChartRenderedAt = 0;
const sharedCallbackStop = window.crossOriginIsolated && typeof SharedArrayBuffer === "function";

function animateCallbackChart() {
  if (callbackChartFrame || !callbackRunning) return;
  const tick = (now) => {
    callbackChartFrame = undefined;
    if (!callbackRunning) return;
    if (callbackChartClock && now - callbackChartRenderedAt >= 1000 / 30) {
      const elapsed = callbackChartClock.elapsed + (now - callbackChartClock.receivedAt) / 1000;
      renderCallbackProgress(document.getElementById("callback-progress-viz"), callbackHistory, elapsed);
      callbackChartRenderedAt = now;
    }
    callbackChartFrame = requestAnimationFrame(tick);
  };
  callbackChartFrame = requestAnimationFrame(tick);
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
  if (Number.isFinite(metrics.elapsed)) callbackChartClock = { elapsed: metrics.elapsed, receivedAt: performance.now() };
  if (Number.isFinite(metrics.incumbent) || Number.isFinite(metrics.bound)) {
    callbackHistory.push(metrics);
    if (callbackHistory.length > 180) callbackHistory.shift();
    renderCallbackProgress(document.getElementById("callback-progress-viz"), callbackHistory);
  }
}

function resetCallbackDisplay() {
  callbackHistory = [];
  callbackChartClock = undefined;
  callbackChartRenderedAt = 0;
  callbackGraph = { size: 0, points: [], route: [] };
  for (const id of ["callback-incumbent", "callback-bound", "callback-gap", "callback-nodes", "callback-elapsed"]) document.getElementById(id).textContent = "--";
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
  if (callbackChartClock) callbackChartClock.receivedAt = performance.now();
  animateCallbackChart();
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
  callbackWorker.postMessage({ action: "reset", size: Number(document.getElementById("callback-size")?.value) });
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

export function initializeCallbacksPanel() {
  const note = document.getElementById("callback-interrupt-note");
  if (note) note.innerHTML = sharedCallbackStop
    ? `“Stop now” writes to a <code>SharedArrayBuffer</code>. The blocked solver Worker reads that atomic flag inside <code>mipInterrupt</code> and calls <code>event.interrupt()</code>. Resume runs the same native model with its incumbent; only “Restart from scratch” disposes and rebuilds it.`
    : `Cross-origin isolation is unavailable, so “Stop now” falls back to terminating the dedicated Worker. On HTTPS, <code>coi-serviceworker</code> normally enables shared-memory callback interruption after its first automatic reload.`;
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
}
