#!/usr/bin/env node
/**
 * Browser acceptance tests for the interactive demos.
 *
 * Run `npm run build:demo` first so demo/highs.js and demo/highs.wasm are fresh.
 */

import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEMO_DIR = join(ROOT, "demo");
const MIME = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
};

for (const file of ["highs.js", "highs.wasm", "index.html", "demo.js", "worker.js", "extended/index.html", "extended/demo.js", "extended/worker.js"]) {
  if (!existsSync(join(DEMO_DIR, file))) {
    throw new Error(`Missing demo/${file}. Run "npm run build:demo" first.`);
  }
}

function createStaticServer(root) {
  return createServer(async (req, res) => {
    try {
      let urlPath = decodeURIComponent(req.url.split("?")[0]);
      if (urlPath === "/") urlPath = "/index.html";
      if (urlPath.endsWith("/")) urlPath += "index.html";
      const filePath = join(root, urlPath);
      if (!filePath.startsWith(root)) {
        res.writeHead(403).end("Forbidden");
        return;
      }
      res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
      res.end(await readFile(filePath));
    } catch {
      res.writeHead(404).end("Not found");
    }
  });
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`  ok: ${message}`);
}

async function expectText(locator, pattern, message) {
  expect(pattern.test(await locator.textContent()), message);
}

async function waitForText(locator, pattern) {
  await locator.waitFor({ state: "visible", timeout: 30000 });
  await locator.page().waitForFunction(({ selector, source }) => {
    const element = document.querySelector(selector);
    return element && new RegExp(source).test(element.textContent || "");
  }, { selector: await locator.evaluate((element) => `#${element.id}`), source: pattern.source }, { timeout: 30000 });
}

async function waitForOutput(page, id) {
  await page.waitForFunction((outputId) => {
    const output = document.getElementById(outputId);
    return output && !output.classList.contains("placeholder") && !/^(Loading|Solving|Computing|Fetching|Setting)/.test(output.textContent?.trim() || "");
  }, id, { timeout: 30000 });
}

async function waitForLiveSolve(page, key, previousRevision = -1) {
  await page.waitForFunction(({ key, previousRevision }) => {
    const state = document.getElementById(`${key}-state`);
    return Number(state?.dataset.revision) > previousRevision && ["ready", "error"].includes(state?.dataset.state);
  }, { key, previousRevision }, { timeout: 30000 });
}

async function editLiveInput(page, selector, value, key) {
  const state = page.locator(`#${key}-state`);
  const revision = Number(await state.getAttribute("data-revision") || 0);
  await page.fill(selector, String(value));
  await waitForLiveSolve(page, key, revision);
  expect(await state.getAttribute("data-state") === "ready", `${key} edit solves successfully`);
}

async function visit(page, hash) {
  await page.locator(`#tabs a[href="${hash}"]`).click();
  await page.waitForFunction((hash) => location.hash === hash, hash);
}

