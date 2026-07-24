import "./navigation.js";
import { enhanceSyntaxEditors } from "./ui.js";
import {
  bindLiveExampleInputs,
  registerLiveExamples,
  runLiveSolve,
} from "./live-examples.js";
import { initializeLpPanel } from "./panels/lp.js";
import { initializeBuildPanel, solveBuildModel, solveStaticBuildExample } from "./panels/build.js";
import { solveFacilityModel, solveMipModel } from "./panels/mip.js";
import { initializeQpPanel, solveQpModel } from "./panels/qp.js";
import { initializeMultiobjectivePanel, solveGridModel } from "./panels/multiobjective.js";
import { initializeCallbacksPanel } from "./panels/callbacks.js";
import { initializeRangingPanel, solveRangingModel } from "./panels/ranging.js";
import { initializeOptionsPanel, loadOptions } from "./panels/options.js";
import { initializeIisPanel, solveIisModel } from "./panels/iis.js";
import { initializeModelIoPanel } from "./panels/model-io.js";

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
