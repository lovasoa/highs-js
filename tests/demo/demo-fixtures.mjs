import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, use) => {
    const browserErrors = [];
    page.on("pageerror", (error) => browserErrors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    await page.route("https://cdn.jsdelivr.net/**", (route) => route.fulfill({
      contentType: "text/javascript",
      headers: { "Cross-Origin-Resource-Policy": "cross-origin" },
      body: "",
    }));

    await use(page);

    expect(browserErrors, "browser console and page errors").toEqual([]);
  },
});

export { expect };

export async function openMainDemo(page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Linear Optimizer for JavaScript." })).toBeVisible();
}

export async function visit(page, linkName, hash) {
  await page.locator(`#tabs a[href="${hash}"]`).filter({ hasText: linkName }).click();
  await expect(page).toHaveURL((url) => url.hash === hash);
}

export async function waitForLiveSolve(page, key, previousRevision = -1, expectedState = "ready") {
  const state = page.locator(`#${key}-state`);
  await expect.poll(async () => Number(await state.getAttribute("data-revision") || 0))
    .toBeGreaterThan(previousRevision);
  await expect(state).toHaveAttribute("data-state", expectedState);
  return state;
}

export async function editLiveInput(page, input, value, key, expectedState = "ready") {
  const state = page.locator(`#${key}-state`);
  const revision = Number(await state.getAttribute("data-revision") || 0);
  await input.fill(String(value));
  await waitForLiveSolve(page, key, revision, expectedState);
}

export async function waitForInitialSolves(page) {
  for (const key of ["production", "diet", "transport", "knapsack", "facility", "qp", "grid", "ranging", "iis"]) {
    await waitForLiveSolve(page, key);
  }
}
