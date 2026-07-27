import { test, expect, openMainDemo, waitForInitialSolves } from "./demo-fixtures.mjs";

test("loads the browser runtime and initial examples", async ({ page, request }) => {
  await openMainDemo(page);

  const wasm = await request.get("/highs.wasm");
  expect(wasm.ok()).toBe(true);
  expect(wasm.headers()["content-type"]).toBe("application/wasm");
  await expect.poll(() => page.evaluate(() => crossOriginIsolated && typeof SharedArrayBuffer === "function"))
    .toBe(true);

  await waitForInitialSolves(page);
  await expect(page.locator("#lp-output")).not.toHaveClass(/placeholder|error/);
  await expect(page.locator("#lp-obj-val")).toHaveText("15.0000");
});
