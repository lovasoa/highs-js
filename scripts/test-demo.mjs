#!/usr/bin/env node
/**
 * Headless-browser smoke test for the highs-js demo page.
 *
 * Serves the demo/ directory over HTTP, loads it in Chromium via Playwright,
 * and verifies that:
 *
 *  1. HiGHS loads successfully (the initial legacy LP solve completes).
 *  2. The generated TypeDoc API reference is linked and loadable.
 *  3. Every extended-API example works — no "This build does not include the
 *     extended API" error ever appears.
 *
 * The demo directory must contain fresh runtime and documentation artifacts
 * before running. In CI and locally, generate them with:
 *
 *   npm run build:demo
 *
 * Usage:
 *   node scripts/test-demo.mjs
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DEMO_DIR = join(ROOT, "demo");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

/* ── pre-flight: ensure build artifacts are present ── */

for (const f of [
  "highs.js",
  "highs.wasm",
  "worker.js",
  "index.html",
  "demo.css",
  "demo.js",
  "model-data.js",
  "navigation.js",
  "prism-lp.js",
  "ui.js",
  "visualizations.js",
  "worker-client.js",
  "docs/index.html",
]) {
  if (!existsSync(join(DEMO_DIR, f))) {
    console.error(`Missing ${f} in demo/. Run "npm run build:demo" first.`);
    process.exit(1);
  }
}

/* ── static file server ── */

function createStaticServer(root) {
  return createServer(async (req, res) => {
    try {
      let urlPath = decodeURIComponent(req.url.split("?")[0]);
      if (urlPath === "/") urlPath = "/index.html";
      if (urlPath.endsWith("/")) urlPath += "index.html";
      // Prevent path traversal.
      const filePath = join(root, urlPath);
      if (!filePath.startsWith(root)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      const data = await readFile(filePath);
      res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
      res.end(data);
    } catch (err) {
      res.writeHead(404);
      res.end("Not found");
    }
  });
}

/* ── test harness ── */

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failures++;
  } else {
    console.log(`  ok:  ${message}`);
  }
}

async function waitForOutput(page, selector, { timeout = 15000 } = {}) {
  // Wait until the output element is no longer in "placeholder" or "loading" state.
  await page.waitForFunction(
    (sel) => {
      const el = document.getElementById(sel);
      if (!el) return false;
      const text = el.textContent || "";
      if (el.classList.contains("placeholder")) return false;
      if (/loading|Loading|Solving|Computing|Fetching|Setting|^\s*$/.test(text)) return false;
      return true;
    },
    selector.replace("#", ""),
    { timeout },
  );
}

async function checkNoExtendedApiError(page, label) {
  const bodyText = await page.evaluate(() => document.body.innerText);
  assert(
    !bodyText.includes("This build does not include the extended API"),
    `${label}: extended API is available (no "This build does not include the extended API" error)`,
  );
}

async function visitExample(page, selector) {
  await page.evaluate((targetSelector) => {
    const target = document.querySelector(targetSelector);
    if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80 });
  }, selector);
  await page.waitForTimeout(300);
  await page.waitForFunction((hash) => {
    const current = document.querySelector('#tabs [aria-current="location"]');
    return current?.getAttribute("href") === hash;
  }, selector);
}

async function checkOutputNotError(page, outputId, label) {
  const isError = await page.evaluate((id) => {
    const el = document.getElementById(id);
    return el ? el.classList.contains("error") : true;
  }, outputId);
  assert(!isError, `${label}: output has no error class`);
}

async function waitForLiveState(page, key, { timeout = 30000 } = {}) {
  await page.waitForFunction((stateKey) => {
    const state = document.getElementById(`${stateKey}-state`);
    return state?.dataset.state === "ready" || state?.dataset.state === "error";
  }, key, { timeout });
  const state = await page.locator(`#${key}-state`).getAttribute("data-state");
  const text = await page.locator(`#${key}-state`).textContent();
  assert(state === "ready", `${key}: automatic solve completed (${text})`);
}

async function editLiveInput(page, selector, value, key) {
  const previousRevision = Number(await page.locator(`#${key}-state`).getAttribute("data-revision") || 0);
  await page.fill(selector, String(value));
  await page.waitForFunction(({ stateKey, revision }) => {
    const state = document.getElementById(`${stateKey}-state`);
    return Number(state?.dataset.revision) > revision && state?.dataset.state !== "solving";
  }, { stateKey: key, revision: previousRevision }, { timeout: 30000 });
  assert(await page.locator(`#${key}-state`).getAttribute("data-state") === "ready", `${key}: edit triggered a successful live solve`);
}

