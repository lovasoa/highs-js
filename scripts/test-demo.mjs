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

const mainDemoAssets = [
  "index.html",
  "css/base.css",
  "css/examples.css",
  "css/navigation.css",
  "demo.js",
  "live-examples.js",
  "navigation.js",
  "worker-client.js",
  "ui.js",
  "model-data.js",
  "visualizations.js",
  "panels/lp.js",
  "panels/build.js",
  "panels/mip.js",
  "panels/qp.js",
  "panels/multiobjective.js",
  "panels/callbacks.js",
  "panels/ranging.js",
  "panels/options.js",
  "panels/iis.js",
  "panels/model-io.js",
];

for (const file of ["highs.js", "highs.wasm", "worker.js", "callback-worker.js", "coi-serviceworker.js", ...mainDemoAssets, "extended/index.html", "extended/demo.js", "extended/worker.js"]) {
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
  await page.addInitScript(() => {
    window.__callbackMetrics = [];
    const NativeWorker = window.Worker;
    window.Worker = class ObservedWorker extends NativeWorker {
      constructor(url, options) {
        super(url, options);
        if (String(url).includes("callback-worker.js")) {
          this.addEventListener("message", ({ data }) => {
            if (data?.metrics) window.__callbackMetrics.push(data.metrics);
          });
        }
      }
    };
  });
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });

  const stylesheets = await page.evaluate(() => [...document.styleSheets].map((sheet) => new URL(sheet.href).pathname));
  expect(stylesheets.slice(-3).join(",") === "/css/base.css,/css/examples.css,/css/navigation.css", "loads split stylesheets in cascade order");

  const wasm = await page.request.get(`${baseUrl}highs.wasm`);
  expect(wasm.ok() && wasm.headers()["content-type"] === "application/wasm", "loads the WebAssembly runtime with the wasm MIME type");
  expect(await page.evaluate(() => crossOriginIsolated && typeof SharedArrayBuffer === "function"), "enables cross-origin isolation for shared-memory callback interruption");

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
  const gridSignature = () => page.locator("#panel-multiobjective .callback-stats, #panel-multiobjective .stat-grid").first().evaluate(() => [
    document.getElementById("grid-unserved").textContent,
    document.getElementById("grid-emissions").textContent,
    document.getElementById("grid-cost").textContent,
  ].join("|"));
  const changeGridInput = async (selector, value) => {
    const revision = Number(await page.locator("#grid-state").getAttribute("data-revision") || 0);
    await page.fill(selector, String(value));
    await waitForLiveSolve(page, "grid", revision);
    return gridSignature();
  };
  expect(await page.locator("#grid-story-strict").isVisible() && !(await page.locator("#grid-story-blended").isVisible()), "shows only strict-priority controls in strict mode");
  const strictDefault = await gridSignature();
  expect(await changeGridInput("#grid-gas-capacity", 30) !== strictDefault, "decreasing default gas capacity changes the strict-priority solution");
  await changeGridInput("#grid-gas-capacity", 35);
  expect(await changeGridInput("#grid-gas-capacity", 40) !== strictDefault, "increasing default gas capacity changes the strict-priority solution");
  await changeGridInput("#grid-gas-capacity", 35);
  expect(await changeGridInput("#grid-carbon-tolerance", 2) !== strictDefault, "decreasing default carbon tolerance changes the strict-priority solution");
  await changeGridInput("#grid-carbon-tolerance", 3);
  expect(await changeGridInput("#grid-carbon-tolerance", 4) !== strictDefault, "increasing default carbon tolerance changes the strict-priority solution");
  await changeGridInput("#grid-carbon-tolerance", 3);

  let gridRevision = Number(await page.locator("#grid-state").getAttribute("data-revision") || 0);
  await page.selectOption("#grid-mode", "blended");
  await waitForLiveSolve(page, "grid", gridRevision);
  expect(await page.locator("#grid-story-blended").isVisible() && !(await page.locator("#grid-story-strict").isVisible()), "shows only weighted-blend controls in blended mode");
  const blendedDefault = await gridSignature();
  expect(await changeGridInput("#grid-gas-capacity", 30) !== blendedDefault, "decreasing default gas capacity changes the blended solution");
  await changeGridInput("#grid-gas-capacity", 35);
  expect(await changeGridInput("#grid-gas-capacity", 40) !== blendedDefault, "increasing default gas capacity changes the blended solution");
  await changeGridInput("#grid-gas-capacity", 35);
  expect(await changeGridInput("#grid-reliability-weight", 114) !== blendedDefault, "decreasing the default reliability weight changes the blended solution");
  await changeGridInput("#grid-reliability-weight", 119);
  expect(await changeGridInput("#grid-reliability-weight", 124) !== blendedDefault, "increasing the default reliability weight changes the blended solution");
  await changeGridInput("#grid-reliability-weight", 119);
  expect(await changeGridInput("#grid-carbon-weight", 75) !== blendedDefault, "decreasing the default carbon weight changes the blended solution");
  await changeGridInput("#grid-carbon-weight", 100);
  expect(await changeGridInput("#grid-carbon-weight", 125) !== blendedDefault, "increasing the default carbon weight changes the blended solution");
  await changeGridInput("#grid-carbon-weight", 100);

  await visit(page, "#panel-callbacks");
  await page.click("#callback-start");
  await page.waitForFunction(() => document.getElementById("callback-incumbent")?.textContent !== "--", { timeout: 30000 });
  const initialTour = await page.locator("#callback-incumbent").textContent();
  expect(await page.locator("#callback-graph-viz").getAttribute("width") !== null, "streams a feasible incumbent through the callback Worker");
  await page.waitForFunction((initialTour) => document.getElementById("callback-incumbent")?.textContent !== initialTour, initialTour, { timeout: 20000 });
  expect(true, "streams a genuinely shorter incumbent tour during the search");
  await page.waitForFunction(() => document.getElementById("callback-elapsed")?.textContent !== "--", { timeout: 15000 });
  expect(await page.locator("#callback-progress-viz svg").count() === 1, "streams live MIP bound metrics while branch-and-cut runs");
  await page.waitForTimeout(1500);
  const rawMetricsMonotonic = await page.evaluate(() => window.__callbackMetrics.every((metrics, index, all) => {
    if (index === 0) return true;
    const previous = all[index - 1];
    return metrics.elapsed >= previous.elapsed && metrics.nodes >= previous.nodes;
  }));
  expect(rawMetricsMonotonic, "emits monotonic elapsed time and node counts from the Worker itself");
  if (!(await page.locator("#callback-stop").isDisabled())) {
    await page.evaluate(() => document.getElementById("callback-stop").click());
    expect(await page.locator("#callback-stop").textContent() === "Stopping…", "shows a loading state while interruption is pending");
    await waitForText(page.locator("#callback-state"), /status interrupted/i);
    await expectText(page.locator("#callback-state"), /status interrupted/i, "interrupts a running synchronous solve through an atomic callback flag");
  }
  const pausedTour = Number((await page.locator("#callback-incumbent").textContent()).replaceAll(",", ""));
  const pausedNodes = Number((await page.locator("#callback-nodes").textContent()).replaceAll(",", ""));
  const pausedElapsed = Number.parseFloat(await page.locator("#callback-elapsed").textContent());
  expect(await page.locator("#callback-start").textContent() === "Resume search" && !(await page.locator("#callback-start").isDisabled()), "offers resume after interruption");
  await page.click("#callback-start");
  expect(Number((await page.locator("#callback-incumbent").textContent()).replaceAll(",", "")) <= pausedTour, "resumes without discarding the retained incumbent");
  await waitForText(page.locator("#callback-state"), /Branch-and-cut/);
  expect(Number((await page.locator("#callback-nodes").textContent()).replaceAll(",", "")) >= pausedNodes, "does not reset cumulative search nodes on resume");
  expect(Number.parseFloat(await page.locator("#callback-elapsed").textContent()) >= pausedElapsed, "does not reset cumulative elapsed time on resume");
  expect(await page.evaluate(() => window.__callbackMetrics.every((metrics, index, all) => index === 0 || (
    metrics.elapsed >= all[index - 1].elapsed && metrics.nodes >= all[index - 1].nodes
  ))), "keeps raw Worker counters monotonic across pause and resume");
  await page.click("#callback-restart");
  expect(await page.locator("#callback-restart").textContent() === "Restarting…", "shows a loading state while restarting from scratch");
  await waitForText(page.locator("#callback-state"), /Branch-and-cut/);
  expect(Number((await page.locator("#callback-incumbent").textContent()).replaceAll(",", "")) > pausedTour, "restart rebuilds the deliberately poor initial tour");
  await page.click("#callback-stop");
  await waitForText(page.locator("#callback-state"), /status interrupted/i);
  await page.selectOption("#callback-size", "30");
  await page.click("#callback-restart");
  await waitForText(page.locator("#callback-verdict-title"), /Optimal tour proven/i);
  expect(await page.locator("#callback-incumbent").textContent() === await page.locator("#callback-bound").textContent(), "final optimal tour and proven bound use the same authoritative value");
  expect(await page.locator("#callback-gap").textContent() === "0.00%", "final optimal state reports a closed MIP gap");
  expect(await page.locator("#callback-start").textContent() === "Optimal found" && await page.locator("#callback-start").isDisabled(), "makes completed optimality visually explicit");

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
