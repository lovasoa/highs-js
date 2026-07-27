import { test, expect, openMainDemo, visit } from "./demo-fixtures.mjs";

const numericText = async (locator) => parseFloat((await locator.textContent()).replaceAll(",", ""));

test("streams, interrupts, resumes, and restarts a MIP search", async ({ page }) => {
  test.setTimeout(120_000);
  await openMainDemo(page);
  await visit(page, "Live MIP search", "#panel-callbacks");

  const start = page.locator("#callback-start");
  const stop = page.locator("#callback-stop");
  const restart = page.locator("#callback-restart");
  const incumbent = page.locator("#callback-incumbent");
  const state = page.locator("#callback-state");
  await start.click();
  await expect(incumbent).not.toHaveText("--");
  const initialTour = await incumbent.textContent();
  await expect(incumbent).not.toHaveText(initialTour);
  await expect(page.locator("#callback-progress-viz svg")).toBeVisible();

  if (await stop.isEnabled()) {
    await stop.click();
    await expect(stop).toHaveText("Stopping…");
    await expect(state).toContainText(/status interrupted/i);
  }

  const pausedTour = await numericText(incumbent);
  const pausedNodes = await numericText(page.locator("#callback-nodes"));
  const pausedElapsed = await numericText(page.locator("#callback-elapsed"));
  await expect(start).toHaveText("Resume search");
  await expect(start).toBeEnabled();
  await start.click();
  await expect.poll(() => numericText(incumbent)).toBeLessThanOrEqual(pausedTour);
  await expect(state).toContainText(/Branch-and-cut|Improved tour|Optimality proved/);
  await expect.poll(() => numericText(page.locator("#callback-nodes"))).toBeGreaterThanOrEqual(pausedNodes);
  await expect.poll(() => numericText(page.locator("#callback-elapsed"))).toBeGreaterThanOrEqual(pausedElapsed);

  await restart.click();
  await expect(restart).toHaveText("Restarting…");
  await expect(state).toContainText(/Branch-and-cut|Improved tour|Optimality proved/);
  await expect.poll(() => numericText(incumbent)).toBeGreaterThan(pausedTour);
  await stop.click();
  await expect(state).toContainText(/status interrupted/i);

  await page.getByRole("combobox", { name: "Number of cities" }).selectOption("30");
  await restart.click();
  await expect(page.locator("#callback-verdict-title")).toContainText(/Optimal tour proven/i);
  await expect(incumbent).toHaveText(await page.locator("#callback-bound").textContent());
  await expect(page.locator("#callback-gap")).toHaveText("0.00%");
  await expect(start).toHaveText("Optimal found");
  await expect(start).toBeDisabled();
});
