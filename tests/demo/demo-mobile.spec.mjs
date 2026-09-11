import { test, expect, openMainDemo } from "./demo-fixtures.mjs";

test("fits the main demo within a mobile viewport", async ({ page }) => {
  await openMainDemo(page);
  const overflow = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    return [...document.querySelectorAll("body *")]
      .filter((element) => element.getBoundingClientRect().right > viewportWidth + 1)
      .map((element) => `${element.tagName.toLowerCase()}#${element.id}.${element.className}`)
      .slice(0, 10);
  });
  expect(overflow).toEqual([]);
});
