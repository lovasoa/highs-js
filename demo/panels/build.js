import { send } from "../worker-client.js";
import { denseToCSC, getExample } from "../model-data.js";
import { element, renderProgressBars, setOutput, setStatus, setTiming } from "../ui.js";
import {
  constraintExplorerConfig,
  createSparseExplorer,
  renderDietViz,
  renderProductionViz,
  renderTransportViz,
} from "../visualizations.js";
import { beginLiveSolve, finishLiveSolve, isLiveSolveCurrent } from "../live-examples.js";

const buildOutput = document.getElementById("build-output");
const buildTiming = document.getElementById("build-timing");
const buildObjVal = document.getElementById("build-obj-val");
const buildVisualBars = document.getElementById("build-visual-bars");
const buildStatus = document.getElementById("build-status");
let matrixExplorer;

function buildPayload(example) {
  const csc = denseToCSC(example.A, example.costs.length);
  return {
    colCost: example.costs,
    colLower: example.lowers,
    colUpper: example.uppers,
    rowLower: example.rowLowers,
    rowUpper: example.rowUppers,
    sense: example.sense,
    starts: Array.from(csc.starts),
    indices: Array.from(csc.indices),
    values: Array.from(csc.values),
  };
}

export async function solveBuildModel() {
  const revision = beginLiveSolve("production");
  setOutput(buildOutput, "Solving…", "");
  setStatus(buildStatus, "solving");
  const example = getExample("production");
  matrixExplorer?.setConfig(constraintExplorerConfig("production", example));
  const data = await send("buildSolve", buildPayload(example));

  if (!isLiveSolveCurrent("production", revision)) return;
  if (data.error) {
    finishLiveSolve("production", revision, data.error, true);
    setOutput(buildOutput, data.error, "error");
    if (buildObjVal) buildObjVal.textContent = "ERROR";
    setStatus(buildStatus, "error");
    return;
  }

  finishLiveSolve("production", revision, `Optimal mix updated in ${data.elapsed} ms.`);
  setTiming(buildTiming, data.elapsed);
  if (buildObjVal) buildObjVal.textContent = data.objective?.toFixed(4);
  setStatus(buildStatus, data.modelStatus);
  renderProgressBars(buildVisualBars, data.primal.map((value, index) => ({ name: example.names[index], val: value })));
  renderProductionViz(document.getElementById("production-viz"), example, data.primal, data.objective);
  setOutput(buildOutput,
    `Status: ${data.modelStatus} (${data.elapsed} ms)\n` +
    `Objective: ${data.objective}\n\n` +
    `Primal values:\n${data.primal.map((value, index) => `  ${example.names[index]} = ${value.toFixed(6)}`).join("\n")}\n\n` +
    `Reduced costs:\n${data.dual.map((value, index) => `  ${example.names[index]} = ${value.toFixed(6)}`).join("\n")}`
  );
}

export async function solveStaticBuildExample(key) {
  const revision = beginLiveSolve(key);
  const example = getExample(key);
  const data = await send("buildSolve", buildPayload(example));
  if (!isLiveSolveCurrent(key, revision)) return;
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

export function initializeBuildPanel() {
  matrixExplorer = createSparseExplorer(
    document.getElementById("build-matrix-explorer"),
    constraintExplorerConfig("production", getExample("production")),
  );
}
