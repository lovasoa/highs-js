import { test, expect, openMainDemo } from "./demo-fixtures.mjs";

test("solves edited LP text and explains the active bound", async ({ page }) => {
  await openMainDemo(page);
  const lpPanel = page.locator("#panel-lp");
  await lpPanel.locator("#lp-input").fill("Maximize\n obj: 3 x + 2 y\nSubject To\n material: 2 x + y <= 9\n labor: x + 2 y <= 9\nBounds\n x >= 0\n y >= 3\nEnd");
  await lpPanel.getByRole("button", { name: "Solve LP" }).click();

  const activeBound = lpPanel.locator(".bound-wall").filter({ hasText: "y ≥ 3" });
  await expect(activeBound.locator(".bound-tag")).toContainText("FULL");
  await activeBound.locator(".bound-tag").hover();
  await expect(lpPanel.locator(".viz-narration")).toContainText(/y's lower bound is active.*reduced cost/s);
});