/* ── main ── */

async function main() {
  const { chromium } = await import("playwright");

  const server = createStaticServer(DEMO_DIR);
  const port = await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
  const baseUrl = `http://127.0.0.1:${port}/`;
  console.log(`Serving demo from ${DEMO_DIR} at ${baseUrl}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Collect console errors.
  const consoleErrors = [];
  const failedLocalResponses = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin === new URL(baseUrl).origin && response.status() >= 400) {
      failedLocalResponses.push(`${response.status()} ${url.pathname}`);
    }
  });

  try {
    console.log("\n─ Loading demo page ─");
    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });

    const wasmResponse = await page.request.get(`${baseUrl}highs.wasm`);
    assert(wasmResponse.ok(), "WebAssembly runtime is available");
    assert(wasmResponse.headers()["content-type"] === "application/wasm", "WebAssembly runtime has the required MIME type");

    const apiReference = page.locator('.top-nav-right a[href="docs/"]');
    assert(await apiReference.count() === 1, "Header links to the API reference beside npm");
    const docsResponse = await page.request.get(`${baseUrl}docs/`);
    assert(docsResponse.ok(), "Generated TypeDoc API reference is available at /docs/");
    assert((await docsResponse.text()).includes("highs-js API reference"), "API reference has the expected TypeDoc title");
    const docsThemeResponse = await page.request.get(`${baseUrl}docs/assets/custom.css`);
    assert(docsThemeResponse.ok(), "API reference includes its custom theme");
    assert((await docsThemeResponse.text()).includes("#f8fbfa"), "API reference uses the demo color palette");

    const demoPanels = await page.locator(".tab-panel").count();
    assert(await page.locator(".tab-panel .api-reference-links").count() === demoPanels, "Every demo panel links to its API items");
    const demoApiLinks = await page.locator(".api-reference-links a").evaluateAll((links) => [...new Set(links.map((link) => link.href))]);
    const demoApiLinkResponses = await Promise.all(demoApiLinks.map((url) => page.request.get(url)));
    assert(demoApiLinkResponses.every((response) => response.ok()), "Every demo API link resolves to generated documentation");

    const docsPage = await browser.newPage();
    await docsPage.addInitScript(() => localStorage.setItem("tsd-theme", "dark"));
    await docsPage.goto(`${baseUrl}docs/`, { waitUntil: "networkidle" });
    assert(await docsPage.locator(".tsd-typography > h1").isVisible(), "API reference opens on a technical landing page");
    assert(await docsPage.locator("table").count() >= 2, "Landing page organizes API surfaces and example features as reference tables");
    assert(await docsPage.locator(".col-sidebar").isHidden(), "Landing page hides the redundant symbol sidebars");
    assert(await docsPage.locator("#facility-example + pre").isVisible(), "Landing page includes the facility-location MILP example");
    assert(await docsPage.locator("#facility-example + pre .api-code-link").count() >= 12, "Example API identifiers link to generated documentation");
    assert((await docsPage.locator("#facility-example + pre .api-code-link", { hasText: "run" }).first().getAttribute("href")).endsWith("/docs/interfaces/Model.html#run"), "Example method links target exact TypeDoc anchors");
    const exampleLinks = await docsPage.locator("#facility-example + pre .api-code-link").evaluateAll((links) => [...new Set(links.map((link) => link.href))]);
    const exampleLinkResponses = await Promise.all(exampleLinks.map((url) => docsPage.request.get(url)));
    assert(exampleLinkResponses.every((response) => response.ok()), "Every linked example identifier resolves to generated documentation");
    const docsScreenshot = join(ROOT, "build", "docs-home.png");
    await docsPage.screenshot({ path: docsScreenshot, fullPage: true });
    console.log(`  screenshot: ${docsScreenshot}`);

    const contrastRatio = (selector) => docsPage.locator(selector).first().evaluate((element) => {
      const channels = (color) => color.match(/[\d.]+/g).slice(0, 3).map(Number);
      const luminance = (color) => {
        const values = channels(color).map((value) => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
      };
      const foreground = luminance(getComputedStyle(element).color);
      const background = luminance(getComputedStyle(element).backgroundColor === "rgba(0, 0, 0, 0)"
        ? getComputedStyle(document.body).backgroundColor
        : getComputedStyle(element).backgroundColor);
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });

    const syntaxContrast = await docsPage.locator("pre code span").evaluateAll((elements) => {
      const channels = (color) => color.match(/[\d.]+/g).slice(0, 3).map(Number);
      const luminance = (color) => {
        const values = channels(color).map((value) => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
      };
      return Math.min(...elements.map((element) => {
        const foreground = luminance(getComputedStyle(element).color);
        const background = luminance(getComputedStyle(element.closest("pre")).backgroundColor);
        return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
      }));
    });
    assert(syntaxContrast >= 4.5, "Quick-start syntax tokens meet text contrast requirements");

    await docsPage.goto(`${baseUrl}docs/enums/HighsDebugLevel.html`, { waitUntil: "networkidle" });
    assert(await contrastRatio(".tsd-kind-enum-member") >= 4.5, "Enum signatures remain readable with a stored dark theme");
    await docsPage.goto(`${baseUrl}docs/interfaces/Hessian.html`, { waitUntil: "networkidle" });
    assert(await contrastRatio("code.tsd-tag") >= 4.5, "Readonly and Optional badges meet text contrast requirements");
    await docsPage.close();

    // ── Test 1: Legacy LP solve (runs automatically on page load) ──
    console.log("\n─ Example: LP Format (legacy API) ─");
    await waitForOutput(page, "#lp-output", { timeout: 30000 });
    await checkOutputNotError(page, "lp-output", "LP solve");
    for (const key of ["production", "diet", "transport", "knapsack", "facility", "qp", "ranging", "iis"]) {
      await waitForLiveState(page, key);
    }
    await checkNoExtendedApiError(page, "LP solve");
    const lpText = await page.evaluate(() => document.getElementById("lp-output").textContent);
    assert(lpText.length > 10, "LP solve produced output");
    assert(/Status|Optimal|Objective/i.test(lpText), "LP solve output looks like a result");
    assert(await page.locator(".code-editor-box .token").count() > 5, "JavaScript examples have syntax highlighting");
    assert(await page.locator("#panel-lp .syntax-editor .token").count() > 5, "LP editor has syntax highlighting");
    assert(await page.locator("#lp-output .token").count() > 5, "JSON output has syntax highlighting");
    assert(await page.locator(".viz-loading").count() === 0, "No visualization remains in a loading state after initialization");
    assert(await page.getByText("Solver control map", { exact: true }).count() === 0, "Solver control map is absent");
    const storyInputMetrics = await page.locator(".story-input").first().evaluate((input) => {
      const style = getComputedStyle(input);
      const story = input.closest(".model-story");
      return { height: input.getBoundingClientRect().height, lineHeight: Number.parseFloat(getComputedStyle(story).lineHeight), background: style.backgroundColor };
    });
    assert(storyInputMetrics.height <= storyInputMetrics.lineHeight, "Inline numeric inputs preserve the surrounding line height");
    const desktopScreenshot = join(ROOT, "build", "demo-desktop.png");
    await page.screenshot({ path: desktopScreenshot, fullPage: true });
    console.log(`  screenshot: ${desktopScreenshot}`);

    // ── Test 2: Build & Solve (extended API) ──
    console.log("\n─ Examples: Build & Solve (extended API) ─");
    assert(await page.locator("#build-example, #mip-example").count() === 0, "Nested examples use the shared tree instead of panel dropdowns");
    assert(await page.locator("#tabs .tab-btn, #tabs .tree-branch-header, #tabs .tree-subitem").count() === 0, "Navigation has one shared link component instead of parallel structures");
    assert(await page.locator("#tabs .nav-item-root:not(:has(.nav-marker)):not(:has(.nav-copy))").count() === 0, "Every root navigation item has the same marker and copy structure");
    const rootGeometry = await page.locator("#tabs .nav-item-root").evaluateAll((items) => items.map((item) => {
      const bounds = item.getBoundingClientRect();
      const marker = item.querySelector(".nav-marker").getBoundingClientRect();
      return { left: bounds.left, width: bounds.width, markerLeft: marker.left, markerSize: marker.width };
    }));
    const aligned = (values, tolerance = 0.5) => Math.max(...values) - Math.min(...values) <= tolerance;
    assert(aligned(rootGeometry.map(({ left }) => left)) && aligned(rootGeometry.map(({ width }) => width)), "All root navigation rows share identical horizontal geometry");
    assert(aligned(rootGeometry.map(({ markerLeft }) => markerLeft)) && aligned(rootGeometry.map(({ markerSize }) => markerSize)), "All root navigation markers share identical alignment and size");
    assert(aligned(rootGeometry.map(({ markerSize }) => markerSize), 0) && rootGeometry[0].markerSize === 26, "Navigation markers retain the compact 26px size");
    const navStyle = await page.locator("#tabs").evaluate((tabs) => {
      const style = getComputedStyle(tabs);
      const guide = getComputedStyle(tabs, "::before");
      const progress = getComputedStyle(tabs, "::after");
      return {
        position: style.position,
        maxHeight: style.maxHeight,
        overflowY: style.overflowY,
        guideDisplay: guide.display,
        guideWidth: guide.width,
        guideLeft: guide.left,
        guideZIndex: Number(guide.zIndex),
        guideColor: guide.backgroundColor,
        progressDisplay: progress.display,
        progressWidth: progress.width,
        progressLeft: progress.left,
        progressZIndex: Number(progress.zIndex),
        progressColor: progress.backgroundColor,
      };
    });
    assert(navStyle.position === "sticky" && navStyle.overflowY === "auto" && navStyle.maxHeight !== "none", "Desktop navigation remains sticky with its own scroll boundary");
    assert(navStyle.guideDisplay !== "none" && navStyle.guideWidth === "1px" && navStyle.guideColor !== "rgba(0, 0, 0, 0)", "Navigation retains the continuous subtle guide line");
    assert(navStyle.progressDisplay !== "none" && navStyle.progressWidth === "2px" && navStyle.progressColor === "rgb(212, 94, 106)", "Read progress uses a thicker muted-red segment on the shared guide line");
    assert(Number.parseFloat(navStyle.guideLeft) + 0.5 === Number.parseFloat(navStyle.progressLeft) + 1, "Thin and thick guide segments share one center axis");
    const markerLayer = await page.locator("#tabs .nav-marker").first().evaluate((marker) => Number(getComputedStyle(marker).zIndex));
    assert(markerLayer > navStyle.progressZIndex && navStyle.progressZIndex > 1, "Guide remains visible above hover backgrounds and below opaque markers");
    await visitExample(page, "#panel-build");
    const stickyTop = await page.locator("#tabs").evaluate((tabs) => tabs.getBoundingClientRect().top);
    assert(Math.abs(stickyTop - 24) <= 1, "Navigation stays pinned at the configured sticky offset while scrolling");
    const activeNavStyle = await page.locator('#tabs a[href="#panel-build"]').evaluate((item) => {
      const style = getComputedStyle(item);
      const inactive = getComputedStyle(document.querySelector('#tabs a[href="#panel-lp"] .nav-copy'));
      return {
        background: style.backgroundImage,
        shadow: style.boxShadow,
        current: item.getAttribute("aria-current"),
        inactiveOpacity: Number(inactive.opacity),
        progress: Number.parseFloat(getComputedStyle(document.getElementById("tabs")).getPropertyValue("--nav-progress")),
      };
    });
    assert(activeNavStyle.current === "location" && activeNavStyle.shadow === "none" && activeNavStyle.background === "none", "Active navigation relies on the progress line without an edge cusp or oversized background");
    assert(activeNavStyle.inactiveOpacity < 1, "Inactive navigation items remain subtly de-emphasized");
    await page.locator('#tabs a[href="#example-diet"]').click();
    await page.waitForFunction(() => document.querySelector('#tabs a[href="#example-diet"]')?.getAttribute("aria-current") === "location");
    assert(new URL(page.url()).hash === "#example-diet", "Navigation links update the URL and active example together");
    const childProgress = await page.locator("#tabs").evaluate((tabs) => Number.parseFloat(getComputedStyle(tabs).getPropertyValue("--nav-progress")));
    assert(childProgress > activeNavStyle.progress, "Red guide progress advances to the active child position");
    const elbowTiming = await page.locator('#tabs a[href="#example-diet"]').evaluate((item) => ({
      dropDelay: getComputedStyle(item, "::after").animationDelay,
      turnDelay: getComputedStyle(item, "::before").animationDelay,
      progressDuration: getComputedStyle(document.getElementById("tabs"), "::after").transitionDuration,
    }));
    assert(elbowTiming.dropDelay === elbowTiming.progressDuration && Number.parseFloat(elbowTiming.turnDelay) > Number.parseFloat(elbowTiming.dropDelay), "Child elbow starts after the spine arrives, then turns horizontally");
    assert((await page.locator('#tabs a[href="#panel-build"] .nav-marker').evaluate((marker) => getComputedStyle(marker).color)) !== "rgb(92, 137, 135)", "An active child keeps its parent branch marker highlighted");
    await visitExample(page, "#example-production");
    assert(await page.locator("#build-matrix-explorer .sparse-stage").count() === 3, "Constraint explorer links formulas, matrix, and CSC arrays");
    assert(await page.locator("#build-matrix-explorer .matrix-axis-index").count() === 0, "Dense matrix axes show only zero-based model names");
    assert(await page.locator("#build-matrix-explorer .matrix-axis-name").first().textContent() === "x", "Two-variable production model uses x and y");
    await page.locator('#build-matrix-explorer .formula-term[data-entry-index="1"]').first().hover();
    assert(await page.locator("#build-matrix-explorer .matrix-table td.active").count() === 1, "Hovering a formula term highlights its matrix cell");
    assert(await page.locator("#build-matrix-explorer [data-array='values'].active").count() === 1, "Hovering a formula term highlights its stored value");
    const hoveredNarration = await page.locator("#build-matrix-explorer .sparse-narration").textContent();
    await page.waitForTimeout(1700);
    assert(await page.locator("#build-matrix-explorer .sparse-narration").textContent() === hoveredNarration, "Sparse animation pauses while the explorer is hovered");
    await page.mouse.move(0, 0);
    await page.click('#build-matrix-explorer [data-action="next"]');
    assert((await page.locator("#build-matrix-explorer .sparse-narration").textContent()).includes("starts["), "Constraint explorer explains starts, indices, and values");
    await waitForOutput(page, "#build-output");
    await checkOutputNotError(page, "build-output", "Build & Solve");
    await checkNoExtendedApiError(page, "Build & Solve");
    const buildText = await page.evaluate(() => document.getElementById("build-output").textContent);
    assert(/Status|Objective/i.test(buildText), "Build & Solve produced a result");
    assert(await page.locator("#production-viz svg").count() === 1, "Production planning renders its model geometry");
    const productionObjective = await page.locator("#build-obj-val").textContent();
    await editLiveInput(page, "#production-chair-profit", 90, "production");
    assert(await page.locator("#build-obj-val").textContent() !== productionObjective, "Editing production prose changes the optimal objective");

    await visitExample(page, "#example-diet");
    await page.waitForFunction(() => document.querySelector("#diet-viz svg"));
    assert(await page.locator("#diet-viz svg").count() === 1, "Diet example renders nutrient coverage from its solve");
    await editLiveInput(page, "#diet-calories", 2500, "diet");
    assert((await page.locator("#diet-viz svg").textContent()).includes("2500"), "Diet requirement edits update the nutrient targets");
    await visitExample(page, "#example-transport");
    await page.waitForFunction(() => document.querySelector("#transport-viz svg"));
    assert(await page.locator("#transport-viz svg").count() === 1, "Transportation example renders solved network flows");
    const transportTitle = (await page.locator("#transport-viz title").allTextContents()).join("|");
    await editLiveInput(page, "#transport-demand-1", 50, "transport");
    assert((await page.locator("#transport-viz title").allTextContents()).join("|") !== transportTitle, "Editing transportation demand repaints solved route flows");
    const sparseOverflow = await page.locator("#build-matrix-explorer").evaluate((element) => element.scrollWidth > element.clientWidth);
    assert(!sparseOverflow, "Sparse explorer arrays do not overflow their panel");

    // ── Test 3: MIP ──
    console.log("\n─ Examples: MIP ──");
    await visitExample(page, "#example-knapsack");
    await waitForOutput(page, "#mip-output");
    await checkOutputNotError(page, "mip-output", "MIP solve");
    await checkNoExtendedApiError(page, "MIP solve");
    const mipText = await page.evaluate(() => document.getElementById("mip-output").textContent);
    assert(/Status|Objective|Selected/i.test(mipText), "MIP solve produced a result");
    assert(await page.locator("#mip-visual-grid svg").count() === 1, "Knapsack renders the selected-item decision view");
    await editLiveInput(page, "#mip-capacity", 1, "knapsack");
    assert((await page.locator("#mip-output").textContent()).includes("Objective: 8"), "Knapsack prose edit immediately chooses the one-kilogram bottle");
    const knapsackRevision = Number(await page.locator("#knapsack-state").getAttribute("data-revision"));
    await page.fill("#mip-capacity", "");
    await page.waitForFunction((revision) => {
      const state = document.getElementById("knapsack-state");
      return Number(state?.dataset.revision) > revision && state?.dataset.state === "error";
    }, knapsackRevision);
    assert(!(await page.locator("#knapsack-state").textContent()).includes("Updating"), "Invalid live input ends in a visible error instead of an endless solving state");
    await editLiveInput(page, "#mip-capacity", 9, "knapsack");
    await visitExample(page, "#example-facility");
    await page.waitForFunction(() => document.querySelector("#facility-viz svg"));
    assert(await page.locator("#facility-viz svg").count() === 1, "Facility location renders assignments and capacity use");
    const facilityHeading = await page.locator("#facility-viz .viz-title").first().textContent();
    await editLiveInput(page, "#facility-fixed-b", 2000, "facility");
    assert(await page.locator("#facility-viz .viz-title").first().textContent() !== facilityHeading, "Facility opening costs update the solved assignment plan");

    // ── Test 4: QP ──
    console.log("\n─ Example: QP ─");
    await visitExample(page, "#panel-qp");
    const qpMath = await page.locator("#qp-matrix-explorer .formula-list").textContent();
    assert(qpMath.includes("minimize") && qpMath.includes("subject to"), "Hessian explorer shows the optimization objective and constraints");
    assert(!qpMath.includes("Q row"), "Hessian explorer does not restate matrix rows as mathematics");
    await editLiveInput(page, "#qp-target-return", 9, "qp");
    assert((await page.locator("#qp-matrix-explorer .formula-list").textContent()).includes("≥ 0.09"), "Hessian explorer tracks the target-return constraint");
    await page.locator('#qp-matrix-explorer .formula-term[data-entry-index="1"]').hover();
    const hessianNarration = await page.locator("#qp-matrix-explorer .sparse-narration").textContent();
    assert(hessianNarration.includes("→ Q[") && hessianNarration.includes("½xᵀQx"), "Hessian narration connects objective terms to Q and triangular storage");
    await page.mouse.move(0, 0);
    for (let i = 0; i < 4 && await page.locator("#qp-matrix-explorer .matrix-table td.mirror").count() === 0; i++) {
      await page.click('#qp-matrix-explorer [data-action="next"]');
    }
    assert(await page.locator("#qp-matrix-explorer .matrix-table td.mirror").count() === 1, "Hessian explorer shows the symmetric value omitted from triangular storage");
    await waitForOutput(page, "#qp-output");
    await checkOutputNotError(page, "qp-output", "QP solve");
    const qpText = await page.evaluate(() => document.getElementById("qp-output").textContent);
    assert(/Optimal Asset Weights/i.test(qpText), "QP solve produced portfolio weights");
    assert(await page.locator("#qp-allocation-track svg").count() === 1, "Portfolio example renders risk and allocation geometry");

    // ── Test 5: Ranging ──
    console.log("\n─ Example: Ranging ─");
    await visitExample(page, "#panel-ranging");
    await waitForOutput(page, "#ranging-output");
    await checkOutputNotError(page, "ranging-output", "Ranging");
    await checkNoExtendedApiError(page, "Ranging");
    assert(await page.locator("#ranging-visual-bars svg").count() === 1, "Ranging renders feasible geometry and sensitivity intervals");
    assert((await page.locator("#ranging-visual-bars svg").textContent()).includes("objective 3x + 2y"), "Ranging visualization uses x and y names");

    // ── Test 6: Options ──
    console.log("\n─ Example: Options ─");
    await visitExample(page, "#panel-options");
    await page.waitForFunction(() => {
      const body = document.getElementById("opts-body");
      return body && body.children.length > 10;
    }, { timeout: 15000 });
    const optCount = await page.evaluate(() => document.getElementById("opts-body").children.length);
    assert(optCount > 50, `Options table loaded (${optCount} options)`);
    await checkNoExtendedApiError(page, "Options");
    assert(await page.locator("#options-viz").count() === 0, "Options use the useful searchable table without a decorative graph");

    // ── Test 7: IIS ──
    console.log("\n─ Example: IIS ─");
    await visitExample(page, "#panel-iis");
    await waitForOutput(page, "#iis-output");
    await checkOutputNotError(page, "iis-output", "IIS");
    await checkNoExtendedApiError(page, "IIS");
    assert(await page.locator("#iis-visual-tags svg, #iis-visual-tags .conflict-node").count() > 0, "IIS renders the conflict returned by HiGHS");
    assert((await page.locator("#iis-visual-tags").textContent()).includes("x ≥ 10"), "IIS visualization uses parsed variable names and bounds");
    await editLiveInput(page, "#iis-lp", `Minimize\n obj: x + y\nSubject To\n limit: x + y <= 7\nBounds\n 12 <= x\n 12 <= y\nEnd`, "iis");
    const editedIis = await page.locator("#iis-visual-tags").textContent();
    assert(editedIis.includes("x + y ≤ 7") && editedIis.includes("left side = 24"), "IIS geometry and explanation follow edited coefficients and bounds");
    const iisScreenshot = join(ROOT, "build", "demo-iis.png");
    await page.screenshot({ path: iisScreenshot, fullPage: true });
    console.log(`  screenshot: ${iisScreenshot}`);

    // ── Test 8: Model I/O ──
    console.log("\n─ Example: Model I/O ─");
    await visitExample(page, "#panel-io");
    assert(await page.locator("#io-viz svg").count() === 1, "Model I/O renders a structural matrix fingerprint");
    assert((await page.locator("#io-viz svg").textContent()).includes("x") && (await page.locator("#io-viz svg").textContent()).includes("y"), "Model I/O recognizes arbitrary x/y variable names");
    await page.click("#io-load");
    await waitForOutput(page, "#io-output");
    await checkOutputNotError(page, "io-output", "Model I/O load");
    await checkNoExtendedApiError(page, "Model I/O");
    // Also test the solve button.
    await page.click("#io-solve");
    await waitForOutput(page, "#io-output");
    await checkOutputNotError(page, "io-output", "Model I/O solve");

    // ── Optional syntax highlighting ──
    console.log("\n─ Prism fallback ─");
    const fallbackPage = await browser.newPage();
    const fallbackErrors = [];
    fallbackPage.on("pageerror", (error) => fallbackErrors.push(String(error)));
    await fallbackPage.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
    await fallbackPage.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });
    await waitForOutput(fallbackPage, "#lp-output", { timeout: 30000 });
    assert(fallbackErrors.length === 0, "Demo remains functional when Prism is unavailable");
    assert(await fallbackPage.locator(".code-editor-box .token").count() === 0, "Prism fallback renders unhighlighted code without failing");
    await fallbackPage.close();

    // ── Responsive layout ──
    console.log("\n─ Mobile layout ─");
    await page.setViewportSize({ width: 390, height: 844 });
    await visitExample(page, "#panel-qp");
    assert(await page.locator('#tabs a[href="#panel-qp"]').getAttribute("aria-current") === "location", "Mobile scrolling keeps navigation synchronized");
    const hasPageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    assert(!hasPageOverflow, "Mobile layout has no page-level horizontal overflow");
    const mobileScreenshot = join(ROOT, "build", "demo-mobile.png");
    await page.screenshot({ path: mobileScreenshot, fullPage: true });
    console.log(`  screenshot: ${mobileScreenshot}`);

    // ── Console errors ──
    console.log("\n─ Console errors ─");
    assert(failedLocalResponses.length === 0, `All local demo assets load successfully${failedLocalResponses.length ? ` (${failedLocalResponses.join(", ")})` : ""}`);
    if (consoleErrors.length > 0) {
      console.error(`  FAIL: ${consoleErrors.length} console errors detected:`);
      for (const e of consoleErrors.slice(0, 10)) console.error(`    ${e}`);
      failures += consoleErrors.length;
    } else {
      console.log("  ok:  no console errors");
    }

    // ── Final screenshot for debugging ──
    const screenshotPath = join(ROOT, "build", "demo-screenshot.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\nScreenshot saved to ${screenshotPath}`);
  } catch (error) {
    if (consoleErrors.length) {
      console.error("\nBrowser errors before the test aborted:");
      for (const message of consoleErrors) console.error(`  ${message}`);
    }
    throw error;
  } finally {
    await browser.close();
    server.close();
  }

  console.log("");
  if (failures > 0) {
    console.error(`✗ ${failures} test(s) failed.`);
    process.exit(1);
  } else {
    console.log("✓ All demo tests passed.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
