import { test, expect, editLiveInput, openMainDemo, visit, waitForLiveSolve } from "./demo-fixtures.mjs";

async function solutionSignature(page) {
  return Promise.all(["#grid-unserved", "#grid-emissions", "#grid-cost"].map(async (selector) =>
    page.locator(selector).textContent()));
}

async function expectChangedSolution(page, input, value, baseline) {
  await editLiveInput(page, input, value, "grid");
  expect(await solutionSignature(page)).not.toEqual(baseline);
}

test("re-solves strict-priority and blended objective policies", async ({ page }) => {
  await openMainDemo(page);
  await waitForLiveSolve(page, "grid");
  await visit(page, "Decision priorities", "#panel-multiobjective");

  const gasCapacity = page.getByRole("spinbutton", { name: "Maximum gas generation" });
  const carbonTolerance = page.getByRole("spinbutton", { name: "Permitted carbon degradation" });
  await expect(carbonTolerance).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Reliability objective weight" })).toBeHidden();
  const strictBaseline = await solutionSignature(page);
  await expectChangedSolution(page, gasCapacity, 30, strictBaseline);
  await editLiveInput(page, gasCapacity, 35, "grid");
  await expectChangedSolution(page, gasCapacity, 40, strictBaseline);
  await editLiveInput(page, gasCapacity, 35, "grid");
  await expectChangedSolution(page, carbonTolerance, 2, strictBaseline);
  await editLiveInput(page, carbonTolerance, 3, "grid");
  await expectChangedSolution(page, carbonTolerance, 4, strictBaseline);
  await editLiveInput(page, carbonTolerance, 3, "grid");

  const policy = page.getByRole("combobox", { name: "Objective policy" });
  const revision = Number(await page.locator("#grid-state").getAttribute("data-revision") || 0);
  await policy.selectOption("blended");
  await waitForLiveSolve(page, "grid", revision);
  await expect(carbonTolerance).toBeHidden();
  const reliabilityWeight = page.getByRole("spinbutton", { name: "Reliability objective weight" });
  const carbonWeight = page.getByRole("spinbutton", { name: "Carbon objective weight" });
  await expect(reliabilityWeight).toBeVisible();
  const blendedBaseline = await solutionSignature(page);
  await expectChangedSolution(page, gasCapacity, 30, blendedBaseline);
  await editLiveInput(page, gasCapacity, 35, "grid");
  await expectChangedSolution(page, gasCapacity, 40, blendedBaseline);
  await editLiveInput(page, gasCapacity, 35, "grid");
  await expectChangedSolution(page, reliabilityWeight, 114, blendedBaseline);
  await editLiveInput(page, reliabilityWeight, 119, "grid");
  await expectChangedSolution(page, reliabilityWeight, 124, blendedBaseline);
  await editLiveInput(page, reliabilityWeight, 119, "grid");
  await expectChangedSolution(page, carbonWeight, 75, blendedBaseline);
  await editLiveInput(page, carbonWeight, 100, "grid");
  await expectChangedSolution(page, carbonWeight, 125, blendedBaseline);
});