async function mainDemo(page, baseUrl) {
  console.log("\nMain demo");
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });

  const wasm = await page.request.get(`${baseUrl}highs.wasm`);
  expect(wasm.ok() && wasm.headers()["content-type"] === "application/wasm", "loads the WebAssembly runtime with the wasm MIME type");

  await waitForOutput(page, "lp-output");
  expect(!(await page.locator("#lp-output").evaluate((element) => element.classList.contains("error"))), "solves the legacy LP without an error");
  expect(await page.locator("#lp-obj-val").textContent() === "16.0000", "returns the legacy LP optimum");

  for (const key of ["production", "diet", "transport", "knapsack", "facility", "qp", "grid", "ranging", "iis"]) {
    await waitForLiveSolve(page, key);
    const state = page.locator(`#${key}-state`);
    expect(await state.getAttribute("data-state") === "ready", `${key} initial solve succeeds (${await state.textContent()})`);
  }

  await visit(page, "#example-production");
  await editLiveInput(page, "#production-chair-profit", 90, "production");
  await expectText(page.locator("#build-output"), /Objective: 5400\b/, "rebuilds the production model from edited input");

  await visit(page, "#example-knapsack");
  await editLiveInput(page, "#mip-capacity", 1, "knapsack");
  await expectText(page.locator("#mip-output"), /Objective: 8\b/, "finds the optimal one-item knapsack solution");
  const knapsackRevision = Number(await page.locator("#knapsack-state").getAttribute("data-revision") || 0);
  await page.fill("#mip-capacity", "");
  await waitForLiveSolve(page, "knapsack", knapsackRevision);
  expect(await page.locator("#knapsack-state").getAttribute("data-state") === "error", "reports invalid live model input");

  await visit(page, "#panel-iis");
  await editLiveInput(page, "#iis-lp", "Minimize\n obj: x\nSubject To\n cap: x <= 1\nBounds\n 2 <= x\nEnd", "iis");
  await expectText(page.locator("#iis-output"), /infeasible/i, "identifies an infeasible edited model");
  await editLiveInput(page, "#iis-lp", "Minimize\n obj: x\nSubject To\n cap: x <= 2\nBounds\n 0 <= x\nEnd", "iis");
  await expectText(page.locator("#iis-visual-tags"), /model is feasible/i, "clears the IIS explanation for a feasible model");

  await visit(page, "#panel-multiobjective");
  await expectText(page.locator("#grid-unserved"), /^0\.0 MWh$/, "strict objective priorities protect grid reliability");
  const gridRevision = Number(await page.locator("#grid-state").getAttribute("data-revision") || 0);
  await page.selectOption("#grid-mode", "blended");
  await waitForLiveSolve(page, "grid", gridRevision);
  const blendedUnserved = Number.parseFloat(await page.locator("#grid-unserved").textContent());
  expect(blendedUnserved > 0, "weighted blending exposes a reliability tradeoff when its weight is too low");

  await visit(page, "#panel-callbacks");
  await page.click("#callback-start");
  await page.waitForFunction(() => document.getElementById("callback-incumbent")?.textContent !== "--", { timeout: 30000 });
  expect(await page.locator("#callback-graph-viz").getAttribute("width") !== null, "streams a feasible incumbent through the callback Worker");
  await page.waitForFunction(() => document.getElementById("callback-elapsed")?.textContent !== "--", { timeout: 15000 });
  expect(await page.locator("#callback-progress-viz svg").count() === 1, "streams live MIP bound metrics while branch-and-cut runs");
  if (!(await page.locator("#callback-stop").isDisabled())) {
    await page.click("#callback-stop");
    await expectText(page.locator("#callback-state"), /Stopped immediately/, "stops a running synchronous solve by terminating its Worker");
  }

  await visit(page, "#panel-options");
  await page.waitForFunction(() => document.querySelectorAll("#opts-body tr").length > 50, { timeout: 30000 });
  await page.fill("#opts-search", "time_limit");
  expect(await page.locator("#opts-body tr").count() >= 1, "filters options by name");
  await page.locator("#opts-body tr").filter({ hasText: "time_limit" }).first().click();
  await waitForText(page.locator("#opt-detail"), /time_limit/);
  await expectText(page.locator("#opt-detail"), /time_limit/, "describes a selected option");
  const selectedOption = await page.locator("#opt-name").inputValue();
  const selectedRow = page.locator("#opts-body tr").filter({ has: page.locator(`code:text-is("${selectedOption}")`) });
  const defaultValue = await selectedRow.locator("td").nth(3).textContent();
  await page.fill("#opt-value", "12");
  await page.click("#opt-set");
  await waitForText(page.locator("#opt-detail"), /"current"\s*:\s*12/);
  await expectText(page.locator("#opt-detail"), /"current"\s*:\s*12/, "sets an option using its native value");
  await page.click("#opt-reset-all");
  await page.waitForFunction(({ selectedOption, defaultValue }) => [...document.querySelectorAll("#opts-body tr")].some((row) => row.querySelector("code")?.textContent === selectedOption && row.children[2]?.textContent === defaultValue), { selectedOption, defaultValue });
  expect(true, "resets option values to their defaults");

  await visit(page, "#panel-io");
  const ioModel = "Maximize\n obj: 7 z\nSubject To\n cap: z <= 3\nBounds\n 0 <= z\nEnd";
  await page.fill("#io-input", ioModel);
  await page.click("#io-load");
  await waitForOutput(page, "io-output");
  expect(await page.locator("#io-status-val").textContent() === "LOADED", "loads edited LP input");
  await page.click("#io-export");
  await waitForText(page.locator("#io-output"), /\bz\b/);
  await expectText(page.locator("#io-output"), /\bz\b/, "exports the loaded model rather than source fixture text");
  await page.click("#io-solve");
  await waitForText(page.locator("#io-output"), /Objective: 21\b/);
  await expectText(page.locator("#io-output"), /Objective: 21\b/, "solves the edited I/O model");

  await page.setViewportSize({ width: 390, height: 844 });
  expect(!(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)), "has no mobile page-level horizontal overflow");
}

async function extendedDemo(page, baseUrl) {
  console.log("\nPersistent-model demo");
  await page.goto(`${baseUrl}extended/`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForFunction(() => document.getElementById("result")?.textContent?.includes("objectiveValue"), { timeout: 30000 });
  await expectText(page.locator("#mode"), /Persistent Model/, "uses the persistent-model API");
  await expectText(page.locator("#result"), /modelStatus/, "returns a persistent-model solve result");
  const initialResult = await page.locator("#result").textContent();
  await page.fill("#cost", "5");
  await page.fill("#upper", "0");
  await page.click("#rerun");
  await page.waitForFunction((initialResult) => {
    const text = document.getElementById("result")?.textContent || "";
    return text !== initialResult && text.includes("objectiveValue");
  }, initialResult, { timeout: 30000 });
  await expectText(page.locator("#result"), /"colValue"/, "mutates and resolves the retained model");
  await page.fill("#cost", "");
  await page.click("#rerun");
  await waitForText(page.locator("#result"), /Error: TypeError/);
  await expectText(page.locator("#result"), /Error: TypeError/, "reports invalid persistent-model mutations");
}

async function main() {
  const { chromium } = await import("playwright");
  const server = createStaticServer(DEMO_DIR);
  const port = await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
  const baseUrl = `http://127.0.0.1:${port}/`;
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  const recordErrors = (page) => {
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
  };
  const page = await browser.newPage();
  recordErrors(page);

  try {
    await mainDemo(page, baseUrl);
    const extendedPage = await browser.newPage();
    recordErrors(extendedPage);
    await extendedDemo(extendedPage, baseUrl);
    expect(errors.length === 0, `runs without browser errors${errors.length ? `: ${errors.join("; ")}` : ""}`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((error) => {
  console.error("Demo test failed:", error);
  process.exit(1);
});
