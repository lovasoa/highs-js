import { test, expect, editLiveInput, openMainDemo, visit, waitForLiveSolve } from "./demo-fixtures.mjs";

test("rebuilds persistent models from user input", async ({ page }) => {
  await openMainDemo(page);
  await waitForLiveSolve(page, "production");
  await visit(page, "Production planning", "#example-production");
  await editLiveInput(page, page.getByRole("spinbutton", { name: "Profit per chair" }), 90, "production");
  await expect(page.locator("#build-output")).toContainText(/Objective: 5400\b/);
});

test("solves valid knapsack edits and reports invalid input", async ({ page }) => {
  await openMainDemo(page);
  await waitForLiveSolve(page, "knapsack");
  await visit(page, "0/1 knapsack", "#example-knapsack");
  const capacity = page.getByRole("spinbutton", { name: "Knapsack capacity" });

  await editLiveInput(page, capacity, 1, "knapsack");
  await expect(page.locator("#mip-output")).toContainText(/Objective: 8\b/);
  await editLiveInput(page, capacity, "", "knapsack", "error");
});

test("updates the infeasibility explanation when the model changes", async ({ page }) => {
  await openMainDemo(page);
  await waitForLiveSolve(page, "iis");
  await visit(page, "Infeasibility", "#panel-iis");
  const model = page.locator("#iis-lp");

  await editLiveInput(page, model, "Minimize\n obj: x\nSubject To\n cap: x <= 1\nBounds\n 2 <= x\nEnd", "iis");
  await expect(page.locator("#iis-output")).toContainText(/infeasible/i);
  await editLiveInput(page, model, "Minimize\n obj: x\nSubject To\n cap: x <= 2\nBounds\n 0 <= x\nEnd", "iis");
  await expect(page.locator("#iis-visual-tags")).toContainText(/model is feasible/i);
});
