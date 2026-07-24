import { send } from "../worker-client.js";
import { buildFacilityPayload, getFacilityDefinition } from "../model-data.js";
import { element, setOutput, setStatus, setTiming } from "../ui.js";
import { renderFacilityViz, renderKnapsackViz } from "../visualizations.js";
import { beginLiveSolve, finishLiveSolve, isLiveSolveCurrent } from "../live-examples.js";

const mipOutput = document.getElementById("mip-output");
const mipCapacity = document.getElementById("mip-capacity");
const mipTiming = document.getElementById("mip-timing");
const mipValStat = document.getElementById("mip-val-stat");
const mipWeightStat = document.getElementById("mip-weight-stat");
const mipPackingTrack = document.getElementById("mip-packing-track");
const mipVisualGrid = document.getElementById("mip-visual-grid");
const mipStatus = document.getElementById("mip-status");
const mipGapStat = document.getElementById("mip-gap-stat");

export async function solveMipModel() {
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

  const starts = [0];
  const indices = [];
  const matrixValues = [];
  for (let index = 0; index < values.length; index++) {
    indices.push(0);
    matrixValues.push(weights[index]);
    starts.push(indices.length);
  }
  const data = await send("mipSolve", {
    colCost: Array.from(values),
    colLower: new Array(values.length).fill(0),
    colUpper: new Array(values.length).fill(1),
    rowLower: [-Infinity],
    rowUpper: [cap],
    sense: "maximize",
    starts,
    indices,
    values: matrixValues,
    integrality: new Array(values.length).fill("integer"),
  });

  if (!isLiveSolveCurrent("knapsack", revision)) return;
  if (data.error) {
    finishLiveSolve("knapsack", revision, data.error, true);
    setOutput(mipOutput, data.error, "error");
    setStatus(mipStatus, "error");
    return;
  }

  finishLiveSolve("knapsack", revision, `Best packing updated in ${data.elapsed} ms.`);
  setTiming(mipTiming, data.elapsed);
  if (mipValStat) mipValStat.textContent = `$${data.objective}`;
  setStatus(mipStatus, data.modelStatus);
  if (mipGapStat) mipGapStat.textContent = data.mipGap === undefined ? "--" : `${(data.mipGap * 100).toFixed(2)}%`;

  const selected = [];
  const packBlocks = [];
  let totalWeight = 0;
  for (let index = 0; index < values.length; index++) {
    if (data.primal[index] <= 0.5) continue;
    selected.push(`item ${index + 1} (v=${values[index]}, w=${weights[index]})`);
    totalWeight += weights[index];
    packBlocks.push(element("div", {
      class: "pack-block",
      style: { width: `${((weights[index] / cap) * 100).toFixed(1)}%` },
      title: `Item ${index + 1}: ${weights[index]}kg`,
      text: `Item ${index + 1} (${weights[index]}kg)`,
    }));
  }
  const remainingWeight = Math.max(0, cap - totalWeight);
  if (remainingWeight > 0) {
    packBlocks.push(element("div", {
      class: "pack-block empty",
      style: { width: `${((remainingWeight / cap) * 100).toFixed(1)}%` },
      text: `Empty (${remainingWeight}kg)`,
    }));
  }
  if (mipWeightStat) mipWeightStat.textContent = `${totalWeight} / ${cap} kg`;
  if (mipPackingTrack) mipPackingTrack.replaceChildren(...packBlocks);
  if (mipVisualGrid) renderKnapsackViz(mipVisualGrid, Array.from(values), Array.from(weights), data.primal, cap);
  setOutput(mipOutput,
    `Status: ${data.modelStatus} (${data.elapsed} ms)\n` +
    `Objective: ${data.objective}\n` +
    `MIP gap: ${data.mipGap !== undefined ? data.mipGap.toFixed(6) : "N/A"}\n` +
    `Total weight: ${totalWeight} / ${cap}\n\n` +
    `Selected items:\n${selected.length ? selected.join("\n") : "None"}`
  );
}

export async function solveFacilityModel() {
  const revision = beginLiveSolve("facility");
  const definition = getFacilityDefinition();
  const data = await send("mipSolve", buildFacilityPayload());
  const container = document.getElementById("facility-viz");
  if (!isLiveSolveCurrent("facility", revision)) return;
  if (data.error) {
    if (container) container.replaceChildren(element("div", { class: "viz-loading", text: data.error }));
    finishLiveSolve("facility", revision, data.error, true);
    return;
  }
  finishLiveSolve("facility", revision, `Opening plan updated in ${data.elapsed} ms.`);
  renderFacilityViz(container, definition, data.primal, data.objective);
}
