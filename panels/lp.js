import { send } from "../worker-client.js";
import { setJson, setOutput, setStatus, setTiming } from "../ui.js";
import { parseLpModel, renderOptimalityMap } from "../visualizations.js";

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
    if (lpObjVal && objVal !== undefined) lpObjVal.textContent = objVal.toFixed(4);
    renderOptimalityMap(lpVisualBars, data.result, parseLpModel(lpInput.value));
  }
}

export async function initializeLpPanel() {
  document.getElementById("lp-solve")?.addEventListener("click", solveLPFormat);
  document.getElementById("lp-reset")?.addEventListener("click", () => {
    if (lpInput) {
      lpInput.value = defaultLP;
      lpInput.dispatchEvent(new Event("input"));
    }
  });
  lpInput?.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") solveLPFormat();
  });
  if (defaultLP) await solveLPFormat();
}
