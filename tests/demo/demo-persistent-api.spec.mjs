import { test, expect } from "./demo-fixtures.mjs";

test("mutates and re-solves a retained model", async ({ page }) => {
  await page.goto("/extended/");
  const result = page.locator("#result");
  await expect(page.locator("#mode")).toContainText("Persistent Model");
  await expect(result).toContainText("modelStatus");
  const initialResult = await result.textContent();

  await page.getByRole("spinbutton", { name: "x1 objective cost" }).fill("5");
  await page.getByRole("spinbutton", { name: "x1 upper bound" }).fill("0");
  await page.getByRole("button", { name: "Apply changes and solve" }).click();
  await expect(result).not.toHaveText(initialResult);
  await expect(result).toContainText('"colValue"');
});

test("reports invalid retained-model mutations", async ({ page }) => {
  await page.goto("/extended/");
  const result = page.locator("#result");
  await expect(result).toContainText("objectiveValue");
  await page.getByRole("spinbutton", { name: "x1 objective cost" }).fill("");
  await page.getByRole("button", { name: "Apply changes and solve" }).click();
  await expect(result).toContainText("Error: TypeError");
});
