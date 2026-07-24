import { send } from "../worker-client.js";
import { denseToCSC, readNumber } from "../model-data.js";
import { setOutput, setStatus, setTiming } from "../ui.js";
import { createSparseExplorer, hessianExplorerConfig, renderPortfolioViz } from "../visualizations.js";
import { beginLiveSolve, finishLiveSolve, isLiveSolveCurrent } from "../live-examples.js";

const qpOutput = document.getElementById("qp-output");
const qpTargetReturn = document.getElementById("qp-target-return");
const qpTiming = document.getElementById("qp-timing");
const qpRiskStat = document.getElementById("qp-risk-stat");
const qpAllocationTrack = document.getElementById("qp-allocation-track");
const qpAllocationText = document.getElementById("qp-allocation-text");
const qpStatus = document.getElementById("qp-status");
let matrixExplorer;

function expectedReturns() {
  return ["tech", "energy", "bonds"].map((asset, index) => readNumber(`qp-return-${asset}`, [12, 8, 4][index]) / 100);
}

export async function solveQpModel() {
  const revision = beginLiveSolve("qp");
  setOutput(qpOutput, "Solving QP…", "");
  setStatus(qpStatus, "solving");
  const targetPct = parseFloat(qpTargetReturn?.value || "8.0") / 100.0;
  const returns = expectedReturns();
  if (!Number.isFinite(targetPct) || returns.some((value) => !Number.isFinite(value))) {
    finishLiveSolve("qp", revision, "Enter valid target and expected returns.", true);
    return;
  }
  matrixExplorer?.setConfig(hessianExplorerConfig(targetPct, returns));
  const csc = denseToCSC([[1, 1, 1], returns], 3);
  const data = await send("qpSolve", {
    colCost: [0, 0, 0],
    colLower: [0, 0, 0],
    colUpper: [1, 1, 1],
    rowLower: [1, targetPct],
    rowUpper: [1, Infinity],
    sense: "minimize",
    starts: Array.from(csc.starts),
    indices: Array.from(csc.indices),
    values: Array.from(csc.values),
    hessian: {
      format: "triangular",
      dimension: 3,
      starts: [0, 2, 3, 4],
      indices: [0, 1, 1, 2],
      values: [0.08, 0.02, 0.04, 0.01],
    },
  });

  if (!isLiveSolveCurrent("qp", revision)) return;
  if (data.error) {
    finishLiveSolve("qp", revision, data.error, true);
    setOutput(qpOutput, data.error, "error");
    setStatus(qpStatus, "error");
    return;
  }
  finishLiveSolve("qp", revision, `Minimum-risk portfolio updated in ${data.elapsed} ms.`);
  setTiming(qpTiming, data.elapsed);
  if (qpRiskStat) qpRiskStat.textContent = data.objective.toFixed(6);
  setStatus(qpStatus, data.modelStatus);
  const weights = data.primal.map((value) => (value * 100).toFixed(1));
  if (qpAllocationText) qpAllocationText.textContent = `Tech: ${weights[0]}% | Energy: ${weights[1]}% | Bonds: ${weights[2]}%`;
  if (qpAllocationTrack) renderPortfolioViz(qpAllocationTrack, data.primal, data.objective, targetPct);
  setOutput(qpOutput,
    `Status: ${data.modelStatus} (${data.elapsed} ms)\n` +
    `Minimized Variance (Risk): ${data.objective.toFixed(6)}\n\n` +
    `Optimal Asset Weights:\n` +
    `  Tech Growth (x0): ${(data.primal[0] * 100).toFixed(2)}%\n` +
    `  Energy Stock (x1): ${(data.primal[1] * 100).toFixed(2)}%\n` +
    `  Govt Bonds   (x2): ${(data.primal[2] * 100).toFixed(2)}%`
  );
}

export function initializeQpPanel() {
  matrixExplorer = createSparseExplorer(document.getElementById("qp-matrix-explorer"), hessianExplorerConfig());
  qpTargetReturn?.addEventListener("input", () => {
    const target = parseFloat(qpTargetReturn.value);
    if (Number.isFinite(target)) matrixExplorer?.setConfig(hessianExplorerConfig(target / 100, expectedReturns()));
  });
}
