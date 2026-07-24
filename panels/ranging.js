import { send } from "../worker-client.js";
import { setJson, setOutput, setStatus, setTiming } from "../ui.js";
import { parseLpModel, renderRangingViz } from "../visualizations.js";
import { beginLiveSolve, finishLiveSolve, isLiveSolveCurrent, scheduleLiveSolve } from "../live-examples.js";

const output = document.getElementById("ranging-output");
const input = document.getElementById("ranging-lp");
const timing = document.getElementById("ranging-timing");
const visualBars = document.getElementById("ranging-visual-bars");
const status = document.getElementById("ranging-status");
const stability = document.getElementById("ranging-stability");

export async function solveRangingModel() {
  const revision = beginLiveSolve("ranging");
  setOutput(output, "Solving…", "");
  setStatus(status, "solving");
  const source = input?.value || "";
  const parsed = parseLpModel(source);
  const data = await send("doRanging", { problem: source });
  if (!isLiveSolveCurrent("ranging", revision)) return;
  if (data.error) {
    finishLiveSolve("ranging", revision, data.error, true);
    setOutput(output, data.error, "error");
    setStatus(status, "error");
  } else if (data.note) {
    finishLiveSolve("ranging", revision, data.note, true);
    setOutput(output, `Model status: ${data.modelStatus}\n${data.note}`);
    setStatus(status, data.modelStatus);
    setStatus(stability, "unavailable");
  } else {
    finishLiveSolve("ranging", revision, `Sensitivity ranges updated in ${data.elapsed} ms.`);
    setTiming(timing, data.elapsed);
    setStatus(status, data.modelStatus);
    setStatus(stability, "ranges available");
    renderRangingViz(visualBars, data, parsed);
    setJson(output, data);
  }
}

export function initializeRangingPanel() {
  input?.addEventListener("input", () => scheduleLiveSolve("ranging"));
}
