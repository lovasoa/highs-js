import { enhanceSyntaxEditors } from "./ui.js";
import {
  bindLiveExampleInputs,
  registerLiveExamples,
  runLiveSolve,
} from "./live-examples.js";

const examples = [
  "solve-lp-text",
  "build-sparse-models",
  "mixed-integer-models",
  "portfolio-quadratic-program",
  "grid-multiple-objectives",
  "traveling-salesperson-callbacks",
  "lp-sensitivity-analysis",
  "inspect-solver-options",
  "diagnose-infeasibility",
  "import-export-model",
];

const templates = await Promise.all(examples.map(async (name) => {
  const response = await fetch(`${name}/ui.template.html`);
  if (!response.ok) throw new Error(`Could not load the ${name} example (${response.status}).`);
  return response.text();
}));
document.getElementById("example-panels").innerHTML = templates.join("\n");

const [
  { initializeLpPanel },
  { initializeBuildPanel, solveBuildModel, solveStaticBuildExample },
  { solveFacilityModel, solveMipModel },
  { initializeQpPanel, solveQpModel },
  { initializeMultiobjectivePanel, solveGridModel },
  { initializeCallbacksPanel },
  { initializeRangingPanel, solveRangingModel },
  { initializeOptionsPanel, loadOptions },
  { initializeIisPanel, solveIisModel },
  { initializeModelIoPanel },
] = await Promise.all(examples.map((name) => import(`./${name}/ui.js`)));

await import("./navigation.js");

enhanceSyntaxEditors();
initializeBuildPanel();
initializeQpPanel();
initializeMultiobjectivePanel();
initializeCallbacksPanel();
initializeRangingPanel();
initializeOptionsPanel();
initializeIisPanel();
initializeModelIoPanel();

registerLiveExamples({
  production: solveBuildModel,
  diet: () => solveStaticBuildExample("diet"),
  transport: () => solveStaticBuildExample("transport"),
  knapsack: solveMipModel,
  facility: solveFacilityModel,
  qp: solveQpModel,
  grid: solveGridModel,
  ranging: solveRangingModel,
  iis: solveIisModel,
});
bindLiveExampleInputs();

await initializeLpPanel();
for (const key of ["production", "diet", "transport", "knapsack", "facility", "qp", "grid", "ranging", "iis"]) {
  await runLiveSolve(key);
}
await loadOptions();

// Template insertion happens after the browser's initial hash scroll.
document.getElementById(location.hash.slice(1))?.scrollIntoView();
