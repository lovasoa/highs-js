import { send } from "../worker-client.js";
import { readNumber } from "../model-data.js";
import { renderGridDispatch } from "../visualizations.js";
import { beginLiveSolve, finishLiveSolve, isLiveSolveCurrent } from "../live-examples.js";

export async function solveGridModel() {
  const revision = beginLiveSolve("grid");
  const mode = document.getElementById("grid-mode")?.value || "lexicographic";
  const payload = {
    mode,
    gasCapacity: readNumber("grid-gas-capacity", 35),
    carbonTolerance: readNumber("grid-carbon-tolerance", 3),
    reliabilityWeight: readNumber("grid-reliability-weight", 119),
    carbonWeight: readNumber("grid-carbon-weight", 100),
  };
  if (Object.values(payload).some((value) => typeof value === "number" && (!Number.isFinite(value) || value < 0))) {
    finishLiveSolve("grid", revision, "Grid policy values must be non-negative numbers.", true);
    return;
  }
  const data = await send("multiObjectiveGrid", payload);
  if (!isLiveSolveCurrent("grid", revision)) return;
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

function updateModeStory() {
  const lexicographic = document.getElementById("grid-mode")?.value === "lexicographic";
  document.getElementById("grid-story-strict").hidden = !lexicographic;
  document.getElementById("grid-story-blended").hidden = lexicographic;
}

export function initializeMultiobjectivePanel() {
  document.getElementById("grid-mode")?.addEventListener("input", updateModeStory);
  updateModeStory();
}
