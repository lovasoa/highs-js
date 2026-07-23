#!/usr/bin/env node
/**
 * Headless-browser smoke test for the highs-js demo page.
 *
 * Serves the demo/ directory over HTTP, loads it in Chromium via Playwright,
 * and verifies that:
 *
 *  1. HiGHS loads successfully (the initial legacy LP solve completes).
 *  2. Every extended-API tab works — no "This build does not include the
 *     extended API" error ever appears.
 *
 * The demo directory must contain fresh build artifacts (highs.js, highs.wasm)
 * before running.  In CI these are copied from build/; locally you can run:
 *
 *   cp build/highs.* demo/
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

for (const f of ["highs.js", "highs.wasm", "worker.js", "index.html", "demo.js"]) {
  if (!existsSync(join(DEMO_DIR, f))) {
    console.error(`Missing ${f} in demo/. Run "cp build/highs.* demo/" first.`);
    process.exit(1);
  }
}

/* ── static file server ── */

function createStaticServer(root) {
  return createServer(async (req, res) => {
    try {
      let urlPath = decodeURIComponent(req.url.split("?")[0]);
      if (urlPath === "/") urlPath = "/index.html";
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

async function checkOutputNotError(page, outputId, label) {
  const isError = await page.evaluate((id) => {
    const el = document.getElementById(id);
    return el ? el.classList.contains("error") : true;
  }, outputId);
  assert(!isError, `${label}: output has no error class`);
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
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  try {
    console.log("\n─ Loading demo page ─");
    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });

    // ── Test 1: Legacy LP solve (runs automatically on page load) ──
    console.log("\n─ Tab: LP Format (legacy API) ─");
    await waitForOutput(page, "#lp-output", { timeout: 30000 });
    await checkOutputNotError(page, "lp-output", "LP solve");
    await checkNoExtendedApiError(page, "LP solve");
    const lpText = await page.evaluate(() => document.getElementById("lp-output").textContent);
    assert(lpText.length > 10, "LP solve produced output");
    assert(/Status|Optimal|Objective/i.test(lpText), "LP solve output looks like a result");
    assert(await page.locator(".code-editor-box .token").count() > 5, "JavaScript examples have syntax highlighting");
    assert(await page.locator("#panel-lp .syntax-editor .token").count() > 5, "LP editor has syntax highlighting");
    assert(await page.locator("#lp-output .token").count() > 5, "JSON output has syntax highlighting");
    const desktopScreenshot = join(ROOT, "build", "demo-desktop.png");
    await page.screenshot({ path: desktopScreenshot, fullPage: true });
    console.log(`  screenshot: ${desktopScreenshot}`);

    // ── Test 2: Build & Solve (extended API) ──
    console.log("\n─ Tab: Build & Solve (extended API) ─");
    assert(await page.locator("#build-example, #mip-example").count() === 0, "Nested examples use the shared tree instead of panel dropdowns");
    await page.click('[data-tab="build"][data-example="production"]');
    await page.waitForTimeout(200);
    assert(await page.locator("#build-matrix-explorer .sparse-stage").count() === 3, "Constraint explorer links formulas, matrix, and CSC arrays");
    assert(await page.locator("#build-matrix-explorer .matrix-axis-index").first().textContent() === "0", "Dense matrix axes use the same zero-based indexing as CSC");
    await page.locator('#build-matrix-explorer .formula-term[data-entry-index="1"]').first().hover();
    assert(await page.locator("#build-matrix-explorer .matrix-table td.active").count() === 1, "Hovering a formula term highlights its matrix cell");
    assert(await page.locator("#build-matrix-explorer [data-array='values'].active").count() === 1, "Hovering a formula term highlights its stored value");
    const hoveredNarration = await page.locator("#build-matrix-explorer .sparse-narration").textContent();
    await page.waitForTimeout(1700);
    assert(await page.locator("#build-matrix-explorer .sparse-narration").textContent() === hoveredNarration, "Sparse animation pauses while the explorer is hovered");
    await page.mouse.move(0, 0);
    await page.click('#build-matrix-explorer [data-action="next"]');
    assert((await page.locator("#build-matrix-explorer .sparse-narration").textContent()).includes("starts["), "Constraint explorer explains starts, indices, and values");
    await page.click("#build-solve");
    await waitForOutput(page, "#build-output");
    await checkOutputNotError(page, "build-output", "Build & Solve");
    await checkNoExtendedApiError(page, "Build & Solve");
    const buildText = await page.evaluate(() => document.getElementById("build-output").textContent);
    assert(/Status|Objective/i.test(buildText), "Build & Solve produced a result");

    await page.click("#build-add-var");
    assert(await page.locator(".build-cost").count() === 5, "Add Variable persists a fifth variable in the editor");
    await page.click("#build-solve");
    await page.waitForFunction(() => document.getElementById("build-output")?.textContent.includes("x4 ="));
    assert(true, "Added variable is included in the solved model");

    await page.click('[data-tab="build"][data-example="transport"]');
    assert((await page.locator("#build-matrix-explorer .sparse-explorer-header strong").textContent()).includes("Transportation"), "Constraint explorer follows nested example selection");
    const sparseOverflow = await page.locator("#build-matrix-explorer").evaluate((element) => element.scrollWidth > element.clientWidth);
    assert(!sparseOverflow, "Sparse explorer arrays do not overflow their panel");
    await page.click("#build-solve");
    await page.waitForFunction(() => /optimal/i.test(document.getElementById("build-status")?.textContent || ""));
    assert(true, "Transportation example is feasible and solves to optimality");

    // ── Test 3: MIP ──
    console.log("\n─ Tab: MIP ──");
    await page.click('[data-tab="mip"][data-example="knapsack"]');
    await page.waitForTimeout(200);
    await page.click("#mip-solve");
    await waitForOutput(page, "#mip-output");
    await checkOutputNotError(page, "mip-output", "MIP solve");
    await checkNoExtendedApiError(page, "MIP solve");
    const mipText = await page.evaluate(() => document.getElementById("mip-output").textContent);
    assert(/Status|Objective|Selected/i.test(mipText), "MIP solve produced a result");

    // ── Test 4: QP ──
    console.log("\n─ Tab: QP ─");
    await page.click('[data-tab="qp"]');
    for (let i = 0; i < 4 && await page.locator("#qp-matrix-explorer .matrix-table td.mirror").count() === 0; i++) {
      await page.click('#qp-matrix-explorer [data-action="next"]');
    }
    assert(await page.locator("#qp-matrix-explorer .matrix-table td.mirror").count() === 1, "Hessian explorer shows the symmetric value omitted from triangular storage");
    await page.click("#qp-solve");
    await waitForOutput(page, "#qp-output");
    await checkOutputNotError(page, "qp-output", "QP solve");
    const qpText = await page.evaluate(() => document.getElementById("qp-output").textContent);
    assert(/Optimal Asset Weights/i.test(qpText), "QP solve produced portfolio weights");

    // ── Test 5: Ranging ──
    console.log("\n─ Tab: Ranging ─");
    await page.click('[data-tab="ranging"]');
    await page.waitForTimeout(200);
    await page.click("#ranging-solve");
    await waitForOutput(page, "#ranging-output");
    await checkOutputNotError(page, "ranging-output", "Ranging");
    await checkNoExtendedApiError(page, "Ranging");

    // ── Test 6: Options ──
    console.log("\n─ Tab: Options ─");
    await page.click('[data-tab="options"]');
    // Options load lazily when the tab is first opened.
    await page.waitForFunction(() => {
      const body = document.getElementById("opts-body");
      return body && body.children.length > 10;
    }, { timeout: 15000 });
    const optCount = await page.evaluate(() => document.getElementById("opts-body").children.length);
    assert(optCount > 50, `Options table loaded (${optCount} options)`);
    await checkNoExtendedApiError(page, "Options");

    // ── Test 7: IIS ──
    console.log("\n─ Tab: IIS ─");
    await page.click('[data-tab="iis"]');
    await page.waitForTimeout(200);
    assert(await page.locator("#iis-visual-tags .iis-empty-state").count() === 1, "IIS starts with a neutral unresolved state");
    assert(await page.locator("#iis-visual-tags .conflict-node").count() === 0, "IIS does not show conflicts before analysis");
    await page.click("#iis-solve");
    await waitForOutput(page, "#iis-output");
    await checkOutputNotError(page, "iis-output", "IIS");
    await checkNoExtendedApiError(page, "IIS");
    assert(await page.locator("#iis-visual-tags .conflict-node").count() > 0, "IIS renders the conflict returned by HiGHS");
    const iisScreenshot = join(ROOT, "build", "demo-iis.png");
    await page.screenshot({ path: iisScreenshot, fullPage: true });
    console.log(`  screenshot: ${iisScreenshot}`);

    // ── Test 8: Model I/O ──
    console.log("\n─ Tab: Model I/O ─");
    await page.click('[data-tab="io"]');
    await page.waitForTimeout(200);
    await page.click("#io-load");
    await waitForOutput(page, "#io-output");
    await checkOutputNotError(page, "io-output", "Model I/O load");
    await checkNoExtendedApiError(page, "Model I/O");
    // Also test the solve button.
    await page.click("#io-solve");
    await waitForOutput(page, "#io-output");
    await checkOutputNotError(page, "io-output", "Model I/O solve");

    // ── Responsive layout ──
    console.log("\n─ Mobile layout ─");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click('[data-tab="qp"]');
    await page.waitForTimeout(300);
    const hasPageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    assert(!hasPageOverflow, "Mobile layout has no page-level horizontal overflow");
    const mobileScreenshot = join(ROOT, "build", "demo-mobile.png");
    await page.screenshot({ path: mobileScreenshot, fullPage: true });
    console.log(`  screenshot: ${mobileScreenshot}`);

    // ── Console errors ──
    console.log("\n─ Console errors ─");
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
