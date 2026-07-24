import { send } from "../worker-client.js";
import { setOutput, setTiming } from "../ui.js";
import { parseLpModel, renderIoViz } from "../visualizations.js";

const output = document.getElementById("io-output");
const input = document.getElementById("io-input");
const timing = document.getElementById("io-timing");
const status = document.getElementById("io-status-val");
const visualization = document.getElementById("io-viz");

export function initializeModelIoPanel() {
  input?.addEventListener("input", () => renderIoViz(visualization, input.value));
  document.getElementById("io-load")?.addEventListener("click", async () => {
    setOutput(output, "Loading…", "");
    const data = await send("ioLoad", { problem: input?.value || "" });
    if (data.error) {
      setOutput(output, data.error, "error");
      if (status) status.textContent = "ERROR";
    } else {
      setOutput(output, data.message);
      if (status) status.textContent = "LOADED";
    }
  });
  document.getElementById("io-export")?.addEventListener("click", async () => {
    const data = await send("ioExport");
    if (data.error) setOutput(output, data.error, "error");
    else {
      setOutput(output, data.lp);
      if (status) status.textContent = "EXPORTED";
    }
  });
  document.getElementById("io-solve")?.addEventListener("click", async () => {
    setOutput(output, "Solving…", "");
    const loaded = await send("ioLoad", { problem: input?.value || "" });
    if (loaded.error) {
      setOutput(output, loaded.error, "error");
      if (status) status.textContent = "ERROR";
      return;
    }
    const data = await send("ioSolve");
    if (data.error) {
      setOutput(output, data.error, "error");
      if (status) status.textContent = "ERROR";
      return;
    }
    setTiming(timing, data.elapsed);
    if (status) status.textContent = (data.modelStatus || "OPTIMAL").toUpperCase();
    const names = parseLpModel(input?.value || "").variables;
    setOutput(output,
      `Status: ${data.modelStatus}\nObjective: ${data.objective}\n\n` +
      `Primal:\n${data.primal.map((value, index) => `  ${names[index] || `x${index}`} = ${value.toFixed(6)}`).join("\n")}`
    );
  });
  if (input) renderIoViz(visualization, input.value);
}
