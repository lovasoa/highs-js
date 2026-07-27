import { test, expect, openMainDemo, visit } from "./demo-fixtures.mjs";

test("filters, changes, and resets solver options", async ({ page }) => {
  await openMainDemo(page);
  await visit(page, "Solver options", "#panel-options");
  const table = page.getByRole("table");
  await expect.poll(() => table.getByRole("row").count()).toBeGreaterThan(50);
  await page.getByPlaceholder("Filter options…").fill("time_limit");
  const row = table.getByRole("row").filter({ hasText: "time_limit" }).first();
  await expect(row).toBeVisible();
  const defaultValue = await row.getByRole("cell").nth(3).textContent();
  await row.click();
  await expect(page.locator("#opt-detail")).toContainText("time_limit");
  await page.getByRole("textbox", { name: "New Value:" }).fill("12");
  await page.getByRole("button", { name: "Set Option" }).click();
  await expect(page.locator("#opt-detail")).toContainText(/"current"\s*:\s*12/);
  await page.getByRole("button", { name: "Reset All Options" }).click();
  await expect(row.getByRole("cell").nth(2)).toHaveText(defaultValue);
});

test("loads, exports, and solves edited LP text", async ({ page }) => {
  await openMainDemo(page);
  await visit(page, "Model exchange", "#panel-io");
  const output = page.locator("#io-output");
  await page.locator("#io-input").fill("Maximize\n obj: 7 z\nSubject To\n cap: z <= 3\nBounds\n 0 <= z\nEnd");
  await page.getByRole("button", { name: "Load LP" }).click();
  await expect(page.locator("#io-status-val")).toHaveText("LOADED");
  await page.getByRole("button", { name: "Export LP" }).click();
  await expect(output).toContainText(/\bz\b/);
  await page.getByRole("button", { name: "Solve Model" }).click();
  await expect(output).toContainText(/Objective: 21\b/);
});
