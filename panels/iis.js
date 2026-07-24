import { send } from "../worker-client.js";
import { element, setJson, setOutput, setStatus, setTiming } from "../ui.js";
import { parseLpModel, renderIisPlot } from "../visualizations.js";
import { beginLiveSolve, finishLiveSolve, isLiveSolveCurrent, scheduleLiveSolve } from "../live-examples.js";

const output = document.getElementById("iis-output");
const input = document.getElementById("iis-lp");
const timing = document.getElementById("iis-timing");
const visualTags = document.getElementById("iis-visual-tags");
const status = document.getElementById("iis-status");

export async function solveIisModel() {
  const revision = beginLiveSolve("iis");
  setOutput(output, "Computing IIS…", "");
  setStatus(status, "analyzing");
  const source = input?.value || "";
  const parsed = parseLpModel(source);
  const data = await send("doIis", { problem: source });
  if (!isLiveSolveCurrent("iis", revision)) return;
  if (data.error) {
    finishLiveSolve("iis", revision, data.error, true);
    setOutput(output, data.error, "error");
    setStatus(status, "error");
  } else if (data.iis) {
    finishLiveSolve("iis", revision, `Conflict analysis updated in ${data.elapsed} ms.`);
    setTiming(timing, data.elapsed);
    setStatus(status, data.modelStatus);
    const rendered = renderIisPlot(visualTags, parsed, data.iis);
    if (!rendered && visualTags) visualTags.replaceChildren(element("div", { class: "iis-clear" },
      element("strong", { text: "No definite conflict set was returned." }),
      element("span", { text: "HiGHS proved infeasibility, but did not return enough members to construct an explanation." })));
    setJson(output, data);
  } else {
    finishLiveSolve("iis", revision, "The edited model is feasible; there is no IIS to display.");
    setStatus(status, data.modelStatus);
    if (visualTags) visualTags.replaceChildren(element("div", {
      class: "iis-clear",
      text: "The model is feasible, so there is no irreducible infeasible subsystem to show.",
    }));
    setJson(output, data);
  }
}

export function initializeIisPanel() {
  input?.addEventListener("input", () => scheduleLiveSolve("iis"));
}
